import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { StorageService } from '../storage/storage.service';
import { DocumentType } from '@japonparts/shared';
import { Orden } from '../entities/orden.entity';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(private readonly storageService: StorageService) {}

  async generateDocumentoPdf(
    orden: Orden,
    tipo: DocumentType,
    numeroDocumento: string,
  ): Promise<{ buffer: Buffer; url: string; filename: string }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 40,
          info: {
            Title: `${tipo.toUpperCase()} ${numeroDocumento} - Japón Parts`,
            Author: 'ERP Japón Parts',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', async () => {
          const pdfBuffer = Buffer.concat(chunks);
          const filename = `${tipo}_${numeroDocumento}.pdf`;
          try {
            const uploadResult = await this.storageService.uploadFile(
              pdfBuffer,
              filename,
              'application/pdf',
            );
            resolve({
              buffer: pdfBuffer,
              url: uploadResult.url,
              filename: uploadResult.filename,
            });
          } catch (uploadError) {
            this.logger.error(`Error uploading PDF to storage: ${uploadError.message}`);
            resolve({
              buffer: pdfBuffer,
              url: `/storage/facturas/${filename}`,
              filename,
            });
          }
        });
        doc.on('error', (err) => reject(err));

        this.renderPdfContent(doc, orden, tipo, numeroDocumento);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private renderPdfContent(
    doc: PDFKit.PDFDocument,
    orden: Orden,
    tipo: DocumentType,
    numeroDocumento: string,
  ) {
    const isFactura = tipo === DocumentType.FACTURA;
    const primaryColor = isFactura ? '#e11d48' : '#0284c7'; // Rose for invoice, Sky for receipt
    const titleText = isFactura ? 'FACTURA DE VENTA' : 'RECIBO DE ENTREGA';

    // 1. Header Banner
    doc
      .rect(40, 40, 532, 70)
      .fillOpacity(0.06)
      .fill(primaryColor)
      .fillOpacity(1);

    // Brand logo text
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('JAPÓN', 55, 52, { continued: true })
      .fillColor('#0f172a')
      .text('PARTS', { continued: false });

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#475569')
      .text('REPUESTOS Y ACCESORIOS AUTOMOTRICES JAPONESES', 55, 77)
      .text('RIF: J-40892182-0 | Av. Principal Los Ruices, Galpón 4, Caracas', 55, 89);

    // Document identifier box (right side of header)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(titleText, 350, 52, { align: 'right', width: 205 });

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`N° ${numeroDocumento}`, 350, 70, { align: 'right', width: 205 });

    const fechaFormateada = new Date(orden.fecha || orden.created_at).toLocaleString('es-VE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Fecha: ${fechaFormateada}`, 350, 86, { align: 'right', width: 205 })
      .text(`Orden: ${orden.numero_orden}`, 350, 97, { align: 'right', width: 205 });

    // 2. Client & Delivery Info Section
    doc.roundedRect(40, 125, 532, 75, 4).lineWidth(1).strokeColor('#e2e8f0').stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#334155')
      .text('DATOS DEL CLIENTE', 55, 135);

    const clienteNombre = orden.cliente?.nombre || 'Cliente Ocasional / Mostrador';
    const clienteTelefono = orden.cliente?.telefono || 'N/A';
    const clienteEmail = orden.cliente?.email || 'N/A';
    const direccionEntrega = orden.direccion_entrega || orden.cliente?.direccion || 'Retiro en mostrador';

    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Nombre / Razón Social: ', 55, 150, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(clienteNombre);

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Teléfono: ', 55, 165, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(clienteTelefono, { continued: true })
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('    Email: ', { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(clienteEmail);

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Entrega: ', 55, 180, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(`${orden.tipo_entrega.toUpperCase()} — ${direccionEntrega}`);

    // Order Meta (Right side inside box)
    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Canal de Venta: ', 360, 150, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(orden.canal.toUpperCase(), { align: 'right', width: 200 });

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Método de Pago: ', 360, 165, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(orden.metodo_pago.toUpperCase(), { align: 'right', width: 200 });

    const estadoPagoTexto =
      orden.estado_pago === 'confirmado' ? 'PAGADO / CONFIRMADO' : 'PAGO PENDIENTE';
    const estadoPagoColor = orden.estado_pago === 'confirmado' ? '#16a34a' : '#d97706';

    doc
      .font('Helvetica-Bold')
      .fillColor(estadoPagoColor)
      .text(estadoPagoTexto, 360, 180, { align: 'right', width: 200 });

    // 3. Table Header
    const tableTop = 215;
    doc
      .rect(40, tableTop, 532, 22)
      .fill('#0f172a');

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('SKU / CÓDIGO', 50, tableTop + 6, { width: 110 })
      .text('DESCRIPCIÓN / PRODUCTO', 165, tableTop + 6, { width: 210 })
      .text('CANT.', 380, tableTop + 6, { width: 45, align: 'center' })
      .text('PRECIO UNIT.', 430, tableTop + 6, { width: 65, align: 'right' })
      .text('SUBTOTAL', 500, tableTop + 6, { width: 62, align: 'right' });

    // 4. Table Rows
    let yPosition = tableTop + 22;
    const detalles = orden.detalles || [];

    detalles.forEach((detalle, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.rect(40, yPosition, 532, 20).fill('#f8fafc');
      }

      const skuCode = detalle.sku?.sku_interno || 'N/A';
      const productName = detalle.sku?.nombre || `Item Repuesto (${detalle.sku_id})`;
      const cant = detalle.cantidad;
      const precio = Number(detalle.precio_unitario).toFixed(2);
      const subtotal = Number(detalle.subtotal).toFixed(2);

      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(skuCode, 50, yPosition + 5, { width: 110, ellipsis: true })
        .font('Helvetica')
        .fillColor('#334155')
        .text(productName, 165, yPosition + 5, { width: 210, ellipsis: true })
        .text(cant.toString(), 380, yPosition + 5, { width: 45, align: 'center' })
        .text(`$${precio}`, 430, yPosition + 5, { width: 65, align: 'right' })
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(`$${subtotal}`, 500, yPosition + 5, { width: 62, align: 'right' });

      yPosition += 20;
    });

    // Bottom border of table
    doc
      .moveTo(40, yPosition)
      .lineTo(572, yPosition)
      .strokeColor('#cbd5e1')
      .stroke();

    // 5. Totals Section
    const totalsTop = yPosition + 15;
    const totalAmount = Number(orden.total).toFixed(2);

    doc.roundedRect(360, totalsTop, 212, 60, 4).fillOpacity(0.05).fill('#0f172a').fillOpacity(1);
    doc.roundedRect(360, totalsTop, 212, 60, 4).lineWidth(1).strokeColor('#cbd5e1').stroke();

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Subtotal:', 375, totalsTop + 10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`$${totalAmount}`, 465, totalsTop + 10, { width: 95, align: 'right' });

    doc
      .font('Helvetica')
      .fillColor('#475569')
      .text('IVA (0% / Exento):', 375, totalsTop + 24)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('$0.00', 465, totalsTop + 24, { width: 95, align: 'right' });

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('TOTAL A PAGAR:', 375, totalsTop + 40)
      .text(`$${totalAmount} USD`, 450, totalsTop + 40, { width: 110, align: 'right' });

    // 6. Footer & Terms
    const footerTop = 670;
    doc
      .moveTo(40, footerTop)
      .lineTo(572, footerTop)
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#64748b')
      .text('TÉRMINOS Y CONDICIONES DE GARANTÍA', 40, footerTop + 8, { align: 'center' });

    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text(
        '1. Las partes eléctricas tienen 48 horas de garantía contra defectos comprobables de fábrica.\n' +
        '2. Partes mecánicas disponen de 15 días continuos de garantía presentando el empaque original intacto.\n' +
        '3. No se aceptan devoluciones por errores de aplicación si el cliente no suministró la compatibilidad vehicular correcta.\n' +
        '4. Documento emitido electrónicamente por el Sistema ERP Japón Parts multicanal.',
        40,
        footerTop + 20,
        { align: 'center', lineGap: 2 },
      );
  }
}
