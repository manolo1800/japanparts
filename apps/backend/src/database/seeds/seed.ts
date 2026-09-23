import AppDataSource from '../data-source';
import { Usuario } from '../../entities/usuario.entity';
import { CuentaCanal } from '../../entities/cuenta-canal.entity';
import { UserRole, ChannelType } from '@japonparts/shared';
import * as bcrypt from 'bcryptjs';

async function runSeed() {
  console.log('🌱 Starting database seed...');
  try {
    await AppDataSource.initialize();
    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const cuentaRepo = AppDataSource.getRepository(CuentaCanal);

    // 1. Usuarios por rol
    const usersData = [
      {
        nombre: 'Administrador Principal',
        email: 'admin@japonparts.com',
        password: 'admin',
        rol: UserRole.ADMIN,
      },
      {
        nombre: 'Carlos Vendedor',
        email: 'vendedor@japonparts.com',
        password: 'admin',
        rol: UserRole.VENDEDOR,
      },
      {
        nombre: 'Manuel Bodega',
        email: 'bodega@japonparts.com',
        password: 'admin',
        rol: UserRole.BODEGA,
      },
    ];

    for (const u of usersData) {
      let user = await usuarioRepo.findOne({ where: { email: u.email } });
      const password_hash = await bcrypt.hash(u.password, 10);
      if (!user) {
        user = usuarioRepo.create({
          nombre: u.nombre,
          email: u.email,
          password_hash,
          rol: u.rol,
          activo: true,
        });
        await usuarioRepo.save(user);
        console.log(`👤 User created: ${u.email} (${u.rol})`);
      } else {
        user.password_hash = password_hash;
        await usuarioRepo.save(user);
        console.log(`👤 User updated: ${u.email} (${u.rol})`);
      }
    }

    // 2. Canales iniciales
    const vendedor = await usuarioRepo.findOne({
      where: { email: 'vendedor@japonparts.com' },
    });

    const canales = [
      {
        alias: 'MercadoLibre Tienda Principal (MLV)',
        tipo: ChannelType.ML,
        usuario_id: vendedor?.id || null,
        credenciales: { client_id: 'MLV_PILOT_APP', seller_id: '123456789' },
      },
      {
        alias: 'WhatsApp Atención Clientes',
        tipo: ChannelType.WHATSAPP,
        usuario_id: vendedor?.id || null,
        credenciales: { phone_number_id: '10987654321', display_phone: '+584120000000' },
      },
    ];

    for (const c of canales) {
      const existing = await cuentaRepo.findOne({ where: { alias: c.alias } });
      if (!existing) {
        const canal = cuentaRepo.create(c);
        await cuentaRepo.save(canal);
        console.log(`📡 Channel account created: ${c.alias}`);
      }
    }

    console.log('✅ Seed finished successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runSeed();
