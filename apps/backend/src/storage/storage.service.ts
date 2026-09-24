import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as fs from 'fs';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const rawEndpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'minio';
    const isDocker = fs.existsSync('/.dockerenv') || process.env.IS_DOCKER === 'true';
    const endPoint = isDocker ? rawEndpoint : (rawEndpoint === 'minio' ? 'localhost' : rawEndpoint);
    const port = parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ROOT_USER') || 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_ROOT_PASSWORD') || 'minioadmin';

    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'japonparts';

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`✅ MinIO Bucket '${this.bucket}' creado exitosamente.`);
      } else {
        this.logger.log(`ℹ️ MinIO Bucket '${this.bucket}' disponible.`);
      }
    } catch (error) {
      this.logger.warn(`MinIO connection check: ${error.message}`);
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ filename: string; url: string }> {
    const timestamp = Date.now();
    const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectName = `facturas/${timestamp}-${cleanName}`;

    try {
      await this.minioClient.putObject(
        this.bucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        { 'Content-Type': mimeType },
      );

      const url = `/storage/${objectName}`;
      return { filename: objectName, url };
    } catch (error) {
      this.logger.error(`Error al subir a MinIO: ${error.message}`);
      // Fallback local storage si MinIO no responde
      const fallbackDir = '/tmp/japonparts_uploads';
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      fs.writeFileSync(`${fallbackDir}/${cleanName}`, fileBuffer);
      return {
        filename: cleanName,
        url: `/storage/local/${cleanName}`,
      };
    }
  }

  async getFileBuffer(objectName: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(this.bucket, objectName);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
