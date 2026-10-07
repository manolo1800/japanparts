import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Usuario } from '../../entities/usuario.entity';
import { CuentaCanal } from '../../entities/cuenta-canal.entity';
import { executeSeed } from './seed-core';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(CuentaCanal)
    private readonly cuentaRepo: Repository<CuentaCanal>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const autoSeed = this.configService.get<string>('AUTO_SEED') !== 'false';
    if (!autoSeed) {
      this.logger.log('ℹ️ AUTO_SEED desactivado por configuración de entorno.');
      return;
    }

    try {
      this.logger.log('🌱 Ejecutando inicialización y verificación de seed en deploy/arranque...');
      await executeSeed(this.usuarioRepo, this.cuentaRepo, this.logger);
    } catch (err: any) {
      this.logger.error('❌ Error al ejecutar el seed automático en bootstrap:', err);
    }
  }

  async runManualSeed() {
    return executeSeed(this.usuarioRepo, this.cuentaRepo, this.logger);
  }
}
