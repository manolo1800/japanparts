import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { StorageService } from '../storage/storage.service';
import { OrdenCompra } from '../entities/orden-compra.entity';

@Injectable()
export class OrdenCompraPdfService {
  private readonly logger = new Logger(OrdenCompraPdfService.name);

  constructor(private readonly storageService: StorageService) {}

  async generateOrdenCompraPdf(
    ordenCompra: OrdenCompra,
  ): Promise<{ buffer: Buffer; url: string; filename: string }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 40,
          info: {
            Title: `ORDEN DE COMPRA ${ordenCompra.numero_orden} - Tokugawa Spare Parts`,
            Author: 'ERP Tokugawa Spare Parts',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', async () => {
          const pdfBuffer = Buffer.concat(chunks);
          const filename = `orden_compra_${ordenCompra.numero_orden.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
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
          } catch (uploadError: any) {
            this.logger.error(`Error uploading Orden de Compra PDF to storage: ${uploadError.message}`);
            resolve({
              buffer: pdfBuffer,
              url: `/storage/compras/${filename}`,
              filename,
            });
          }
        });
        doc.on('error', (err) => reject(err));

        this.renderPdfContent(doc, ordenCompra);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private renderPdfContent(doc: PDFKit.PDFDocument, orden: OrdenCompra) {
    const primaryColor = '#1A5276'; // Brand Deep Blue
    const accentColor = '#D97706';

    // 1. Header Banner
    doc
      .rect(40, 40, 532, 72)
      .fillOpacity(0.07)
      .fill(primaryColor)
      .fillOpacity(1);

    // Brand logo & Company text
    doc
      .fontSize(19)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('TOKUGAWA', 55, 50, { continued: true })
      .fillColor('#0f172a')
      .text(' SPARE PARTS', { continued: false });

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#475569')
      .text('REPUESTOS Y ACCESORIOS AUTOMOTRICES JAPONESES', 55, 74)
      .text('RIF: J-40892182-0 | Av. Principal Los Ruices, Galpón 4, Caracas', 55, 85)
      .text('Tel: +58 412-1234567 | compras@tokugawaspareparts.com', 55, 96);

    // Document identifier box (right side of header)
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('ORDEN DE COMPRA', 330, 48, { align: 'right', width: 225 });

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`N° ${orden.numero_orden}`, 330, 64, { align: 'right', width: 225 });

    const fechaRealizacion = new Date(orden.fecha_emision).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Fecha de Realización: ${fechaRealizacion}`, 330, 80, { align: 'right', width: 225 });

    if (orden.fecha_entrega_esperada) {
      const fechaEntrega = new Date(orden.fecha_entrega_esperada).toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      doc.text(`Fecha Requerida: ${fechaEntrega}`, 330, 93, { align: 'right', width: 225 });
    }

    // 2. Supplier Info Section (Membrete del Proveedor)
    const boxTop = 125;
    doc.roundedRect(40, boxTop, 532, 75, 4).lineWidth(1).strokeColor('#e2e8f0').stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('DATOS DEL PROVEEDOR', 55, boxTop + 10);

    const proveedorNombre = orden.proveedor?.nombre || 'Proveedor';
    const proveedorRif = orden.proveedor?.rif || 'N/A';
    const proveedorTelefono = orden.proveedor?.telefono || 'N/A';
    const proveedorEmail = orden.proveedor?.email || 'N/A';
    const proveedorContacto = orden.proveedor?.contacto || 'Atención a Ventas';
    const proveedorDireccion = orden.proveedor?.direccion || 'No especificada';

