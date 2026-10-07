import AppDataSource from '../data-source';
import { Usuario } from '../../entities/usuario.entity';
import { CuentaCanal } from '../../entities/cuenta-canal.entity';
import { executeSeed } from './seed-core';

async function runCliSeed() {
  console.log('🌱 Starting database seed CLI...');
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const cuentaRepo = AppDataSource.getRepository(CuentaCanal);

    await executeSeed(usuarioRepo, cuentaRepo, console);
    console.log('✅ Database seed finished successfully!');
  } catch (error) {
    console.error('❌ Database seed failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runCliSeed();
