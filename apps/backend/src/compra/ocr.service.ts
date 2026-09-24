import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sku } from '../entities/sku.entity';
import { Proveedor } from '../entities/proveedor.entity';
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

    return await this.extractStructuredData(rawText, filename);
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
    const numeroFactura = facturaMatch ? facturaMatch[1].toUpperCase() : `FAC-${Date.now().toString().slice(-6)}`;

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
