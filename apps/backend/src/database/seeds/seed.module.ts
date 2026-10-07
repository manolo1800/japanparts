import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../../entities/usuario.entity';
import { CuentaCanal } from '../../entities/cuenta-canal.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, CuentaCanal])],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseSeedModule {}
