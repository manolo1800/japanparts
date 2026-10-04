import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrdenCompra } from '../entities/orden-compra.entity';
import { OrdenCompraDetalle } from '../entities/orden-compra-detalle.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { Sku } from '../entities/sku.entity';
import { Compra } from '../entities/compra.entity';
import { CompraDetalle } from '../entities/compra-detalle.entity';
import {
  CreateOrdenCompraDto,
  EnviarOrdenCompraEmailDto,
  EnviarOrdenCompraWhatsappDto,
} from './dto/orden-compra.dto';
import {
  PurchaseOrderStatus,
  PurchaseStatus,
  PurchasePaymentCondition,
} from '@japonparts/shared';
import { OrdenCompraPdfService } from './orden-compra-pdf.service';
import { MailService } from '../integrations/mail/mail.service';
import { BaileysService } from '../integrations/whatsapp/baileys.service';

@Injectable()
export class OrdenCompraService {
  private readonly logger = new Logger(OrdenCompraService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrdenCompra)
    private readonly ordenCompraRepo: Repository<OrdenCompra>,
    @InjectRepository(OrdenCompraDetalle)
    private readonly ordenCompraDetalleRepo: Repository<OrdenCompraDetalle>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepo: Repository<Proveedor>,
    @InjectRepository(Sku)
    private readonly skuRepo: Repository<Sku>,
    @InjectRepository(Compra)
    private readonly compraRepo: Repository<Compra>,
    @InjectRepository(CompraDetalle)
    private readonly compraDetalleRepo: Repository<CompraDetalle>,
    private readonly pdfService: OrdenCompraPdfService,
    private readonly mailService: MailService,
    private readonly baileysService: BaileysService,
  ) {}

  async create(dto: CreateOrdenCompraDto, usuarioId?: string): Promise<OrdenCompra> {
    const proveedor = await this.proveedorRepo.findOne({
      where: { id: dto.proveedor_id },
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID '${dto.proveedor_id}' no encontrado`);
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La orden de compra debe contener al menos un artículo');
    }

    return await this.dataSource.transaction(async (manager) => {
      const ocRepo = manager.getRepository(OrdenCompra);
      const ocdRepo = manager.getRepository(OrdenCompraDetalle);

      // 1. Generar número de orden de compra si no fue proporcionado
      let numeroOrden = dto.numero_orden?.trim().toUpperCase();
      if (!numeroOrden) {
        const year = new Date(dto.fecha_emision || new Date()).getFullYear();
        const prefix = `OC-${year}-`;
        const latest = await ocRepo
          .createQueryBuilder('oc')
          .where('oc.numero_orden LIKE :pattern', { pattern: `${prefix}%` })
          .orderBy('oc.numero_orden', 'DESC')
          .getOne();

        let nextNum = 1;
        if (latest) {
          const match = latest.numero_orden.match(/OC-\d{4}-(\d+)/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }
        numeroOrden = `${prefix}${String(nextNum).padStart(4, '0')}`;
      }

      // 2. Procesar ítems (en órdenes de compra no se fijan montos ni precios; el proveedor es quien los establece)
      const detallesToCreate: OrdenCompraDetalle[] = [];

      for (const item of dto.items) {
        let codigoArticulo = item.codigo_articulo?.trim() || '';
        let descripcion = item.descripcion?.trim() || '';
        let marcaArticulo = item.marca?.trim() || '';
        let marcaCompatibilidad = item.marca_compatibilidad?.trim() || '';
        const cantidad = Number(item.cantidad) || 1;

        if (item.sku_id) {
          const sku = await manager.getRepository(Sku).findOne({
            where: { id: item.sku_id },
            relations: ['compatibilidades'],
            order: {
              compatibilidades: {
                created_at: 'ASC',
              },
            },
          });
          if (sku) {
            if (!codigoArticulo) codigoArticulo = sku.sku_interno;
            if (!descripcion) descripcion = sku.nombre;
            if (!marcaArticulo && sku.marca) {
              marcaArticulo = sku.marca.trim();
            }
            if (!marcaCompatibilidad) {
              // Marca desde el campo marca de la tabla sku
              const marca = (sku.marca || '').trim();
              // Los 3 primeros registros de la tabla compatibilidad
              const primerosTresCarros = (sku.compatibilidades || [])
                .slice(0, 3)
                .map((c) => c.modelo?.trim())
                .filter(Boolean);
              marcaCompatibilidad = [marca, ...primerosTresCarros].filter(Boolean).join('/');
            }
          }
        }

        if (!codigoArticulo) {
          codigoArticulo = 'ITEM-SOLICITUD';
        }

        const detalle = ocdRepo.create({
          sku_id: item.sku_id || null,
          codigo_articulo: codigoArticulo,
          descripcion,
          marca: marcaArticulo || null,
          marca_compatibilidad: marcaCompatibilidad || null,
          cantidad,
          costo_unitario: 0,
          subtotal: 0,
        });

        detallesToCreate.push(detalle);
      }

      const ordenCompra = ocRepo.create({
        proveedor_id: dto.proveedor_id,
        numero_orden: numeroOrden,
        fecha_emision: dto.fecha_emision ? new Date(dto.fecha_emision) : new Date(),
        fecha_entrega_esperada: dto.fecha_entrega_esperada
          ? new Date(dto.fecha_entrega_esperada)
          : null,
        estado: PurchaseOrderStatus.BORRADOR,
        subtotal: 0,
        total: 0,
        observaciones: dto.observaciones || null,
        usuario_id: usuarioId || null,
      });

      const savedOrden = await ocRepo.save(ordenCompra);

      for (const det of detallesToCreate) {
        det.orden_compra_id = savedOrden.id;
        await ocdRepo.save(det);
      }

      // 3. Generar y almacenar el PDF inicial
      const loaded = await this.findOne(savedOrden.id, ocRepo);
      try {
        const { url } = await this.pdfService.generateOrdenCompraPdf(loaded);
        await ocRepo.update(savedOrden.id, { archivo_pdf_url: url });
        loaded.archivo_pdf_url = url;
      } catch (pdfErr: any) {
        this.logger.error(`Error generando PDF para orden ${savedOrden.id}: ${pdfErr?.message}`);
      }

      return loaded;
    });
  }

  async findAll(query?: {
    estado?: PurchaseOrderStatus;
    proveedor_id?: string;
    search?: string;
  }): Promise<OrdenCompra[]> {
    const qb = this.ordenCompraRepo
      .createQueryBuilder('oc')
      .leftJoinAndSelect('oc.proveedor', 'proveedor')
      .leftJoinAndSelect('oc.detalles', 'detalles')
      .leftJoinAndSelect('detalles.sku', 'sku')
      .leftJoinAndSelect('sku.compatibilidades', 'compatibilidades')
      .leftJoinAndSelect('oc.usuario', 'usuario')
      .leftJoinAndSelect('oc.compra', 'compra')
      .orderBy('oc.created_at', 'DESC')
      .addOrderBy('detalles.created_at', 'ASC')
      .addOrderBy('compatibilidades.created_at', 'ASC');

    if (query?.estado) {
      qb.andWhere('oc.estado = :estado', { estado: query.estado });
    }

    if (query?.proveedor_id) {
      qb.andWhere('oc.proveedor_id = :proveedorId', { proveedorId: query.proveedor_id });
    }

    if (query?.search) {
      qb.andWhere(
        '(oc.numero_orden ILIKE :search OR proveedor.nombre ILIKE :search OR proveedor.rif ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    return await qb.getMany();
  }

  async findOne(id: string, repo = this.ordenCompraRepo): Promise<OrdenCompra> {
    const orden = await repo.findOne({
      where: { id },
      relations: [
        'proveedor',
        'detalles',
        'detalles.sku',
        'detalles.sku.compatibilidades',
        'usuario',
        'compra',
      ],
      order: {
        detalles: {
          created_at: 'ASC',
          sku: {
            compatibilidades: {
              created_at: 'ASC',
            },
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de compra con ID '${id}' no encontrada`);
    }

    return orden;
  }

  async getPdfBuffer(id: string): Promise<{ buffer: Buffer; filename: string; url: string }> {
    const orden = await this.findOne(id);
    const pdfData = await this.pdfService.generateOrdenCompraPdf(orden);
    if (!orden.archivo_pdf_url || orden.archivo_pdf_url !== pdfData.url) {
      await this.ordenCompraRepo.update(id, { archivo_pdf_url: pdfData.url });
    }
    return pdfData;
  }

  async enviarEmail(
    id: string,
    dto: EnviarOrdenCompraEmailDto,
  ): Promise<{ success: boolean; message: string }> {
    const orden = await this.findOne(id);
    const targetEmail = dto.email.trim();

    if (!targetEmail) {
      throw new BadRequestException('Debes proporcionar un correo electrónico válido');
    }

    // 1. Generar buffer de PDF
    const { buffer, filename } = await this.pdfService.generateOrdenCompraPdf(orden);

    // 2. Formatear correo electrónico corporativo
    const subject = `Orden de Compra #${orden.numero_orden} — Tokugawa Spare Parts`;
    const fechaEmision = new Date(orden.fecha_emision).toLocaleDateString('es-VE');

    const totalArticulos = (orden.detalles || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);

    const filasArticulos = (orden.detalles || [])
      .map((det, idx) => {
        let compat = det.marca_compatibilidad || '';
        const marca = (det.marca || det.sku?.marca || '').trim();
        if (!compat && det.sku) {
          const cars = (det.sku.compatibilidades || [])
            .slice(0, 3)
            .map((c) => c.modelo?.trim())
            .filter(Boolean);
          compat = [marca, ...cars].filter(Boolean).join('/');
        }

        return `
        <tr style="border-bottom: 1px solid #E5E7EB; font-size: 13px;">
          <td style="padding: 10px 8px; color: #6B7280; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 8px; font-weight: 600; color: #111827; font-family: monospace;">${det.codigo_articulo}</td>
          <td style="padding: 10px 8px; color: #374151;">
            <div style="font-weight: 600;">${det.descripcion}</div>
            ${
              marca
                ? `<div style="font-size: 11px; color: #4B5563; margin-top: 2px;">Marca: <strong>${marca}</strong></div>`
                : ''
            }
            ${
              compat
                ? `<div style="font-size: 11px; font-weight: bold; color: #1A5276; margin-top: 3px;">Vehículos / Compatibilidad: ${compat}</div>`
                : ''
            }
          </td>
          <td style="padding: 10px 8px; text-align: center; font-weight: bold; font-size: 14px; color: #1A5276;">${det.cantidad}</td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; color: #1F2937; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px;">
        <!-- Header Banner -->
        <div style="background-color: #1A5276; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; letter-spacing: 1px;">TOKUGAWA <span style="color: #F59E0B;">SPARE PARTS</span></h1>
          <p style="color: #E2E8F0; margin: 6px 0 0; font-size: 13px;">Especialistas en Repuestos y Accesorios Automotrices Japoneses</p>
          <p style="color: #CBD5E1; margin: 2px 0 0; font-size: 11px;">RIF: J-40892182-0 | Caracas, Venezuela</p>
        </div>

        <!-- Greeting & Info -->
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; color: #1A5276; margin-top: 0;">Solicitud de Orden de Compra #${orden.numero_orden}</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #374151;">
            Estimados señores de <strong>${orden.proveedor?.nombre || 'Proveedor'}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.5; color: #374151;">
            Por medio de la presente, remitimos formalmente nuestra <strong>Orden de Compra #${orden.numero_orden}</strong> emitida el <strong>${fechaEmision}</strong> con la lista de repuestos requeridos para cotización y despacho.
          </p>
          ${
            dto.mensaje
              ? `<div style="background-color: #F8FAFC; border-left: 4px solid #1A5276; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #475569;">
                  <strong>Nota adicional:</strong> ${dto.mensaje}
                </div>`
              : ''
          }
        </div>

        <!-- Table Summary -->
        <div style="margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            <thead>
              <tr style="background-color: #F1F5F9; color: #1E293B; font-size: 12px; text-transform: uppercase;">
                <th style="padding: 10px 8px; text-align: center; width: 40px;">#</th>
                <th style="padding: 10px 8px; text-align: left; width: 130px;">Código / SKU</th>
                <th style="padding: 10px 8px; text-align: left;">Descripción del Artículo Requerido</th>
                <th style="padding: 10px 8px; text-align: center; width: 100px;">Cant. Requerida</th>
              </tr>
            </thead>
            <tbody>
              ${filasArticulos}
            </tbody>
            <tfoot>
              <tr style="background-color: #F8FAFC; border-top: 2px solid #E2E8F0;">
                <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; color: #1A5276; font-size: 13px;">Total Unidades Solicitadas:</td>
                <td style="padding: 12px 8px; text-align: center; font-weight: bold; color: #1A5276; font-size: 14px;">${totalArticulos} unds.</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Call to action / Instructions -->
        <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #1E3A8A;">
          <strong style="display: block; margin-bottom: 6px;">Instrucciones para el Proveedor:</strong>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Encuentre el documento formal en el archivo PDF adjunto a este correo.</li>
            <li>Agradecemos confirmar disponibilidad de stock, cotización de precios y tiempo estimado de entrega respondiendo a este mensaje.</li>
            <li>Lugar de entrega: Almacén Principal Tokugawa Spare Parts, Av. Principal Los Ruices, Galpón 4, Caracas.</li>
          </ul>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #E5E7EB; padding-top: 16px; font-size: 11px; color: #9CA3AF; text-align: center;">
          <p style="margin: 0;">Este es un mensaje generado automáticamente por el Sistema ERP Tokugawa Spare Parts.</p>
          <p style="margin: 4px 0 0;">Departamento de Compras y Suministros | Tel: +58 412-1234567</p>
        </div>
      </div>
    `;

    const attachments = [
      {
        filename,
        content: buffer,
        contentType: 'application/pdf',
      },
    ];

    const mailSent = await this.mailService.sendMail(targetEmail, subject, html, attachments);

    if (!mailSent) {
      throw new BadRequestException('No se pudo enviar el correo electrónico al proveedor');
    }

    // Actualizar registro de envío y estado si estaba en borrador
    await this.ordenCompraRepo.update(id, {
      enviado_email: true,
      enviado_email_a: targetEmail,
      enviado_email_at: new Date(),
      estado:
        orden.estado === PurchaseOrderStatus.BORRADOR
          ? PurchaseOrderStatus.ENVIADA
          : orden.estado,
    });

    return {
      success: true,
      message: `Orden de compra enviada exitosamente a ${targetEmail}`,
    };
  }

  async enviarWhatsapp(
    id: string,
    dto: EnviarOrdenCompraWhatsappDto,
  ): Promise<{
    success: boolean;
    directSent: boolean;
    message: string;
    waLink: string;
  }> {
    const orden = await this.findOne(id);
    const rawPhone = dto.telefono.trim();

    if (!rawPhone) {
      throw new BadRequestException('Debes proporcionar un número de teléfono de WhatsApp');
    }

    // Normalizar teléfono eliminando caracteres no numéricos
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      throw new BadRequestException('El número de teléfono ingresado es demasiado corto');
    }

    const { buffer, filename } = await this.pdfService.generateOrdenCompraPdf(orden);

    const fechaEmision = new Date(orden.fecha_emision).toLocaleDateString('es-VE');
    const totalArticulos = (orden.detalles || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);

    const resumenItems = (orden.detalles || [])
      .slice(0, 5)
      .map((d) => {
        let compat = d.marca_compatibilidad || '';
        const marca = (d.marca || d.sku?.marca || '').trim();
        if (!compat && d.sku) {
          const cars = (d.sku.compatibilidades || [])
            .slice(0, 3)
            .map((c) => c.modelo?.trim())
            .filter(Boolean);
          compat = [marca, ...cars].filter(Boolean).join('/');
        }
        const marcaStr = marca ? ` (${marca})` : '';
        return `• ${d.cantidad}x ${d.codigo_articulo} - ${d.descripcion}${marcaStr}${compat ? ` [${compat}]` : ''}`;
      })
      .join('\n');
    const extraCount = (orden.detalles || []).length > 5 ? `\n... y ${(orden.detalles || []).length - 5} artículo(s) más (ver PDF adjunto)` : '';

    const textMessage =
      `📦 *ORDEN DE COMPRA — TOKUGAWA SPARE PARTS*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 *N° de Orden:* ${orden.numero_orden}\n` +
      `📅 *Fecha:* ${fechaEmision}\n` +
      `🏢 *Proveedor:* ${orden.proveedor?.nombre || 'Proveedor'}\n` +
      `📦 *Total Unidades:* ${totalArticulos} unds. (${(orden.detalles || []).length} ítems)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Artículos solicitados:*\n${resumenItems}${extraCount}\n\n` +
      (dto.mensaje ? `💬 *Nota:* ${dto.mensaje}\n\n` : '') +
      `Agradecemos confirmar disponibilidad de stock, cotización de precios y fecha de entrega. Adjuntamos documento PDF formal con el membrete y detalle de los repuestos requeridos.`;

    let directSent = false;

    // Si Baileys está conectado, enviar tanto el texto como el PDF directamente
    if (this.baileysService.isConnected()) {
      try {
        await this.baileysService.enviarMensajeTexto(cleanPhone, textMessage);
        await this.baileysService.enviarDocumento(
          cleanPhone,
          buffer,
          filename,
          'application/pdf',
        );
        directSent = true;
      } catch (waErr: any) {
        this.logger.warn(`Error enviando por Baileys: ${waErr?.message}`);
      }
    }

    // Siempre generar el enlace universal wa.me
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;

    // Registrar envío
    await this.ordenCompraRepo.update(id, {
      enviado_whatsapp: true,
      enviado_whatsapp_a: cleanPhone,
      enviado_whatsapp_at: new Date(),
      estado:
        orden.estado === PurchaseOrderStatus.BORRADOR
            ? PurchaseOrderStatus.ENVIADA
          : orden.estado,
    });

    return {
      success: true,
      directSent,
      message: directSent
        ? `Orden y PDF enviados directamente por WhatsApp a +${cleanPhone}`
        : `Enlace de WhatsApp generado con éxito para +${cleanPhone}`,
      waLink,
    };
  }

  /**
   * Convierte una Orden de Compra en Factura de Compra una vez que el proveedor entrega la mercancía.
   */
  async convertirAFactura(id: string, usuarioId?: string): Promise<Compra> {
    const orden = await this.findOne(id);

    if (orden.compra_id) {
      const existingCompra = await this.compraRepo.findOne({
        where: { id: orden.compra_id },
        relations: ['detalles', 'proveedor'],
      });
      if (existingCompra) {
        return existingCompra;
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      const compraRepo = manager.getRepository(Compra);
      const compraDetalleRepo = manager.getRepository(CompraDetalle);
      const ocRepo = manager.getRepository(OrdenCompra);

      const nuevaCompra = compraRepo.create({
        proveedor_id: orden.proveedor_id,
        numero_factura: `FAC-${orden.numero_orden}`,
        fecha: new Date(),
        subtotal: 0,
        total: 0,
        condicion_pago: PurchasePaymentCondition.CONTADO,
        dias_credito: 0,
        estado: PurchaseStatus.PENDIENTE,
        archivo_url: orden.archivo_pdf_url || null,
        usuario_id: usuarioId || null,
      });

      const savedCompra = await compraRepo.save(nuevaCompra);

      for (const item of orden.detalles || []) {
        let targetSkuId = item.sku_id;
        if (!targetSkuId) {
          // Buscar SKU por sku_interno
          const found = await manager.getRepository(Sku).findOne({
            where: { sku_interno: item.codigo_articulo },
          });
          if (found) targetSkuId = found.id;
        }

        if (targetSkuId) {
          const det = compraDetalleRepo.create({
            compra_id: savedCompra.id,
            sku_id: targetSkuId,
            cantidad: item.cantidad,
            costo_unitario: 0,
            subtotal: 0,
          });
          await compraDetalleRepo.save(det);
        }
      }

      await ocRepo.update(orden.id, {
        compra_id: savedCompra.id,
        estado: PurchaseOrderStatus.RECIBIDA,
      });

      return savedCompra;
    });
  }

  async updateEstado(id: string, estado: PurchaseOrderStatus): Promise<OrdenCompra> {
    const orden = await this.findOne(id);
    orden.estado = estado;
    return await this.ordenCompraRepo.save(orden);
  }
}
