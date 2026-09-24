import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SkuModule } from './sku/sku.module';
import { CompatibilidadModule } from './compatibilidad/compatibilidad.module';
import { PublicacionModule } from './publicacion/publicacion.module';
import { MovimientoStockModule } from './movimiento-stock/movimiento-stock.module';
import { StorageModule } from './storage/storage.module';
import { ProveedorModule } from './proveedor/proveedor.module';
import { CompraModule } from './compra/compra.module';
import { ClienteModule } from './cliente/cliente.module';
import { OrdenModule } from './orden/orden.module';
import {
  Usuario,
  Sku,
  Compatibilidad,
  CuentaCanal,
  Publicacion,
  MovimientoStock,
  Proveedor,
  Compra,
  CompraDetalle,
  PagoCompra,
  Cliente,
  Orden,
  OrdenDetalle,
  DocumentoVenta,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.dev', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const rawHost = config.get<string>('POSTGRES_HOST') || 'localhost';
        const isDocker =
          fs.existsSync('/.dockerenv') || process.env.IS_DOCKER === 'true';
        const host = isDocker
          ? rawHost
          : rawHost === 'postgres'
            ? 'localhost'
            : rawHost;

        return {
          type: 'postgres',
          host,
          port: parseInt(config.get<string>('POSTGRES_PORT') || '5432', 10),
          username: config.get<string>('POSTGRES_USER') || 'postgres',
          password: config.get<string>('POSTGRES_PASSWORD') || 'postgres',
          database: config.get<string>('POSTGRES_DB') || 'japonparts_dev',
          entities: [
            Usuario,
            Sku,
            Compatibilidad,
            CuentaCanal,
            Publicacion,
            MovimientoStock,
            Proveedor,
            Compra,
            CompraDetalle,
            PagoCompra,
            Cliente,
            Orden,
            OrdenDetalle,
            DocumentoVenta,
          ],
          synchronize: false,
          logging: false,
        };
      },
    }),
    HealthModule,
    AuthModule,
    SkuModule,
    CompatibilidadModule,
    PublicacionModule,
    MovimientoStockModule,
    StorageModule,
    ProveedorModule,
    CompraModule,
    ClienteModule,
    OrdenModule,
  ],
})
export class AppModule {}
