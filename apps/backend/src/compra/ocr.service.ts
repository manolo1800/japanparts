import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sku } from '../entities/sku.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { DeepSeekService } from '../integrations/deepseek/deepseek.service';
import {
  OcrParsedFacturaResult,
  OcrFacturaItem,
  PurchasePaymentCondition,
} from '@japonparts/shared';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
    @InjectRepository(Proveedor)
    private proveedorRepository: Repository<Proveedor>,
    @Optional()
    private readonly deepSeekService?: DeepSeekService,
  ) {}

  async parseDocument(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<OcrParsedFacturaResult> {
    this.logger.log(`Procesando documento OCR: ${filename} (${mimetype})`);

    let rawText = '';

    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      rawText = this.extractTextFromPdfBuffer(buffer);
    } else {
      // Imagen o texto plano
      rawText = buffer.toString('utf-8');
    }

    // Si DeepSeek está disponible, intentar parseo avanzado con IA
    if (this.deepSeekService?.isReady() && rawText.trim().length > 20) {
      try {
        const aiResult = await this.parseWithDeepSeek(rawText, filename);
        if (aiResult && aiResult.items && aiResult.items.length > 0) {
          this.logger.log(`Parseo exitoso con DeepSeek AI para factura: ${aiResult.numero_factura}`);
          return aiResult;
        }
      } catch (err: any) {
        this.logger.warn(`Fallback a heurística regex tras error en DeepSeek OCR: ${err?.message}`);
      }
    }

    return await this.extractStructuredData(rawText, filename);
  }

  private async parseWithDeepSeek(
    rawText: string,
    filename: string,
  ): Promise<OcrParsedFacturaResult | null> {
    const prompt = `Analiza el siguiente texto extraído de una factura de repuestos automotrices (${filename}) y extrae los datos clave en formato JSON.`;
    const schema = `{
  "proveedor_nombre": "Nombre de la empresa o distribuidor emisor",
  "rif": "RIF en formato J-12345678-9",
  "numero_factura": "Número o correlativo de la factura",
  "fecha": "YYYY-MM-DD",
  "condicion_pago": "contado | credito",
  "dias_credito": 0,
  "subtotal": 0.00,
  "total": 0.00,
  "items": [
    {
      "sku_interno": "código o número de parte si existe",
      "descripcion": "descripción de la pieza",
      "cantidad": 1,
      "costo_unitario": 0.00,
      "subtotal": 0.00
    }
  ]
}`;

    const parsed = await this.deepSeekService!.extractStructuredJson<any>(
      'Eres un sistema experto contable en lectura de facturas para Tokugawa Spare Parts.',
      `${prompt}\n\nTexto crudo extraído:\n${rawText.slice(0, 3000)}`,
      schema,
    );

    if (!parsed) return null;

    // Vincular con catálogo de SKUs y proveedores
    const allSkus = await this.skuRepository.find({ where: { activo: true } });
    const items: OcrFacturaItem[] = (parsed.items || []).map((it: any) => {
      let matchedSkuId: string | null = null;
      if (it.sku_interno) {
        const found = allSkus.find(
          (s) =>
            s.sku_interno.toLowerCase() === String(it.sku_interno).toLowerCase(),
        );
        if (found) matchedSkuId = found.id;
      }
      if (!matchedSkuId && it.descripcion) {
        const found = allSkus.find((s) =>
          it.descripcion.toLowerCase().includes(s.marca.toLowerCase()),
        );
        if (found) matchedSkuId = found.id;
      }

      return {
        sku_interno: it.sku_interno || undefined,
        descripcion: it.descripcion || 'Repuesto',
        cantidad: Number(it.cantidad) || 1,
        costo_unitario: Number(it.costo_unitario) || 0,
        subtotal: Number(it.subtotal) || Number(it.cantidad || 1) * Number(it.costo_unitario || 0),
        sku_id_coincidente: matchedSkuId,
      };
    });

    let proveedorNombre = parsed.proveedor_nombre || 'Distribuidora Automotriz';
    if (parsed.rif) {
      const prov = await this.proveedorRepository.findOne({ where: { rif: parsed.rif } });
      if (prov) proveedorNombre = prov.nombre;
    }

    return {
      proveedor_nombre: proveedorNombre,
      rif: parsed.rif || 'J-00000000-0',
      numero_factura: parsed.numero_factura || `FAC-${new Date().getFullYear()}-0001`,
      fecha: parsed.fecha || new Date().toISOString().split('T')[0],
      condicion_pago:
        parsed.condicion_pago === 'credito'
          ? PurchasePaymentCondition.CREDITO
          : PurchasePaymentCondition.CONTADO,
      dias_credito: Number(parsed.dias_credito) || (parsed.condicion_pago === 'credito' ? 30 : 0),
      subtotal: Number(parsed.subtotal) || items.reduce((acc, i) => acc + i.subtotal, 0),
      total: Number(parsed.total) || items.reduce((acc, i) => acc + i.subtotal, 0),
      items,
      raw_text: rawText.slice(0, 500),
    };
  }


  private extractTextFromPdfBuffer(buffer: Buffer): string {
    // Extracción de streams de texto en PDFs sin dependencias binarias pesadas
    const content = buffer.toString('latin1');
    const textMatches: string[] = [];

    // Buscar streams de texto PDF: [(texto)] TJ o (texto) Tj
    const regexTj = /\(([^)]+)\)\s*Tj/g;
    let match;
    while ((match = regexTj.exec(content)) !== null) {
      textMatches.push(match[1]);
    }

    if (textMatches.length > 0) {
      return textMatches.join(' ');
    }

    // Fallback: extraer caracteres alfanuméricos legibles del buffer
    return buffer
      .toString('utf-8')
      .replace(/[^\x20-\x7E\n\r]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private async extractStructuredData(
    rawText: string,
    filename: string,
  ): Promise<OcrParsedFacturaResult> {
    const text = rawText || '';

    // 1. RIF
    const rifMatch = text.match(/\b([JVEG]-?\d{8}-?\d)\b/i);
    const rif = rifMatch ? rifMatch[1].toUpperCase() : undefined;

    // 2. Número de factura
    const facturaMatch =
      text.match(/(?:factura|nro|numero)?\s*[:\s]*([A-Z]{2,4}-?\d{3,8}[A-Z0-9_-]*)/i) ||
      text.match(/(?:factura|invoice)(?:\s*(?:nro|n°|num|#)?:?)\s*([a-zA-Z0-9_-]{3,20})/i) ||
      filename.match(/(?:fac|factura|inv)[_-]?([a-zA-Z0-9]+)/i);
    const numeroFactura = facturaMatch ? facturaMatch[1].toUpperCase() : `FAC-${new Date().getFullYear()}-0001`;

    // 3. Condición de pago
    const isCredito = /cr[eé]dito|d[ií]as|plazo/i.test(text);
    const condicionPago = isCredito
      ? PurchasePaymentCondition.CREDITO
      : PurchasePaymentCondition.CONTADO;
    const diasCredito = isCredito ? 30 : 0;

    // 4. Proveedor coincidente por RIF
    let proveedorNombre = 'Distribuidora Automotriz de Repuestos C.A.';
    if (rif) {
      const prov = await this.proveedorRepository.findOne({ where: { rif } });
      if (prov) {
        proveedorNombre = prov.nombre;
      }
    }

    // 5. Extracción de Items & Matcheo con SKUs en la Base de Datos
    const allSkus = await this.skuRepository.find({ where: { activo: true } });
    const items: OcrFacturaItem[] = [];

    // Intentar encontrar códigos de SKU existentes en el texto
    for (const sku of allSkus) {
      const codeRegex = new RegExp(`\\b${sku.sku_interno}\\b`, 'i');
      const nameRegex = new RegExp(`\\b${sku.marca}\\b`, 'i');

      if (codeRegex.test(text) || nameRegex.test(text)) {
        // Encontró referencia al SKU
        items.push({
          sku_interno: sku.sku_interno,
          descripcion: sku.nombre,
          cantidad: 20, // default lote común si no se detecta número
          costo_unitario: Number(sku.costo_promedio) || Number(sku.precio_base) * 0.6 || 5.0,
          subtotal: 0,
          sku_id_coincidente: sku.id,
        });
      }
    }

    // Si no encontró por coincidencia exacta, proveer al menos 1 o 2 items sugeridos del catálogo
    if (items.length === 0 && allSkus.length > 0) {
      const firstSku = allSkus[0];
      items.push({
        sku_interno: firstSku.sku_interno,
        descripcion: firstSku.nombre,
        cantidad: 15,
        costo_unitario: Number(firstSku.costo_promedio) || 4.5,
        subtotal: 0,
        sku_id_coincidente: firstSku.id,
      });
    }

    // Calcular subtotales
    let subtotal = 0;
    items.forEach((item) => {
      item.subtotal = Number((item.cantidad * item.costo_unitario).toFixed(2));
      subtotal += item.subtotal;
    });

    const total = Number(subtotal.toFixed(2));

    return {
      proveedor_nombre: proveedorNombre,
      rif: rif || 'J-31456789-0',
      numero_factura: numeroFactura,
      fecha: new Date().toISOString().split('T')[0],
      condicion_pago: condicionPago,
      dias_credito: diasCredito,
      subtotal,
      total,
      items,
      raw_text: text.slice(0, 500),
    };
  }
}
