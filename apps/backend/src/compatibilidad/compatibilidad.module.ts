import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compatibilidad } from '../entities/compatibilidad.entity';
import { Sku } from '../entities/sku.entity';
import { CompatibilidadService } from './compatibilidad.service';
import { CompatibilidadController } from './compatibilidad.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Compatibilidad, Sku]), AuthModule],
  controllers: [CompatibilidadController],
  providers: [CompatibilidadService],
  exports: [CompatibilidadService],
})
export class CompatibilidadModule {}
