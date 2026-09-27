import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { OrdenSummary, SkuSummary } from '@japonparts/shared';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly mailFrom: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.mailFrom =
      this.configService.get<string>('MAIL_FROM') ||
      'Japón Parts <notificaciones@japonparts.com>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
      this.logger.log(`Nodemailer configurado para servidor SMTP ${host}:${port}`);
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Servidor SMTP no configurado con credenciales activas. Operando en modo log simulado.',
      );
    }
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>,
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.log(
        `[SIMULATED EMAIL] De: ${this.mailFrom} | Para: ${to} | Asunto: ${subject} | Adjuntos: ${attachments?.length || 0}`,
      );
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.mailFrom,
        to,
        subject,
        html,
        attachments,
      });
      this.logger.log(`Correo enviado exitosamente a ${to} (${subject})`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error enviando correo a ${to}: ${error?.message || error}`);
      return false;
    }
  }

  /**
   * Enviar comprobante de orden / factura PDF al cliente
   */
  async sendOrderConfirmation(
    to: string,
    orden: Partial<OrdenSummary> & { numero_orden: string; total: number },
    pdfBuffer?: Buffer,
  ): Promise<boolean> {
    const subject = `Comprobante de Orden #${orden.numero_orden} — Japón Parts`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1F2937;">
        <div style="background-color: #0A0D14; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 24px;">JAPÓN<span style="color: #C4F82A;">PARTS</span></h1>
          <p style="color: #8B949E; margin: 5px 0 0; font-size: 13px;">Especialistas en Repuestos Automotrices</p>
        </div>

        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="margin-top: 0; color: #111827; font-size: 18px;">¡Gracias por tu compra!</h2>
          <p style="font-size: 14px; line-height: 1.5;">Hemos registrado tu orden con el número <strong>#${orden.numero_orden}</strong>.</p>
          
          <table style="width: 100%; margin-top: 16px; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6B7280;">Monto Total:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">$${Number(orden.total).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280;">Estado de Pago:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #059669;">${orden.estado_pago || 'Pendiente'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280;">Tipo de Entrega:</td>
              <td style="padding: 8px 0; text-align: right;">${orden.tipo_entrega || 'Retiro en tienda'}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
          Este es un correo automático generado por el sistema de Japón Parts. Si tienes dudas, contáctanos por WhatsApp.
        </p>
      </div>
    `;

    const attachments = pdfBuffer
      ? [
          {
            filename: `Orden_${orden.numero_orden}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined;

    return this.sendMail(to, subject, html, attachments);
  }

  /**
   * Alerta de stock crítico o mínimo alcanzado para administradores y vendedores
   */
  async sendStockAlert(to: string, skus: Partial<SkuSummary>[]): Promise<boolean> {
    const subject = `⚠️ Alerta de Inventario: ${skus.length} repuesto(s) con stock crítico`;
    const rows = skus
      .map(
        (s) => `
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 8px; font-weight: bold;">${s.sku_interno || 'N/A'}</td>
          <td style="padding: 8px;">${s.nombre || ''}</td>
          <td style="padding: 8px; text-align: center; color: #DC2626; font-weight: bold;">${s.stock_actual ?? 0}</td>
          <td style="padding: 8px; text-align: center;">${s.stock_minimo ?? 0}</td>
        </tr>
      `,
      )
      .join('');

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #DC2626;">⚠️ Alerta de Stock Mínimo</h2>
        <p>Los siguientes repuestos han alcanzado o descendido por debajo de su umbral mínimo de seguridad:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
          <thead>
            <tr style="background: #F3F4F6; text-align: left;">
              <th style="padding: 8px;">SKU</th>
              <th style="padding: 8px;">Descripción</th>
              <th style="padding: 8px; text-align: center;">Stock Actual</th>
              <th style="padding: 8px; text-align: center;">Stock Mín.</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }

  /**
   * Alerta cuando el bot escala una conversación o se genera una orden vía WhatsApp
   */
  async sendWhatsappEscalationAlert(
    to: string,
    telefono: string,
    motivo: string,
    ultimoMensaje?: string,
  ): Promise<boolean> {
    const subject = `🔔 Atención Requerida: Conversación de WhatsApp escalada (${telefono})`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F59E0B;">🔔 Conversación Escalada a Humano</h2>
        <p>El bot de WhatsApp ha transferido una conversación que requiere atención personalizada:</p>
        <ul>
          <li><strong>Cliente/Teléfono:</strong> ${telefono}</li>
          <li><strong>Motivo:</strong> ${motivo}</li>
          <li><strong>Último mensaje recibido:</strong> "${ultimoMensaje || 'Sin mensaje'}"</li>
        </ul>
        <p>Por favor ingresa al módulo de WhatsApp en el panel para responder al cliente.</p>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }
}
