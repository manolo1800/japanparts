import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationsAndMessagesSchema1700000000003
  implements MigrationInterface
{
  name = 'ConversationsAndMessagesSchema1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tipos ENUM de Fase 4
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "conversation_status_enum" AS ENUM ('bot', 'humano', 'cerrada');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "message_role_enum" AS ENUM ('user', 'bot', 'assistant', 'system', 'humano');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Tabla conversacion
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversacion" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "canal" "channel_enum" NOT NULL DEFAULT 'whatsapp',
        "cuenta_id" uuid,
        "cliente_id" uuid,
        "telefono" varchar(50) NOT NULL,
        "estado" "conversation_status_enum" NOT NULL DEFAULT 'bot',
        "orden_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_conversacion_cuenta" FOREIGN KEY ("cuenta_id") REFERENCES "cuenta_canal"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_conversacion_cliente" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_conversacion_orden" FOREIGN KEY ("orden_id") REFERENCES "orden"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_conversacion_telefono" ON "conversacion"("telefono");
      CREATE INDEX IF NOT EXISTS "idx_conversacion_estado" ON "conversacion"("estado");
    `);

    // 3. Tabla mensaje
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mensaje" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversacion_id" uuid NOT NULL,
        "rol" "message_role_enum" NOT NULL DEFAULT 'user',
        "contenido" text NOT NULL,
        "timestamp" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_mensaje_conversacion" FOREIGN KEY ("conversacion_id") REFERENCES "conversacion"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_mensaje_conversacion" ON "mensaje"("conversacion_id");
      CREATE INDEX IF NOT EXISTS "idx_mensaje_timestamp" ON "mensaje"("timestamp");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mensaje";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversacion";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_role_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "conversation_status_enum";`);
  }
}
