import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Usuario } from '../../entities/usuario.entity';
import { CuentaCanal } from '../../entities/cuenta-canal.entity';
import { executeSeed } from './seed-core';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(CuentaCanal)
    private readonly cuentaRepo: Repository<CuentaCanal>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const runMigrations = this.configService.get<string>('RUN_MIGRATIONS') !== 'false';
    if (runMigrations) {
      try {
        this.logger.log('🔄 Verificando y ejecutando migraciones de base de datos...');
        const migrations = await this.dataSource.runMigrations();
        if (migrations.length > 0) {
          this.logger.log(`✅ ${migrations.length} migraciones ejecutadas con éxito:`);
          migrations.forEach((m) => this.logger.log(`   - ${m.name}`));
        } else {
          this.logger.log('ℹ️ No hay migraciones pendientes.');
        }
      } catch (err: any) {
        this.logger.error(`⚠️ Error al ejecutar migraciones en bootstrap: ${err.message}`);
      }
    }

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
