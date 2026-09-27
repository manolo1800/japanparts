import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversacion } from '../entities/conversacion.entity';
import { Mensaje } from '../entities/mensaje.entity';
import { Sku } from '../entities/sku.entity';
import { Cliente } from '../entities/cliente.entity';
import { Compatibilidad } from '../entities/compatibilidad.entity';
import { ConversacionService } from './conversacion.service';
import { ConversacionController } from './conversacion.controller';
import { OrdenModule } from '../orden/orden.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversacion,
      Mensaje,
      Sku,
      Cliente,
      Compatibilidad,
    ]),
    OrdenModule,
    IntegrationsModule,
    AuthModule,
  ],
  controllers: [ConversacionController],
  providers: [ConversacionService],
  exports: [ConversacionService],
})
export class ConversacionModule {}
