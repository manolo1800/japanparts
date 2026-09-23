import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCoreSchema1700000000000 implements MigrationInterface {
  name = 'InitialCoreSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Activar extensión uuid-ossp o pgcrypto si no existen
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 1. Tipos ENUM
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role_enum" AS ENUM ('admin', 'vendedor', 'bodega');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "movement_type_enum" AS ENUM ('entrada', 'salida', 'ajuste');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "channel_type_enum" AS ENUM ('ml', 'whatsapp');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "channel_enum" AS ENUM ('ml', 'whatsapp', 'mostrador');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Tabla usuario
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "usuario" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "nombre" varchar(150) NOT NULL,
        "email" varchar(150) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "rol" "user_role_enum" NOT NULL DEFAULT 'vendedor',
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 3. Tabla sku
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sku" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sku_interno" varchar(100) NOT NULL UNIQUE,
        "nombre" varchar(255) NOT NULL,
        "marca" varchar(100) NOT NULL,
        "codigo_fabricante" varchar(100),
        "descripcion" text,
        "costo_promedio" numeric(12,2) NOT NULL DEFAULT 0,
        "precio_base" numeric(12,2) NOT NULL DEFAULT 0,
        "stock_actual" int NOT NULL DEFAULT 0,
        "stock_minimo" int NOT NULL DEFAULT 0,
        "ubicacion" varchar(100),
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 4. Tabla compatibilidad
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "compatibilidad" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sku_id" uuid NOT NULL,
        "marca_vehiculo" varchar(100) NOT NULL,
        "modelo" varchar(100) NOT NULL,
        "anio_desde" int NOT NULL,
        "anio_hasta" int,
        "motor" varchar(100),
        "notas" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_compatibilidad_sku" FOREIGN KEY ("sku_id") REFERENCES "sku" ("id") ON DELETE CASCADE
      );
    `);

    // 5. Tabla cuenta_canal
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cuenta_canal" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tipo" "channel_type_enum" NOT NULL,
        "usuario_id" uuid,
        "alias" varchar(150) NOT NULL,
        "credenciales" jsonb NOT NULL DEFAULT '{}',
        "activa" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_cuenta_canal_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL
      );
    `);

    // 6. Tabla publicacion
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "publicacion" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sku_id" uuid NOT NULL,
        "canal" "channel_enum" NOT NULL DEFAULT 'mostrador',
        "cuenta_id" uuid,
        "ml_item_id" varchar(100),
        "titulo" varchar(255) NOT NULL,
        "precio" numeric(12,2) NOT NULL DEFAULT 0,
        "stock_publicado" int NOT NULL DEFAULT 0,
        "estado" varchar(50) NOT NULL DEFAULT 'activa',
        "url" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_publicacion_sku" FOREIGN KEY ("sku_id") REFERENCES "sku" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_publicacion_cuenta" FOREIGN KEY ("cuenta_id") REFERENCES "cuenta_canal" ("id") ON DELETE SET NULL
      );
    `);

    // 7. Tabla movimiento_stock
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "movimiento_stock" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sku_id" uuid NOT NULL,
        "tipo" "movement_type_enum" NOT NULL,
        "cantidad" int NOT NULL,
        "referencia_tipo" varchar(100),
        "referencia_id" varchar(150),
        "usuario_id" uuid,
        "notas" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_movimiento_stock_sku" FOREIGN KEY ("sku_id") REFERENCES "sku" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_movimiento_stock_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL
      );
    `);

    // 8. Índices requeridos
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sku_sku_interno" ON "sku" ("sku_interno");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_publicacion_ml_item_id" ON "publicacion" ("ml_item_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_publicacion_sku_id" ON "publicacion" ("sku_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_movimiento_stock_sku_id" ON "movimiento_stock" ("sku_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_compatibilidad_sku_id" ON "compatibilidad" ("sku_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_compatibilidad_marca_modelo" ON "compatibilidad" ("marca_vehiculo", "modelo");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "movimiento_stock";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "publicacion";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cuenta_canal";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "compatibilidad";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sku";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usuario";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "channel_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "channel_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "movement_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum";`);
  }
}
