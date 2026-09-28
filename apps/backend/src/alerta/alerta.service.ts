import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Sku, Conversacion, Compra } from '../entities';
import {
  AlertaItem,
  ConversationStatus,
  PurchasePaymentCondition,
  PurchaseStatus,
} from '@japonparts/shared';
import { MailService } from '../integrations/mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlertaService {
  private readonly logger = new Logger(AlertaService.name);

  constructor(
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
    @InjectRepository(Conversacion)
    private readonly conversacionRepository: Repository<Conversacion>,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtiene la lista consolidada de alertas activas del sistema
   */
  async obtenerAlertas(): Promise<AlertaItem[]> {
    const alertas: AlertaItem[] = [];

    // 1. Alertas de inventario (Stock bajo / agotado)
    const skusCriticos = await this.skuRepository
      .createQueryBuilder('s')
      .where('s.stock_actual <= s.stock_minimo')
      .andWhere('s.activo = true')
      .orderBy('s.stock_actual', 'ASC')
      .take(30)
      .getMany();

    skusCriticos.forEach((sku) => {
      const stock = Number(sku.stock_actual);
      const min = Number(sku.stock_minimo);
      const esAgotado = stock <= 0;

      alertas.push({
        id: `stock-${sku.id}`,
        tipo: 'stock_bajo',
        nivel: esAgotado ? 'critico' : 'advertencia',
        titulo: esAgotado
          ? `Repuesto Agotado: ${sku.sku_interno}`
          : `Stock Mínimo Alcanzado: ${sku.sku_interno}`,
        mensaje: esAgotado
          ? `"${sku.nombre}" (${sku.marca}) está completamente agotado en bodega.`
          : `"${sku.nombre}" cuenta con solo ${stock} unidad(es) disponible(s). Umbral de seguridad: ${min}.`,
        metadata: {
          sku_id: sku.id,
          sku_interno: sku.sku_interno,
          stock_actual: stock,
          stock_minimo: min,
        },
        timestamp: new Date().toISOString(),
        accion_url: `/inventario?q=${encodeURIComponent(sku.sku_interno)}`,
        accion_label: 'Ver en Inventario',
      });
    });

    // 2. Alertas de WhatsApp (Conversaciones escaladas a humano)
    const chatsHumano = await this.conversacionRepository.find({
      where: { estado: ConversationStatus.HUMANO },
      relations: ['cliente'],
      order: { updated_at: 'DESC' },
      take: 15,
    });

    chatsHumano.forEach((conv) => {
      alertas.push({
        id: `chat-${conv.id}`,
        tipo: 'whatsapp_sin_atender',
        nivel: 'advertencia',
        titulo: `Chat en Espera: ${conv.cliente?.nombre || conv.telefono}`,
        mensaje: `La conversación de WhatsApp fue transferida a atención humana y requiere respuesta de un vendedor.`,
        metadata: {
          conversacion_id: conv.id,
          telefono: conv.telefono,
          cliente_nombre: conv.cliente?.nombre,
        },
        timestamp: conv.updated_at.toISOString(),
        accion_url: `/whatsapp`,
        accion_label: 'Abrir Chat',
      });
    });

    // 3. Alertas de cuentas por pagar a crédito pendientes
    const comprasPendientes = await this.compraRepository.find({
      where: {
        condicion_pago: PurchasePaymentCondition.CREDITO,
        estado: PurchaseStatus.RECIBIDA,
      },
      relations: ['proveedor'],
      order: { fecha: 'ASC' },
      take: 10,
    });

    comprasPendientes.forEach((c) => {
      alertas.push({
        id: `compra-${c.id}`,
        tipo: 'compra_vencida',
        nivel: 'info',
        titulo: `Factura a Crédito Pendiente: ${c.numero_factura}`,
        mensaje: `Compra por $${Number(c.total).toFixed(2)} del proveedor ${c.proveedor?.nombre || 'Proveedor'} con ${c.dias_credito} días de crédito pendiente de pago.`,
        metadata: {
          compra_id: c.id,
          total: c.total,
          proveedor: c.proveedor?.nombre,
        },
        timestamp: c.created_at.toISOString(),
        accion_url: `/proveedores`,
        accion_label: 'Ver Proveedor',
      });
    });

    return alertas;
  }

  /**
   * Dispara el envío de correo de alerta de inventario crítico al administrador
   */
  async enviarAlertaStockEmail(emailDestino?: string): Promise<{
    enviado: boolean;
    destinatario: string;
    skus_alertados: number;
  }> {
    const destino =
      emailDestino ||
      this.configService.get<string>('ADMIN_ALERT_EMAIL') ||
      'administrador@tokugawaspareparts.com';

    const skus = await this.skuRepository
      .createQueryBuilder('s')
      .where('s.stock_actual <= s.stock_minimo')
      .andWhere('s.activo = true')
      .orderBy('s.stock_actual', 'ASC')
      .take(50)
      .getMany();

    if (skus.length === 0) {
      return {
        enviado: false,
        destinatario: destino,
        skus_alertados: 0,
      };
    }

    const exito = await this.mailService.sendStockAlert(
      destino,
      skus.map((s) => ({
        sku_interno: s.sku_interno,
        nombre: s.nombre,
        marca: s.marca,
        stock_actual: Number(s.stock_actual),
        stock_minimo: Number(s.stock_minimo),
      })),
    );

    return {
      enviado: exito,
      destinatario: destino,
      skus_alertados: skus.length,
    };
  }
}
