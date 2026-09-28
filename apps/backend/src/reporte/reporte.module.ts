import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReporteService } from './reporte.service';
import { ReporteController } from './reporte.controller';
import {
  Orden,
  OrdenDetalle,
  Sku,
  Usuario,
  Conversacion,
  MovimientoStock,
} from '../entities';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Orden,
      OrdenDetalle,
      Sku,
      Usuario,
      Conversacion,
      MovimientoStock,
    ]),
    AuthModule,
    IntegrationsModule,
  ],
  controllers: [ReporteController],
  providers: [ReporteService],
  exports: [ReporteService],
})
export class ReporteModule {}
