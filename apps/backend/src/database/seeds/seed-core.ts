import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../../entities/usuario.entity';
import { CuentaCanal } from '../../entities/cuenta-canal.entity';
import { UserRole, ChannelType } from '@japonparts/shared';

export interface SeedLogger {
  log: (message: string) => void;
  error?: (message: string, ...optionalParams: any[]) => void;
  warn?: (message: string) => void;
}

export async function executeSeed(
  usuarioRepo: Repository<Usuario>,
  cuentaRepo: Repository<CuentaCanal>,
  logger: SeedLogger = console,
) {
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@tokugawuasp.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'tksp0312$';

  logger.log(`🌱 [SEED] Verificando usuario administrador principal: ${adminEmail}`);

  let adminUser = await usuarioRepo.findOne({ where: { email: adminEmail } });
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  if (!adminUser) {
    adminUser = usuarioRepo.create({
      nombre: 'Administrador Tokugawa',
      email: adminEmail,
      password_hash: passwordHash,
      rol: UserRole.ADMIN,
      activo: true,
    });
    await usuarioRepo.save(adminUser);
    logger.log(`✅ [SEED] Usuario administrador creado con éxito: ${adminEmail}`);
  } else {
    adminUser.nombre = adminUser.nombre || 'Administrador Tokugawa';
    adminUser.password_hash = passwordHash;
    adminUser.rol = UserRole.ADMIN;
    adminUser.activo = true;
    await usuarioRepo.save(adminUser);
    logger.log(`✅ [SEED] Credenciales de administrador actualizadas y verificadas: ${adminEmail}`);
  }

  // 2. Limpieza de usuarios y accesos de prueba obsoletos
  const testEmails = [
    'admin@japonparts.com',
    'vendedor@japonparts.com',
    'bodega@japonparts.com',
  ];

  for (const testEmail of testEmails) {
    if (testEmail === adminEmail) continue;
    try {
      const testUser = await usuarioRepo.findOne({ where: { email: testEmail } });
      if (testUser) {
        // Reasignar cuentas vinculadas al admin para no romper integridad relacional
        await cuentaRepo.update(
          { usuario_id: testUser.id },
          { usuario_id: adminUser.id },
        );

        try {
          await usuarioRepo.remove(testUser);
          logger.log(`🗑️ [SEED] Acceso de prueba eliminado: ${testEmail}`);
        } catch {
          testUser.activo = false;
          await usuarioRepo.save(testUser);
          logger.log(`🔒 [SEED] Acceso de prueba desactivado: ${testEmail}`);
        }
      }
    } catch (e: any) {
      logger.warn?.(`⚠️ [SEED] Advertencia al depurar usuario de prueba ${testEmail}: ${e.message}`);
    }
  }

  // 3. Canales iniciales de comunicación vinculados al administrador
  const canales = [
    {
      alias: 'MercadoLibre Tienda Principal (MLV)',
      tipo: ChannelType.ML,
      usuario_id: adminUser.id,
      credenciales: { client_id: 'MLV_PILOT_APP', seller_id: '123456789' },
    },
    {
      alias: 'WhatsApp Atención Clientes',
      tipo: ChannelType.WHATSAPP,
      usuario_id: adminUser.id,
      credenciales: { phone_number_id: '10987654321', display_phone: '+584120000000' },
    },
  ];

  for (const c of canales) {
    const existing = await cuentaRepo.findOne({ where: { alias: c.alias } });
    if (!existing) {
      const canal = cuentaRepo.create(c);
      await cuentaRepo.save(canal);
      logger.log(`📡 [SEED] Canal creado y vinculado a ${adminEmail}: ${c.alias}`);
    } else if (!existing.usuario_id) {
      existing.usuario_id = adminUser.id;
      await cuentaRepo.save(existing);
      logger.log(`📡 [SEED] Canal actualizado y vinculado a ${adminEmail}: ${c.alias}`);
    }
  }

  logger.log(`✨ [SEED] Seed completado satisfactoriamente.`);
}
