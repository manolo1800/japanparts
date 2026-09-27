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
}
