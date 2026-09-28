import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

export interface DeepSeekChatOptions {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'text' | 'json_object' };
  tools?: ChatCompletionTool[];
  tool_choice?: 'auto' | 'none' | 'required';
}

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private openai: OpenAI | null = null;
  private readonly defaultModel: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const rawApiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const apiKey = rawApiKey ? rawApiKey.trim() : '';
    const baseURL =
      (this.configService.get<string>('DEEPSEEK_BASE_URL') || '').trim() ||
      'https://api.deepseek.com';
    this.defaultModel =
      (this.configService.get<string>('DEEPSEEK_MODEL') || '').trim() ||
      'deepseek-chat';


    if (
      apiKey &&
      apiKey !== 'sk-placeholder-deepseek-key' &&
      !apiKey.startsWith('sk-prod-deepseek')
    ) {
      this.openai = new OpenAI({
        apiKey,
        baseURL,
        timeout: 45000,
        maxRetries: 3,
      });
      this.isConfigured = true;
      this.logger.log(`DeepSeek API inicializada correctamente con modelo ${this.defaultModel}`);
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'DeepSeek API no configurada con key válida. Operando en modo asistido heurístico.',
      );
    }
  }

  public isReady(): boolean {
    return this.isConfigured && this.openai !== null;
  }

  /**
   * Ejecuta una llamada de completado con soporte para herramientas o formato JSON
   */
  async chatCompletion(options: DeepSeekChatOptions) {
    if (!this.isReady()) {
      return null;
    }

    try {
      const response = await this.openai!.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 1500,
        response_format: options.response_format,
        tools: options.tools,
        tool_choice: options.tool_choice,
      });

      return response.choices[0]?.message;
    } catch (error: any) {
      this.logger.error(`Error en DeepSeek chatCompletion: ${error?.message || error}`);
      return null;
    }
  }

  /**
   * Extracción estructurada JSON estricta (usada en OCR de facturas y parsers)
   */
  async extractStructuredJson<T = any>(
    systemPrompt: string,
    userInput: string,
    schemaDescription?: string,
  ): Promise<T | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const prompt = schemaDescription
        ? `${userInput}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido según el siguiente formato:\n${schemaDescription}`
        : userInput;

      const completion = await this.openai!.chat.completions.create({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      return JSON.parse(content) as T;
    } catch (error: any) {
      this.logger.error(
        `Error al parsear JSON estructurado con DeepSeek: ${error?.message || error}`,
      );
      return null;
    }
  }

  /**
   * Análisis inteligente y sugerencia de precios para autopartes
   */
  async sugerirPrecio(
    skuData: {
      id: string;
      sku_interno: string;
      nombre: string;
      marca: string;
      costo_promedio: number;
      precio_base: number;
      stock_actual: number;
      descripcion?: string | null;
    },
    margenObjetivoPct?: number,
    notasAdicionales?: string,
  ): Promise<{
    sku_id: string;
    sku_interno: string;
    nombre: string;
    costo_promedio: number;
    precio_actual: number;
    precio_sugerido: number;
    margen_estimado_pct: number;
    margen_ganancia_unidad: number;
    razonamiento: string;
    factores: string[];
    confianza: 'alta' | 'media' | 'estimada';
  }> {
    const costo = Number(skuData.costo_promedio) || 0;
    const precioActual = Number(skuData.precio_base) || 0;
    const targetMargin = margenObjetivoPct && margenObjetivoPct > 0 ? margenObjetivoPct : 35;

    // Intentar con DeepSeek si está activo
    if (this.isReady()) {
      try {
        const { PRICING_ANALYSIS_SYSTEM_PROMPT } = await import(
          './prompts/pricing-analysis.prompt'
        );

        const promptInput = `
Por favor analiza este repuesto automotriz y calcula el precio de venta sugerido:
- SKU Interno: ${skuData.sku_interno}
- Descripción: ${skuData.nombre}
- Marca: ${skuData.marca}
- Costo Promedio Unitario: $${costo.toFixed(2)}
- Precio Base Actual: $${precioActual.toFixed(2)}
- Stock Actual: ${skuData.stock_actual} unidades
- Margen Bruto Objetivo: ${targetMargin}%
${notasAdicionales ? `- Notas del vendedor: ${notasAdicionales}` : ''}
        `.trim();

        const llmResult = await this.extractStructuredJson<{
          precio_sugerido: number;
          margen_estimado_pct: number;
          margen_ganancia_unidad: number;
          razonamiento: string;
          factores: string[];
          confianza: 'alta' | 'media' | 'estimada';
        }>(PRICING_ANALYSIS_SYSTEM_PROMPT, promptInput);

        if (llmResult && llmResult.precio_sugerido > 0) {
          return {
            sku_id: skuData.id,
            sku_interno: skuData.sku_interno,
            nombre: skuData.nombre,
            costo_promedio: costo,
            precio_actual: precioActual,
            precio_sugerido: Number(llmResult.precio_sugerido),
            margen_estimado_pct: Number(llmResult.margen_estimado_pct),
            margen_ganancia_unidad: Number(llmResult.margen_ganancia_unidad),
            razonamiento: llmResult.razonamiento,
            factores: llmResult.factores || [],
            confianza: llmResult.confianza || 'alta',
          };
        }
      } catch (err: any) {
        this.logger.warn(
          `Fallback a cálculo heurístico de precio para SKU ${skuData.sku_interno}: ${err?.message}`,
        );
      }
    }

    // Heurística asistida para autopartes cuando no hay API o como fallback
    let suggestedPrice = 0;
    let marginPct = targetMargin;

    if (costo > 0) {
      // Fórmula clásica de margen sobre venta: Costo / (1 - Margen)
      const rawPrice = costo / (1 - targetMargin / 100);
      // Redondeo psicológico de repuestos: si > 50 redondea a entero, si < 50 a .00 o .50
      suggestedPrice =
        rawPrice > 50
          ? Math.ceil(rawPrice)
          : Math.round(rawPrice * 2) / 2;
      marginPct = ((suggestedPrice - costo) / suggestedPrice) * 100;
    } else if (precioActual > 0) {
      suggestedPrice = precioActual;
      marginPct = targetMargin;
    } else {
      suggestedPrice = 10;
      marginPct = 30;
    }

    const profitUnit = Math.max(0, suggestedPrice - costo);

    return {
      sku_id: skuData.id,
      sku_interno: skuData.sku_interno,
      nombre: skuData.nombre,
      costo_promedio: costo,
      precio_actual: precioActual,
      precio_sugerido: Math.round(suggestedPrice * 100) / 100,
      margen_estimado_pct: Math.round(marginPct * 10) / 10,
      margen_ganancia_unidad: Math.round(profitUnit * 100) / 100,
      razonamiento: `Precio optimizado sobre un margen objetivo de ${targetMargin}%. Para la marca ${skuData.marca} y un costo unitario de $${costo.toFixed(2)}, se fija en $${suggestedPrice.toFixed(2)} garantizando una ganancia bruta de $${profitUnit.toFixed(2)} por unidad.`,
      factores: [
        `Margen comercial sobre costo: ${targetMargin}%`,
        `Prestigio y demanda de marca: ${skuData.marca}`,
        costo > 0
          ? `Costo promedio de adquisición verificado: $${costo.toFixed(2)}`
          : 'Estimación basada en precio base (sin costo histórico)',
        'Ajuste psicológico de retail automotriz',
      ],
      confianza: costo > 0 ? 'media' : 'estimada',
    };
  }
}

