import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Conversacion } from '../entities/conversacion.entity';
import { Mensaje } from '../entities/mensaje.entity';
import { Sku } from '../entities/sku.entity';
import { Cliente } from '../entities/cliente.entity';
import { Compatibilidad } from '../entities/compatibilidad.entity';
import { OrdenService } from '../orden/orden.service';
import { DeepSeekService } from '../integrations/deepseek/deepseek.service';
import { MailService } from '../integrations/mail/mail.service';
import { BaileysService, IncomingMessagePayload } from '../integrations/whatsapp/baileys.service';
import {
  Channel,
  ConversationStatus,
  MessageRole,
  DeliveryType,
  PaymentStatus,
  CreateOrdenDto,
} from '@japonparts/shared';
import { ChatCompletionTool } from 'openai/resources/chat/completions';

@Injectable()
export class ConversacionService implements OnModuleInit {
  private readonly logger = new Logger(ConversacionService.name);

  // Definición de herramientas para DeepSeek Function Calling
  private readonly botTools: ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'buscar_repuesto',
        description:
          'Busca repuestos automotrices en el inventario por texto, marca de vehículo, modelo o año.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Palabra clave o nombre de la autoparte (ej: pastillas de freno, filtro, amortiguador)',
            },
            marca_vehiculo: {
              type: 'string',
              description: 'Marca del automóvil (ej: Toyota, Nissan, Mitsubishi, Honda)',
            },
            modelo: {
              type: 'string',
              description: 'Modelo del automóvil (ej: Corolla, Yaris, Hilux, Sentra, Civic)',
            },
            anio: {
              type: 'number',
              description: 'Año de fabricación del vehículo (ej: 2012)',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'consultar_disponibilidad',
        description:
          'Consulta el stock exacto en inventario y precio de venta de un repuesto según su SKU o código.',
        parameters: {
          type: 'object',
          properties: {
            sku_id: {
              type: 'string',
              description: 'Identificador único UUID del SKU si se conoce',
            },
            sku_interno: {
              type: 'string',
              description: 'Código interno de la pieza (ej: TOY-PAS-001)',
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'crear_orden_pendiente',
        description:
          'Crea un pedido o orden de venta en estado PENDIENTE cuando el cliente confirma su compra y proporciona sus datos.',
        parameters: {
          type: 'object',
          properties: {
            nombre_cliente: {
              type: 'string',
              description: 'Nombre completo del cliente',
            },
            telefono_cliente: {
              type: 'string',
              description: 'Número de teléfono o WhatsApp del cliente',
            },
            direccion_entrega: {
              type: 'string',
              description: 'Dirección o ciudad de entrega',
            },
            tipo_entrega: {
              type: 'string',
              enum: ['retiro', 'delivery', 'encomienda'],
              description: 'Método de recepción de la mercancía',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sku_id: { type: 'string' },
                  cantidad: { type: 'number' },
                  precio_unitario: { type: 'number' },
                },
                required: ['sku_id', 'cantidad'],
              },
              description: 'Lista de repuestos que el cliente desea comprar',
            },
          },
          required: ['nombre_cliente', 'telefono_cliente', 'items', 'tipo_entrega'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'escalar_a_humano',
        description:
          'Transfiere la conversación a un asesor comercial humano cuando el cliente lo solicita o surgen casos complejos fuera del catálogo.',
        parameters: {
          type: 'object',
          properties: {
            motivo: {
              type: 'string',
              description: 'Razón de la transferencia a un asesor humano',
            },
          },
          required: ['motivo'],
        },
      },
    },
  ];

  constructor(
    @InjectRepository(Conversacion)
    private readonly convRepository: Repository<Conversacion>,
    @InjectRepository(Mensaje)
    private readonly mensajeRepository: Repository<Mensaje>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Compatibilidad)
    private readonly compatRepository: Repository<Compatibilidad>,
    private readonly ordenService: OrdenService,
    private readonly deepSeekService: DeepSeekService,
    private readonly mailService: MailService,
    private readonly baileysService: BaileysService,
  ) {}

  private isProcessingOutbox = false;

  onModuleInit() {
    this.logger.log('Conectando listeners de WhatsApp (mensajes, cola de salida y receipts)...');

    // 1. Recepción de mensajes entrantes (en vivo y acumulados offline)
    this.baileysService.onMessage(async (msg) => {
      await this.handleIncomingWhatsappMessage(msg);
    });

    // 2. Verificación de entrega y lectura (Receipts de WhatsApp)
    this.baileysService.onMessageStatusUpdate(async (idWhatsapp, status) => {
      // 2: SERVER_ACK, 3: DELIVERY_ACK (entregado), 4: READ (leído)
      let nuevoEstado: string | null = null;
      if (status === 3) nuevoEstado = 'entregado';
      if (status === 4) nuevoEstado = 'leido';

      if (nuevoEstado) {
        await this.mensajeRepository.update(
          { id_whatsapp: idWhatsapp },
          { estado_envio: nuevoEstado },
        );
        this.logger.debug(`[Receipts] Mensaje WA ${idWhatsapp} actualizado a '${nuevoEstado}'`);
      }
    });

    // 3. Al reconectar WhatsApp, vaciar inmediatamente la cola outbox
    this.baileysService.onConnected(async () => {
      this.logger.log('[Outbox] WhatsApp conectado. Despachando mensajes pendientes en cola...');
      await this.procesarColaSalida();
    });

    // 4. Barrido periódico de seguridad cada 45s para mensajes pendientes
    setInterval(() => {
      if (this.baileysService.isConnected()) {
        this.procesarColaSalida().catch(() => {});
      }
    }, 45000);
  }

  /**
   * Encola un mensaje para ser enviado a través de WhatsApp.
   * Si WhatsApp está conectado, se despacha inmediatamente;
   * si está desconectado, queda en BD con estado_envio = 'pendiente'
   * y se enviará automáticamente tan pronto se restablezca la conexión.
   */
  async encolarMensajeSalida(
    conversacionId: string,
    rol: MessageRole,
    contenido: string,
  ): Promise<Mensaje> {
    const msg = await this.guardarMensaje(
      conversacionId,
      rol,
      contenido,
      undefined,
      'pendiente',
    );

    // Intentar despachar inmediatamente en segundo plano
    this.procesarColaSalida().catch((err) => {
      this.logger.error(`Error procesando cola de salida: ${err?.message}`);
    });

    return msg;
  }

  /**
   * Despachador de la cola de mensajes pendientes (FIFO)
   */
  async procesarColaSalida(): Promise<void> {
    if (this.isProcessingOutbox) {
      return;
    }

    if (!this.baileysService.isConnected()) {
      const pendingCount = await this.mensajeRepository.count({
        where: { estado_envio: 'pendiente' },
      });
      if (pendingCount > 0) {
        this.logger.log(
          `[Outbox] WhatsApp no conectado. ${pendingCount} mensaje(s) retenidos en estado 'pendiente'.`,
        );
      }
      return;
    }

    this.isProcessingOutbox = true;

    try {
      // Buscar mensajes pendientes ordenados cronológicamente
      const pendientes = await this.mensajeRepository.find({
        where: { estado_envio: 'pendiente' },
        order: { timestamp: 'ASC' },
        take: 20,
      });

      if (pendientes.length === 0) {
        return;
      }

      this.logger.log(
        `[Outbox] Despachando ${pendientes.length} mensaje(s) pendientes de entrega...`,
      );

      for (const msg of pendientes) {
        if (!this.baileysService.isConnected()) {
          this.logger.warn('[Outbox] Conexión interrumpida durante el despacho. Pausando cola.');
          break;
        }

        const conv = await this.convRepository.findOne({
          where: { id: msg.conversacion_id },
        });

        if (!conv) {
          await this.mensajeRepository.update(msg.id, {
            estado_envio: 'fallido',
            error_envio: 'Conversación asociada no encontrada',
          });
          continue;
        }

        const target = conv.jid || conv.telefono;
        const res = await this.baileysService.enviarMensajeTextoDetallado(target, msg.contenido);

        if (res.success) {
          await this.mensajeRepository.update(msg.id, {
            estado_envio: 'enviado',
            id_whatsapp: res.messageId || null,
            error_envio: null,
          });
          this.logger.log(
            `[Outbox] Mensaje ${msg.id} enviado exitosamente (ID WA: ${res.messageId})`,
          );
        } else {
          const nuevosIntentos = (msg.intentos_envio || 0) + 1;
          const esDefinitivo = nuevosIntentos >= 5;
          await this.mensajeRepository.update(msg.id, {
            intentos_envio: nuevosIntentos,
            estado_envio: esDefinitivo ? 'fallido' : 'pendiente',
            error_envio: res.error || 'Error al enviar por WhatsApp',
          });
          this.logger.warn(
            `[Outbox] Falló envío mensaje ${msg.id} (intento ${nuevosIntentos}/5): ${res.error}`,
          );
        }

        // Breve pausa para cumplir con rate-limits y evitar baneo de WhatsApp
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } finally {
      this.isProcessingOutbox = false;
    }
  }

  /**
   * Procesa mensajes entrantes capturados por Baileys (en vivo y acumulados offline)
   */
  async handleIncomingWhatsappMessage(payload: IncomingMessagePayload) {
    try {
      // 1. Deduplicación por id_whatsapp para evitar reprocesar mensajes al sincronizar historial
      if (payload.id) {
        const existe = await this.mensajeRepository.findOne({
          where: { id_whatsapp: payload.id },
        });
        if (existe) {
          this.logger.debug(`[Deduplicación] Mensaje ${payload.id} ya existe en BD. Omitiendo duplicado.`);
          return;
        }
      }

      const conv = await this.findOrCreateConversacion(payload.jid, payload.telefono);

      // 2. Guardar mensaje del usuario (garantizando orden cronológico no futuro)
      const safeDate =
        payload.timestamp && payload.timestamp.getTime() <= Date.now()
          ? payload.timestamp
          : new Date();

      await this.mensajeRepository.save(
        this.mensajeRepository.create({
          conversacion_id: conv.id,
          rol: MessageRole.USER,
          contenido: payload.texto,
          id_whatsapp: payload.id,
          estado_envio: 'entregado',
          timestamp: safeDate,
        }),
      );

      await this.convRepository.update(conv.id, { updated_at: new Date() });

      // Si está en control humano, no responder con el bot
      if (conv.estado === ConversationStatus.HUMANO) {
        this.logger.log(
          `Conversación [${payload.telefono}] está en modo HUMANO. Esperando respuesta manual.`,
        );
        return;
      }

      // Si estaba cerrada, reactivarla en modo bot
      if (conv.estado === ConversationStatus.CERRADA) {
        conv.estado = ConversationStatus.BOT;
        await this.convRepository.save(conv);
      }

      // 3. Evaluar si debe responder el bot:
      // Si es una sincronización histórica de un mensaje muy antiguo (ej: más de 24 horas),
      // solo se archiva en la conversación y no se dispara respuesta tardía no deseada.
      const hace24Horas = Date.now() - 24 * 60 * 60 * 1000;
      if (payload.timestamp && payload.timestamp.getTime() < hace24Horas) {
        this.logger.log(
          `Mensaje offline recibido es anterior a 24h (${payload.timestamp.toISOString()}). Registrado en historial sin disparar bot.`,
        );
        return;
      }

      // 4. Procesar respuesta mediante DeepSeek o Asistente Heurístico
      const botResponse = await this.generarRespuestaBot(conv, payload.texto);

      if (botResponse && botResponse.trim()) {
        // Encolar respuesta del bot en la cola outbox segura
        await this.encolarMensajeSalida(conv.id, MessageRole.BOT, botResponse);
      }
    } catch (error: any) {
      this.logger.error(
        `Error procesando mensaje de WhatsApp de ${payload.telefono}: ${error?.message || error}`,
      );
    }
  }

  /**
   * Busca o crea la conversación asociada a un número de teléfono y JID
   */
  async findOrCreateConversacion(
    jid: string,
    telefono: string,
  ): Promise<Conversacion> {
    const cleanPhone = telefono.replace(/\D/g, '');
    let conv = await this.convRepository.findOne({
      where: [{ jid: jid }, { telefono: cleanPhone, canal: Channel.WHATSAPP }],
      relations: ['cliente', 'orden'],
    });

    if (!conv) {
      // Buscar si existe un cliente con este teléfono
      let cliente = await this.clienteRepository.findOne({
        where: { telefono: ILike(`%${cleanPhone.slice(-8)}%`) },
      });

      if (!cliente) {
        // Crear cliente preliminar
        cliente = this.clienteRepository.create({
          nombre: `Cliente WA ${cleanPhone.slice(-4)}`,
          telefono: cleanPhone,
        });
        await this.clienteRepository.save(cliente);
      }

      conv = this.convRepository.create({
        canal: Channel.WHATSAPP,
        telefono: cleanPhone,
        jid,
        estado: ConversationStatus.BOT,
        cliente_id: cliente.id,
      });

      await this.convRepository.save(conv);
    } else {
      let needsSave = false;
      if (!conv.jid || conv.jid !== jid) {
        conv.jid = jid;
        needsSave = true;
      }
      if (
        cleanPhone &&
        cleanPhone !== conv.telefono &&
        !conv.telefono.includes(cleanPhone)
      ) {
        conv.telefono = cleanPhone;
        needsSave = true;
      }
      if (needsSave) {
        await this.convRepository.save(conv);
      }
    }

    return conv;
  }


  async guardarMensaje(
    conversacionId: string,
    rol: MessageRole,
    contenido: string,
    idWhatsapp?: string | null,
    estadoEnvio: string = 'enviado',
  ): Promise<Mensaje> {
    const msg = this.mensajeRepository.create({
      conversacion_id: conversacionId,
      rol,
      contenido,
      id_whatsapp: idWhatsapp || null,
      estado_envio: estadoEnvio,
    });
    const saved = await this.mensajeRepository.save(msg);

    // Actualizar updated_at de la conversación
    await this.convRepository.update(conversacionId, {
      updated_at: new Date(),
    });

    return saved;
  }

  /**
   * Genera la respuesta del Bot utilizando DeepSeek con Tool Calling o motor heurístico
   */
  private async generarRespuestaBot(
    conv: Conversacion,
    ultimoMensaje: string,
  ): Promise<string> {
    // 1. Obtener historial reciente de mensajes (los más recientes primero y luego orden cronológico)
    const historialRaw = await this.mensajeRepository.find({
      where: { conversacion_id: conv.id },
      order: { timestamp: 'DESC' },
      take: 8,
    });
    const historial = historialRaw.reverse();

    // 2. Si DeepSeek está configurado, usar Function Calling nativo
    if (this.deepSeekService.isReady()) {
      try {
        const systemPrompt = `Eres el asistente virtual oficial de "Tokugawa Spare Parts", una prestigiosa tienda de repuestos y autopartes para vehículos japoneses (Toyota, Nissan, Mitsubishi, Honda, Mazda, etc.) en Venezuela.
Tu objetivo es ayudar al cliente a encontrar repuestos, verificar disponibilidad y precio, y tomar sus datos para generar una orden de compra pendiente.
Normas clave:
1. Sé amable, conciso, técnico y servicial. Usa emojis moderados (🚗, ⚙️, 📦).
2. Para consultas de repuestos, usa la herramienta "buscar_repuesto" o "consultar_disponibilidad".
3. NUNCA confirmes pagos automáticamente ni solicites datos bancarios sensibles. Explica que la orden queda registrada en estado pendiente y un asesor humano validará el pago.
4. Para generar una orden, recopila: Nombre completo, Teléfono, Tipo de entrega (retiro en tienda, delivery o encomienda nacional) y Dirección. Una vez confirmados los productos, usa "crear_orden_pendiente".
5. Si el cliente pide hablar con una persona o tiene un problema no resuelto, usa "escalar_a_humano".`;

        const messages: any[] = [{ role: 'system', content: systemPrompt }];

        for (const m of historial) {
          // Omitir si es exactamente el último mensaje que se va a procesar ahora
          if (m.rol === MessageRole.USER && m.contenido === ultimoMensaje) {
            continue;
          }
          messages.push({
            role: m.rol === MessageRole.USER ? 'user' : 'assistant',
            content: m.contenido,
          });
        }

        // Siempre garantizar que el último mensaje sea la consulta del usuario
        messages.push({
          role: 'user',
          content: ultimoMensaje,
        });

        let currentCompletion = await this.deepSeekService.chatCompletion({
          messages,
          tools: this.botTools,
          tool_choice: 'auto',
          temperature: 0.3,
        });

        let iterations = 0;
        const maxToolIterations = 3;

        while (
          currentCompletion?.tool_calls &&
          currentCompletion.tool_calls.length > 0 &&
          iterations < maxToolIterations
        ) {
          iterations++;
          const toolCall = currentCompletion.tool_calls[0] as any;
          const name = toolCall.function?.name;
          let args: any = {};
          try {
            args = JSON.parse(toolCall.function?.arguments || '{}');
          } catch {
            args = {};
          }

          this.logger.log(
            `DeepSeek invocó tool [iteración ${iterations}]: ${name} con args: ${JSON.stringify(args)}`,
          );

          const toolResult = await this.ejecutarTool(name, args, conv);

          messages.push({
            role: 'assistant',
            content: currentCompletion.content || '',
            tool_calls: currentCompletion.tool_calls,
            ...((currentCompletion as any).reasoning_content
              ? { reasoning_content: (currentCompletion as any).reasoning_content }
              : {}),
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });

          const isLast = iterations >= maxToolIterations;
          currentCompletion = await this.deepSeekService.chatCompletion({
            messages,
            ...(isLast ? { tool_choice: 'none' } : { tools: this.botTools }),
            temperature: 0.3,
          });
        }

        let responseContent = currentCompletion?.content || '';

        // Si quedó vacío tras ejecutar herramientas, solicitar redacción final sin herramientas
        if (!responseContent.trim()) {
          const finalTurn = await this.deepSeekService.chatCompletion({
            messages,
            tool_choice: 'none',
            temperature: 0.3,
          });
          responseContent = finalTurn?.content || responseContent;
        }

        // Sanitizar cualquier token especial residual
        responseContent = responseContent
          .replace(/<｜｜DSML｜｜[\s\S]*?<\/｜｜DSML｜｜tool_calls>/g, '')
          .replace(/<｜｜.*?｜｜>/g, '')
          .trim();

        if (responseContent) {
          return responseContent;
        }
      } catch (err: any) {
        this.logger.warn(
          `Fallo en DeepSeek chatCompletion, recurriendo a motor local: ${err?.message}`,
        );
      }
    }

    // 3. Motor Heurístico Asistido (Fallback de Alta Disponibilidad)
    return await this.motorHeuristico(conv, ultimoMensaje);
  }

  /**
   * Ejecutor de herramientas (Function Calling)
   */
  private async ejecutarTool(
    name: string,
    args: any,
    conv: Conversacion,
  ): Promise<any> {
    if (name === 'buscar_repuesto') {
      const q = (args.query || args.producto || '').trim();
      const cleanTerm = (t: string) =>
        t
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, ' ')
          .trim();

      const words = cleanTerm(q)
        .split(/\s+/)
        .map((w) => (w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w))
        .filter((w) => w.length >= 3);

      const qb = this.skuRepository
        .createQueryBuilder('s')
        .leftJoin('s.compatibilidades', 'c')
        .where('s.activo = true');

      if (words.length > 0) {
        words.forEach((word, idx) => {
          qb.andWhere(
            `(TRANSLATE(LOWER(s.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou') LIKE :w${idx} OR LOWER(s.sku_interno) LIKE :w${idx} OR LOWER(s.marca) LIKE :w${idx} OR LOWER(c.modelo) LIKE :w${idx} OR LOWER(c.marca_vehiculo) LIKE :w${idx})`,
            { [`w${idx}`]: `%${word}%` },
          );
        });
      }

      let skus = await qb.take(5).getMany();

      // Si no hubo resultados con todas las palabras, intentar búsqueda más amplia con coincidencia en cualquiera
      if (skus.length === 0 && words.length > 1) {
        const fallbackQb = this.skuRepository
          .createQueryBuilder('s')
          .leftJoin('s.compatibilidades', 'c')
          .where('s.activo = true');

        const orClauses = words.map(
          (_, idx) =>
            `(TRANSLATE(LOWER(s.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouaeiou') LIKE :ow${idx} OR LOWER(s.sku_interno) LIKE :ow${idx} OR LOWER(s.marca) LIKE :ow${idx})`,
        );
        fallbackQb.andWhere(`(${orClauses.join(' OR ')})`, words.reduce((acc, w, i) => ({ ...acc, [`ow${i}`]: `%${w}%` }), {}));
        skus = await fallbackQb.take(5).getMany();
      }

      return {
        encontrados: skus.map((s) => ({
          id: s.id,
          sku_interno: s.sku_interno,
          nombre: s.nombre,
          marca: s.marca,
          precio: Number(s.precio_base),
          stock_actual: s.stock_actual,
          disponible: s.stock_actual > 0,
        })),
      };
    }

    if (name === 'consultar_disponibilidad') {
      let sku: Sku | null = null;
      if (args.sku_id) {
        sku = await this.skuRepository.findOne({ where: { id: args.sku_id } });
      } else if (args.sku_interno) {
        sku = await this.skuRepository.findOne({ where: { sku_interno: args.sku_interno } });
      } else if (args.producto || args.query) {
        const searchRes = await this.ejecutarTool(
          'buscar_repuesto',
          { query: args.producto || args.query, marca_vehiculo: args.marca_vehiculo, modelo: args.modelo },
          conv,
        );
        if (searchRes.encontrados?.length > 0) {
          const first = searchRes.encontrados[0];
          sku = await this.skuRepository.findOne({ where: { id: first.id } });
        }
      }

      if (!sku) {
        return { encontrado: false, mensaje: 'Repuesto no encontrado en catálogo' };
      }

      return {
        encontrado: true,
        sku_id: sku.id,
        sku_interno: sku.sku_interno,
        nombre: sku.nombre,
        precio: Number(sku.precio_base),
        stock: sku.stock_actual,
        disponible: sku.stock_actual > 0,
      };
    }

    if (name === 'crear_orden_pendiente') {
      try {
        const dto: CreateOrdenDto = {
          canal: Channel.WHATSAPP,
          cliente_nuevo: {
            nombre: args.nombre_cliente,
            telefono: args.telefono_cliente || conv.telefono,
            direccion: args.direccion_entrega || '',
          },
          tipo_entrega:
            args.tipo_entrega === 'delivery'
              ? DeliveryType.DELIVERY
              : args.tipo_entrega === 'encomienda'
                ? DeliveryType.ENCOMIENDA
                : DeliveryType.RETIRO,
          direccion_entrega: args.direccion_entrega || 'N/A',
          metodo_pago: 'WhatsApp (Por Confirmar)',
          estado_pago: PaymentStatus.PENDIENTE,
          items: args.items.map((it: any) => ({
            sku_id: it.sku_id,
            cantidad: Number(it.cantidad) || 1,
            precio_unitario: Number(it.precio_unitario) || 10,
          })),
        };

        const orden = await this.ordenService.create(dto);

        // Asociar la orden a la conversación
        await this.convRepository.update(conv.id, { orden_id: orden.id });

        // Enviar alerta al equipo por correo
        await this.mailService.sendWhatsappEscalationAlert(
          'ventas@tokugawaspareparts.com',
          conv.telefono,
          `Nueva Orden WhatsApp generada (#${orden.numero_orden}) por $${Number(orden.total).toFixed(2)}`,
          `Cliente: ${args.nombre_cliente}`,
        );

        return {
          exito: true,
          numero_orden: orden.numero_orden,
          total: Number(orden.total),
          estado: orden.estado,
          mensaje:
            'Orden creada con éxito. Indicar datos de pago móvil y cuenta bancaria al cliente.',
        };
      } catch (e: any) {
        return {
          exito: false,
          error: e.message || 'Error al generar la orden',
        };
      }
    }

    if (name === 'escalar_a_humano') {
      conv.estado = ConversationStatus.HUMANO;
      await this.convRepository.save(conv);

      await this.mailService.sendWhatsappEscalationAlert(
        'soporte@tokugawaspareparts.com',
        conv.telefono,
        args.motivo || 'Solicitud de atención humana',
      );

      return {
        escalado: true,
        mensaje: 'La conversación ha sido transferida exitosamente a un asesor humano.',
      };
    }

    return { error: 'Herramienta no implementada' };
  }

  /**
   * Motor heurístico en caso de no tener API key activa de DeepSeek
   */
  private async motorHeuristico(
    conv: Conversacion,
    mensaje: string,
  ): Promise<string> {
    const texto = mensaje.toLowerCase().trim();

    // 1. Solicitud de humano
    if (
      texto.includes('humano') ||
      texto.includes('asesor') ||
      texto.includes('persona') ||
      texto.includes('hablar con alguien')
    ) {
      conv.estado = ConversationStatus.HUMANO;
      await this.convRepository.save(conv);
      await this.mailService.sendWhatsappEscalationAlert(
        'soporte@tokugawaspareparts.com',
        conv.telefono,
        'Cliente solicitó hablar con un asesor humano',
        mensaje,
      );
      return 'Entendido. He transferido esta conversación a uno de nuestros asesores de ventas humanos 👨‍🔧. En breve se comunicarán contigo por este medio.';
    }

    // 2. Saludos
    if (
      texto === 'hola' ||
      texto === 'buenas' ||
      texto.startsWith('buen dia') ||
      texto.startsWith('buenas tardes') ||
      texto.startsWith('buenas noches')
    ) {
      return `¡Hola! Bienvenido a *Tokugawa Spare Parts* 🚗⚙️. Tu tienda de repuestos de confianza.\n\n¿Qué repuesto necesitas el día de hoy? Puedes indicarme el nombre de la pieza y para qué vehículo (marca, modelo y año) lo buscas.`;
    }

    // 3. Búsqueda en el catálogo
    const skus = await this.skuRepository
      .createQueryBuilder('s')
      .where('s.activo = true')
      .andWhere(
        '(:q ILIKE ANY(STRING_TO_ARRAY(LOWER(s.nombre), \' \')) OR LOWER(s.nombre) LIKE :term OR LOWER(s.marca) LIKE :term OR LOWER(s.sku_interno) LIKE :term)',
        { q: texto, term: `%${texto}%` },
      )
      .take(4)
      .getMany();

    if (skus.length > 0) {
      const lista = skus
        .map(
          (s) =>
            `• *${s.nombre}* (${s.marca})\n  Código: \`${s.sku_interno}\`\n  Precio: *$${Number(s.precio_base).toFixed(2)}*\n  Stock: ${s.stock_actual > 0 ? `✅ ${s.stock_actual} disp.` : '❌ Agotado'}`,
        )
        .join('\n\n');

      return `He encontrado las siguientes opciones en nuestro inventario 📦:\n\n${lista}\n\nSi deseas adquirir alguna pieza, indícame tu nombre completo y dirección para preparar tu orden de despacho.`;
    }

    // 4. Default orientativo
    return `Gracias por contactar a *Tokugawa Spare Parts* 🇯🇵.\n\nPara consultar disponibilidad y precio, por favor indícame:\n1. Nombre del repuesto (ej: pastillas, amortiguador, filtro)\n2. Marca y modelo del vehículo (ej: Toyota Corolla 2012)\n\nTambién puedes escribir *"humano"* en cualquier momento para ser atendido por un asesor comercial.`;
  }

  // ==========================================================================
  // Métodos de Gestión y API para el Panel Frontend
  // ==========================================================================

  async listarConversaciones(filtros: {
    estado?: ConversationStatus;
    search?: string;
  }) {
    const qb = this.convRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.cliente', 'cl')
      .leftJoinAndSelect('c.orden', 'o')
      .orderBy('c.updated_at', 'DESC');

    if (filtros.estado) {
      qb.andWhere('c.estado = :estado', { estado: filtros.estado });
    }

    if (filtros.search) {
      qb.andWhere(
        '(c.telefono LIKE :s OR LOWER(cl.nombre) LIKE :s)',
        { s: `%${filtros.search.toLowerCase()}%` },
      );
    }

    const items = await qb.take(50).getMany();

    // Cargar último mensaje para cada conversación
    const results = await Promise.all(
      items.map(async (conv) => {
        const ultimo = await this.mensajeRepository.findOne({
          where: { conversacion_id: conv.id },
          order: { timestamp: 'DESC' },
        });

        return {
          ...conv,
          ultimo_mensaje: ultimo
            ? {
                id: ultimo.id,
                conversacion_id: ultimo.conversacion_id,
                rol: ultimo.rol,
                contenido: ultimo.contenido,
                timestamp: ultimo.timestamp.toISOString(),
                id_whatsapp: ultimo.id_whatsapp,
                estado_envio: ultimo.estado_envio as any,
                intentos_envio: ultimo.intentos_envio,
                error_envio: ultimo.error_envio,
              }
            : null,
        };
      }),
    );

    return results;
  }

  async obtenerConversacion(id: string) {
    const conv = await this.convRepository.findOne({
      where: { id },
      relations: ['cliente', 'orden', 'orden.detalles', 'orden.detalles.sku'],
    });

    if (!conv) {
      throw new NotFoundException(`Conversación con ID ${id} no encontrada`);
    }

    const mensajes = await this.mensajeRepository.find({
      where: { conversacion_id: id },
      order: { timestamp: 'asc' },
    });

    return {
      ...conv,
      mensajes: mensajes.map((m) => ({
        id: m.id,
        conversacion_id: m.conversacion_id,
        rol: m.rol,
        contenido: m.contenido,
        timestamp: m.timestamp.toISOString(),
        id_whatsapp: m.id_whatsapp,
        estado_envio: m.estado_envio as any,
        intentos_envio: m.intentos_envio,
        error_envio: m.error_envio,
      })),
    };
  }

  /**
   * Un agente humano responde desde el panel al cliente por WhatsApp.
   * El mensaje ingresa a la cola outbox con estado 'pendiente' y se envía
   * de inmediato si WhatsApp está conectado, o al reconectar.
   */
  async enviarMensajeManual(
    conversacionId: string,
    contenido: string,
    usuarioId?: string,
  ) {
    const conv = await this.convRepository.findOne({
      where: { id: conversacionId },
    });

    if (!conv) {
      throw new NotFoundException(`Conversación con ID ${conversacionId} no encontrada`);
    }

    // Encolar mensaje con rol HUMANO en la cola outbox segura
    const nuevoMensaje = await this.encolarMensajeSalida(
      conversacionId,
      MessageRole.HUMANO,
      contenido,
    );

    return {
      id: nuevoMensaje.id,
      conversacion_id: nuevoMensaje.conversacion_id,
      rol: nuevoMensaje.rol,
      contenido: nuevoMensaje.contenido,
      timestamp: nuevoMensaje.timestamp.toISOString(),
      estado_envio: nuevoMensaje.estado_envio,
      id_whatsapp: nuevoMensaje.id_whatsapp,
    };
  }

  /**
   * Cambia el estado de la conversación (bot, humano, cerrada)
   */
  async cambiarEstado(conversacionId: string, nuevoEstado: ConversationStatus) {
    const conv = await this.convRepository.findOne({
      where: { id: conversacionId },
    });

    if (!conv) {
      throw new NotFoundException(`Conversación con ID ${conversacionId} no encontrada`);
    }

    conv.estado = nuevoEstado;
    await this.convRepository.save(conv);

    return {
      success: true,
      conversacion_id: conv.id,
      estado: conv.estado,
    };
  }
}