    // Left Column
    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Razón Social: ', 55, boxTop + 26, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(proveedorNombre);

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('RIF / Identificación: ', 55, boxTop + 40, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(proveedorRif, { continued: true })
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('   |   Contacto: ', { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(proveedorContacto);

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Dirección: ', 55, boxTop + 54, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(proveedorDireccion.slice(0, 75));

    // Right Column inside box
    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Teléfono / WhatsApp: ', 360, boxTop + 26, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(proveedorTelefono, { align: 'right', width: 200 });

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Email: ', 360, boxTop + 40, { continued: true })
      .font('Helvetica')
      .fillColor('#334155')
      .text(proveedorEmail, { align: 'right', width: 200 });

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Estado: ', 360, boxTop + 54, { continued: true })
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(orden.estado.toUpperCase(), { align: 'right', width: 200 });

    // 3. Table Header
    const tableTop = 215;
    doc
      .rect(40, tableTop, 532, 22)
      .fill(primaryColor);

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('#', 48, tableTop + 6, { width: 22 })
      .text('CÓDIGO / SKU', 75, tableTop + 6, { width: 105 })
      .text('DESCRIPCIÓN DEL ARTÍCULO REQUERIDO', 185, tableTop + 6, { width: 295 })
      .text('CANTIDAD', 485, tableTop + 6, { width: 75, align: 'center' });

    // 4. Table Rows
    let yPosition = tableTop + 22;
    const detalles = orden.detalles || [];
    let totalUnidades = 0;

    detalles.forEach((detalle, index) => {
      let compatText = detalle.marca_compatibilidad?.trim() || '';
      const marca = (detalle.marca || detalle.sku?.marca || '').trim();
      if (!compatText && detalle.sku) {
        const cars = (detalle.sku.compatibilidades || [])
          .slice(0, 3)
          .map((c) => c.modelo?.trim())
          .filter(Boolean);
        compatText = [marca, ...cars].filter(Boolean).join('/');
      }

      const rowHeight = compatText ? 26 : 22;
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.rect(40, yPosition, 532, rowHeight).fill('#f8fafc');
      }

      const itemNum = (index + 1).toString();
      const skuCode = detalle.codigo_articulo || detalle.sku?.sku_interno || 'N/A';
      const productName = detalle.descripcion || detalle.sku?.nombre || 'Repuesto';
      const cant = detalle.cantidad || 1;
      totalUnidades += cant;

      const verticalOffset = compatText ? 4 : 6;

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(itemNum, 48, yPosition + verticalOffset, { width: 22 })
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(skuCode, 75, yPosition + verticalOffset, { width: 105, ellipsis: true });

      if (compatText) {
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(productName, 185, yPosition + 3, { width: 295, ellipsis: true })
          .fontSize(7)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(compatText, 185, yPosition + 14, { width: 295, ellipsis: true });
      } else {
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#334155')
          .text(productName, 185, yPosition + verticalOffset, { width: 295, ellipsis: true });
      }

      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(cant.toString(), 485, yPosition + verticalOffset, { width: 75, align: 'center' });

      yPosition += rowHeight;
    });

    // Table bottom line
    doc
      .moveTo(40, yPosition)
      .lineTo(572, yPosition)
      .strokeColor('#cbd5e1')
      .stroke();

    // 5. Notes & Summary Section
    const totalsTop = yPosition + 15;

    // Observaciones / Delivery instructions box (Left side)
    doc.roundedRect(40, totalsTop, 305, 75, 4).fillOpacity(0.04).fill('#0f172a').fillOpacity(1);
    doc.roundedRect(40, totalsTop, 305, 75, 4).lineWidth(1).strokeColor('#e2e8f0').stroke();

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('INSTRUCCIONES Y OBSERVACIONES:', 52, totalsTop + 8);

    const obs =
      orden.observaciones ||
      'Despachar según las cantidades indicadas a nuestro almacén principal en Los Ruices. Agradecemos enviar la confirmación del pedido y factura correspondiente.';

    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#475569')
      .text(obs, 52, totalsTop + 22, { width: 280, height: 45, ellipsis: true });

    // Summary Box (Right side - No prices; vendor quotes prices)
    doc.roundedRect(360, totalsTop, 212, 75, 4).fillOpacity(0.06).fill(primaryColor).fillOpacity(1);
    doc.roundedRect(360, totalsTop, 212, 75, 4).lineWidth(1).strokeColor('#cbd5e1').stroke();

    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('RESUMEN DE REQUISICIÓN', 372, totalsTop + 9);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Renglones Solicitados:', 372, totalsTop + 26)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(`${detalles.length} ítems`, 470, totalsTop + 26, { width: 90, align: 'right' });

    doc
      .font('Helvetica')
      .fillColor('#475569')
      .text('Total Unidades Requeridas:', 372, totalsTop + 42)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(`${totalUnidades} unds.`, 470, totalsTop + 42, { width: 90, align: 'right' });

    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('* Precios fijados por el Proveedor en cotización/factura', 372, totalsTop + 58, {
        width: 190,
      });

    // 6. Signatures & Authorization Box
    const signTop = totalsTop + 95;
    doc
      .moveTo(80, signTop + 35)
      .lineTo(240, signTop + 35)
      .strokeColor('#94a3b8')
      .stroke();

    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#475569')
      .text('DEPARTAMENTO DE COMPRAS', 80, signTop + 40, { width: 160, align: 'center' })
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text('Tokugawa Spare Parts C.A.', 80, signTop + 50, { width: 160, align: 'center' });

    doc
      .moveTo(370, signTop + 35)
      .lineTo(530, signTop + 35)
      .strokeColor('#94a3b8')
      .stroke();

    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#475569')
      .text('RECIBIDO Y CONFORME PROVEEDOR', 370, signTop + 40, { width: 160, align: 'center' })
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text('Firma y Sello / Fecha', 370, signTop + 50, { width: 160, align: 'center' });

    // 7. Footer
    const footerTop = 675;
    doc
      .moveTo(40, footerTop)
      .lineTo(572, footerTop)
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#64748b')
      .text('CONDICIONES GENERALES DE LA ORDEN DE COMPRA', 40, footerTop + 6, {
        align: 'center',
      });

    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text(
        '1. La presente orden de compra autoriza el despacho exclusivo de los artículos, códigos y cantidades detallados arriba.\n' +
          '2. Todo producto debe llegar en empaque original y en perfectas condiciones con su guía de despacho o factura fiscal.\n' +
          '3. Los precios, condiciones de crédito e impuestos aplicables serán indicados por el proveedor en su cotización o factura correspondiente.\n' +
          '4. Documento emitido electrónicamente por el Sistema ERP Tokugawa Spare Parts multicanal.',
        40,
        footerTop + 18,
        { align: 'center', lineGap: 2 },
      );
  }
}
