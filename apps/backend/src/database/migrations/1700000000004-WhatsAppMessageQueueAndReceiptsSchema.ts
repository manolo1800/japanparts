import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsAppMessageQueueAndReceiptsSchema1700000000004
  implements MigrationInterface
{
  name = 'WhatsAppMessageQueueAndReceiptsSchema1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Asegurar columna jid en conversacion
    await queryRunner.query(`
      ALTER TABLE "conversacion" 
      ADD COLUMN IF NOT EXISTS "jid" varchar(100);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_conversacion_jid" ON "conversacion"("jid");
    `);

    // 2. Nuevos campos en mensaje para cola de salida, verificación de entrega y deduplicación
    await queryRunner.query(`
      ALTER TABLE "mensaje"
      ADD COLUMN IF NOT EXISTS "id_whatsapp" varchar(100),
      ADD COLUMN IF NOT EXISTS "estado_envio" varchar(20) NOT NULL DEFAULT 'enviado',
      ADD COLUMN IF NOT EXISTS "intentos_envio" int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "error_envio" text;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_mensaje_id_whatsapp" ON "mensaje"("id_whatsapp");
      CREATE INDEX IF NOT EXISTS "idx_mensaje_estado_envio" ON "mensaje"("estado_envio");
      CREATE INDEX IF NOT EXISTS "idx_mensaje_cola_salida" ON "mensaje"("estado_envio", "timestamp");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mensaje_cola_salida";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mensaje_estado_envio";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mensaje_id_whatsapp";`);
    await queryRunner.query(`
      ALTER TABLE "mensaje"
      DROP COLUMN IF EXISTS "error_envio",
      DROP COLUMN IF EXISTS "intentos_envio",
      DROP COLUMN IF EXISTS "estado_envio",
      DROP COLUMN IF EXISTS "id_whatsapp";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_conversacion_jid";`);
    await queryRunner.query(`
      ALTER TABLE "conversacion"
      DROP COLUMN IF EXISTS "jid";
    `);
  }
}
