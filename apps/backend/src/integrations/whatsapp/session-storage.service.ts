import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { useMultiFileAuthState } from '@whiskeysockets/baileys';

@Injectable()
export class SessionStorageService {
  private readonly logger = new Logger(SessionStorageService.name);
  private readonly sessionPath: string;

  constructor(private readonly configService: ConfigService) {
    const configuredPath =
      this.configService.get<string>('WHATSAPP_SESSION_PATH') ||
      '/data/whatsapp-sessions';

    // Si estamos corriendo fuera de docker y /data no es escribible, usar ruta local
    let resolvedPath = configuredPath;
    try {
      if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
      }
    } catch {
      resolvedPath = path.resolve(process.cwd(), 'whatsapp-sessions');
      if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
      }
    }

    this.sessionPath = resolvedPath;
    this.logger.log(`Directorio de sesión de WhatsApp establecido en: ${this.sessionPath}`);
  }

  getSessionPath(): string {
    return this.sessionPath;
  }

  async getAuthState() {
    return await useMultiFileAuthState(this.sessionPath);
  }

  hasExistingSession(): boolean {
    try {
      const credsPath = path.join(this.sessionPath, 'creds.json');
      return fs.existsSync(credsPath);
    } catch {
      return false;
    }
  }

  getPhoneNumberFromLid(lid: string): string | null {
    try {
      const cleanLid = lid.replace('@lid', '').replace(/\D/g, '');
      const filePath = path.join(
        this.sessionPath,
        `lid-mapping-${cleanLid}_reverse.json`,
      );
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch {
      // Ignorar si no existe
    }
    return null;
  }


  async clearSession(): Promise<void> {
    try {
      if (fs.existsSync(this.sessionPath)) {
        const files = fs.readdirSync(this.sessionPath);
        for (const file of files) {
          fs.rmSync(path.join(this.sessionPath, file), {
            recursive: true,
            force: true,
          });
        }
        this.logger.log('Archivos de sesión de WhatsApp eliminados con éxito.');
      }
    } catch (error: any) {
      this.logger.error(`Error al limpiar sesión de WhatsApp: ${error?.message || error}`);
    }
  }
}
