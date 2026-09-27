import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { SessionStorageService } from './session-storage.service';
import makeWASocket, {
  DisconnectReason,
  WASocket,
  WAMessage,
  proto,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import pino from 'pino';
import { Subject, Observable } from 'rxjs';
import {
  WhatsAppConnectionState,
  WhatsAppStatusSummary,
} from '@japonparts/shared';

export interface IncomingMessagePayload {
  id: string;
  jid: string;
  telefono: string;
  texto: string;
  timestamp: Date;
  isOfflineSync?: boolean;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class BaileysService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaileysService.name);
  private sock: WASocket | null = null;
  private status: WhatsAppConnectionState = 'desconectado';
  private qrCode: string | null = null;
  private qrRaw: string | null = null;
  private telefonoVinculado: string | null = null;
  private nombreVinculado: string | null = null;
  private ultimaConexion: string | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  private readonly statusSubject = new Subject<WhatsAppStatusSummary>();
  private messageHandlers: Array<(msg: IncomingMessagePayload) => Promise<void>> = [];
  private statusUpdateHandlers: Array<(idWhatsapp: string, status: number) => Promise<void>> = [];
  private connectedCallbacks: Array<() => Promise<void> | void> = [];

  // Cache para reintentos de desencriptación y deduplicación
  private readonly recentMessagesCache = new Map<string, proto.IMessage>();
  private readonly processedMessageIds = new Set<string>();

  constructor(private readonly sessionStorage: SessionStorageService) {}

  async onModuleInit() {
    this.logger.log('Inicializando servicio Baileys WhatsApp con protocolo resiliente...');
    // Conexión inicial automática
    await this.initSocket();
  }

  async onModuleDestroy() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanupSocket();
  }

  getStatusStream(): Observable<WhatsAppStatusSummary> {
    return this.statusSubject.asObservable();
  }

  getStatus(): WhatsAppStatusSummary {
    return {
      estado: this.status,
      qrCode: this.qrCode,
      telefonoVinculado: this.telefonoVinculado,
      nombreVinculado: this.nombreVinculado,
      ultimaConexion: this.ultimaConexion,
    };
  }

  isConnected(): boolean {
    return this.status === 'conectado' && this.sock !== null;
  }

  getQrCode() {
    return {
      qr: this.qrRaw,
      qrImage: this.qrCode,
      estado: this.status,
    };
  }

  onMessage(handler: (msg: IncomingMessagePayload) => Promise<void>) {
    this.messageHandlers.push(handler);
  }

  onMessageStatusUpdate(handler: (idWhatsapp: string, status: number) => Promise<void>) {
    this.statusUpdateHandlers.push(handler);
  }

  onConnected(callback: () => Promise<void> | void) {
    this.connectedCallbacks.push(callback);
    if (this.isConnected()) {
      try {
        callback();
      } catch (err: any) {
        this.logger.error(`Error en connectedCallback inmediato: ${err?.message}`);
      }
    }
  }

  private notifyStatusChange() {
    this.statusSubject.next(this.getStatus());
  }

  /**
   * Limpia el socket actual y remueve todos los listeners para evitar memory leaks
   */
  private cleanupSocket() {
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.ev.removeAllListeners('messages.update');
        this.sock.ev.removeAllListeners('messaging-history.set');
        this.sock.end(undefined);
      } catch {
        // Ignorar excepciones al cerrar socket
      }
      this.sock = null;
    }
  }

  async initSocket() {
    if (this.isConnecting) {
      this.logger.debug('initSocket omitido: ya existe un intento de conexión en curso.');
      return;
    }

    this.isConnecting = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Limpieza estricta de socket anterior
    this.cleanupSocket();

    try {
      this.status = 'conectando';
      this.notifyStatusChange();

      const { state, saveCreds } = await this.sessionStorage.getAuthState();

      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        syncFullHistory: false,
        browser: ['Japón Parts ERP', 'Chrome', '122.0.0'],
        keepAliveIntervalMs: 15000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        markOnlineOnConnect: true,
        retryRequestDelayMs: 500,
        maxMsgRetryCount: 5,
        getMessage: async (key) => {
          return this.recentMessagesCache.get(key.id || '') || undefined;
        },
      });

      // 1. Manejo de eventos de ciclo de vida de conexión
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRaw = qr;
          try {
            this.qrCode = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              color: {
                dark: '#0A0D14',
                light: '#FFFFFF',
              },
            });
          } catch (err) {
            this.logger.error('Error generando QR data URL', err);
          }
          this.status = 'esperando_qr';
          this.logger.log('Nuevo código QR de WhatsApp generado. Listo para escanear.');
          this.notifyStatusChange();
        }

        if (connection === 'open') {
          this.status = 'conectado';
          this.qrCode = null;
          this.qrRaw = null;
          this.reconnectAttempts = 0;
          this.ultimaConexion = new Date().toISOString();

          const userId = this.sock?.user?.id || '';
          this.telefonoVinculado = userId.split(':')[0] || userId;
          this.nombreVinculado = this.sock?.user?.name || 'Japón Parts';

          this.logger.log(
            `WhatsApp Conectado exitosamente con cuenta: ${this.telefonoVinculado} (${this.nombreVinculado})`,
          );
          this.notifyStatusChange();

          // Notificar a observadores que la conexión está lista (para vaciar cola outbox)
          for (const callback of this.connectedCallbacks) {
            try {
              await callback();
            } catch (err: any) {
              this.logger.error(`Error en connectedCallback: ${err?.message}`);
            }
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          this.logger.warn(
            `Conexión de WhatsApp cerrada. Código: ${statusCode || 'desconocido'}, Deslogueado: ${isLoggedOut}`,
          );

          if (isLoggedOut) {
            this.status = 'desconectado';
            this.qrCode = null;
            this.qrRaw = null;
            this.telefonoVinculado = null;
            await this.sessionStorage.clearSession();
            this.notifyStatusChange();
          } else {
            // Reconexión automática con backoff exponencial inteligente (máximo 30s)
            this.status = 'conectando';
            this.notifyStatusChange();
            const delay = Math.min(2000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 6)), 30000);
            this.reconnectAttempts++;
            this.logger.log(
              `Reconectando WhatsApp en ${Math.round(delay / 1000)}s (intento ${this.reconnectAttempts})...`,
            );
            this.reconnectTimeout = setTimeout(() => {
              this.initSocket();
            }, delay);
          }
        }
      });

      // 2. Persistencia de credenciales
      this.sock.ev.on('creds.update', async () => {
        await saveCreds();
      });

      // 3. Recepción de mensajes entrantes (notify en vivo y append de reconexión offline)
      this.sock.ev.on('messages.upsert', async (upsert) => {
        // Permitir notify (mensajes en tiempo real) y append (mensajes acumulados offline)
        if (upsert.type !== 'notify' && upsert.type !== 'append') return;
        await this.handleIncomingMessages(upsert.messages, upsert.type === 'append');
      });

      // 4. Recepción de sincronización histórica al reconectar
      this.sock.ev.on('messaging-history.set', async ({ messages: msgs }) => {
        if (msgs && msgs.length > 0) {
          this.logger.log(`Sincronización de historial offline recibida: ${msgs.length} mensajes.`);
          await this.handleIncomingMessages(msgs, true);
        }
      });

      // 5. Verificación de entrega y lectura (Receipts)
      this.sock.ev.on('messages.update', async (updates) => {
        for (const { key, update } of updates) {
          if (key.id && update.status !== undefined) {
            for (const handler of this.statusUpdateHandlers) {
              try {
                await handler(key.id, update.status);
              } catch (err: any) {
                this.logger.error(`Error procesando status update de mensaje ${key.id}: ${err?.message}`);
              }
            }
          }
        }
      });
    } catch (error: any) {
      this.logger.error(`Error al inicializar Baileys: ${error?.message || error}`);
      this.status = 'desconectado';
      this.notifyStatusChange();
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Procesa mensajes entrantes con deduplicación y resolución de identificadores
   */
  private async handleIncomingMessages(messages: WAMessage[], isOfflineSync: boolean) {
    // Ordenar cronológicamente para procesar en orden natural
    const sorted = [...messages].sort(
      (a, b) => Number(a.messageTimestamp || 0) - Number(b.messageTimestamp || 0),
    );

    for (const msg of sorted) {
      if (msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.includes('@g.us')) {
        continue;
      }

      const msgId = msg.key.id;
      if (!msgId) continue;

      // Deduplicación rápida en memoria
      if (this.processedMessageIds.has(msgId)) {
        continue;
      }
      this.processedMessageIds.add(msgId);
      if (this.processedMessageIds.size > 5000) {
        // Limitar tamaño del Set
        const first = this.processedMessageIds.values().next().value;
        if (first) this.processedMessageIds.delete(first);
      }

      // Guardar en cache de desencriptación de reintentos
      if (msg.message) {
        this.recentMessagesCache.set(msgId, msg.message);
        if (this.recentMessagesCache.size > 1000) {
          const first = this.recentMessagesCache.keys().next().value;
          if (first) this.recentMessagesCache.delete(first);
        }
      }

      const texto =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      if (!texto.trim()) continue;

      let telefono = remoteJid.replace('@s.whatsapp.net', '');
      if (remoteJid.endsWith('@lid')) {
        const mappedPhone = this.sessionStorage.getPhoneNumberFromLid(remoteJid);
        if (mappedPhone) {
          telefono = mappedPhone;
        } else {
          telefono = remoteJid.replace('@lid', '');
        }
      }

      const rawTimestamp = Number(msg.messageTimestamp || Date.now() / 1000) * 1000;
      const parsedDate = new Date(rawTimestamp);
      // Evitar que discrepancias de zona horaria o reloj del dispositivo del cliente
      // generen timestamps en el futuro que rompan el orden cronológico del chat
      const safeTimestamp = parsedDate.getTime() > Date.now() ? new Date() : parsedDate;

      const payload: IncomingMessagePayload = {
        id: msgId,
        jid: remoteJid,
        telefono,
        texto: texto.trim(),
        timestamp: safeTimestamp,
        isOfflineSync,
      };

      if (isOfflineSync) {
        this.logger.log(`Mensaje recuperado de offline [${remoteJid} -> ${telefono}]: "${texto.slice(0, 50)}"`);
      } else {
        this.logger.log(`Mensaje entrante en vivo [${remoteJid} -> ${telefono}]: "${texto.slice(0, 50)}"`);
      }

      // Notificar a los handlers registrados
      for (const handler of this.messageHandlers) {
        try {
          await handler(payload);
        } catch (err: any) {
          this.logger.error(`Error procesando mensaje entrante con handler: ${err?.message}`);
        }
      }
    }
  }

  /**
   * Envía mensaje de texto devolviendo confirmación con ID de mensaje
   */
  async enviarMensajeTextoDetallado(
    jidOrPhone: string,
    texto: string,
  ): Promise<SendResult> {
    if (!this.sock || this.status !== 'conectado') {
      return {
        success: false,
        error: `WhatsApp no está conectado (estado=${this.status})`,
      };
    }

    try {
      let targetJid = jidOrPhone.trim();
      if (!targetJid.includes('@')) {
        const isLid = this.sessionStorage.getPhoneNumberFromLid(targetJid);
        if (isLid) {
          targetJid = `${targetJid}@lid`;
        } else {
          const cleanPhone = targetJid.replace(/\D/g, '');
          targetJid = `${cleanPhone}@s.whatsapp.net`;
        }
      }

      // Indicador de presencia "escribiendo..." breve
      try {
        await this.sock.sendPresenceUpdate('composing', targetJid);
      } catch {}

      const result = await this.sock.sendMessage(targetJid, { text: texto });
      const messageId = result?.key?.id;

      this.logger.log(`Mensaje enviado exitosamente a ${targetJid} (ID: ${messageId}): "${texto.slice(0, 45)}"`);

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      this.logger.error(`Error enviando mensaje WhatsApp a ${jidOrPhone}: ${error?.message || error}`);
      return {
        success: false,
        error: error?.message || 'Error desconocido al enviar',
      };
    }
  }

  async enviarMensajeTexto(jidOrPhone: string, texto: string): Promise<boolean> {
    const res = await this.enviarMensajeTextoDetallado(jidOrPhone, texto);
    return res.success;
  }

  async enviarDocumento(
    jidOrPhone: string,
    buffer: Buffer,
    fileName: string,
    mimetype: string,
  ): Promise<boolean> {
    if (!this.sock || this.status !== 'conectado') {
      this.logger.warn(`No se puede enviar documento WhatsApp (estado=${this.status})`);
      return false;
    }

    try {
      let targetJid = jidOrPhone.trim();
      if (!targetJid.includes('@')) {
        const isLid = this.sessionStorage.getPhoneNumberFromLid(targetJid);
        if (isLid) {
          targetJid = `${targetJid}@lid`;
        } else {
          const cleanPhone = targetJid.replace(/\D/g, '');
          targetJid = `${cleanPhone}@s.whatsapp.net`;
        }
      }

      await this.sock.sendMessage(targetJid, {
        document: buffer,
        fileName,
        mimetype,
      });
      this.logger.log(`Documento ${fileName} enviado a ${targetJid}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error enviando documento a ${jidOrPhone}: ${error?.message || error}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.logger.log('Desconectando WhatsApp y limpiando sesión...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {
        this.cleanupSocket();
      }
      this.sock = null;
    }

    await this.sessionStorage.clearSession();
    this.status = 'desconectado';
    this.qrCode = null;
    this.qrRaw = null;
    this.telefonoVinculado = null;
    this.notifyStatusChange();
  }

  async forceReconnect(): Promise<void> {
    this.logger.log('Forzando reinicio de conexión WhatsApp...');
    this.cleanupSocket();
    await this.initSocket();
  }
}
