import { MigrationInterface, QueryRunner } from 'typeorm';

export class PurchasesAndProvidersSchema1700000000001 implements MigrationInterface {
  name = 'PurchasesAndProvidersSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tipos ENUM de Fase 2
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "purchase_payment_condition_enum" AS ENUM ('contado', 'credito');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "purchase_status_enum" AS ENUM ('pendiente', 'recibida', 'pagada');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Tabla proveedor
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "proveedor" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "nombre" varchar(150) NOT NULL,
        "rif" varchar(50) NOT NULL UNIQUE,
        "contacto" varchar(150),
        "telefono" varchar(50),
        "email" varchar(150),
        "direccion" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 3. Tabla compra
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "compra" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "proveedor_id" uuid NOT NULL,
        "numero_factura" varchar(100) NOT NULL,
        "fecha" date NOT NULL,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "condicion_pago" "purchase_payment_condition_enum" NOT NULL DEFAULT 'contado',
        "dias_credito" int NOT NULL DEFAULT 0,
        "estado" "purchase_status_enum" NOT NULL DEFAULT 'pendiente',
        "archivo_url" text,
        "usuario_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_compra_proveedor" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_compra_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL
      );
    `);

    // 4. Tabla compra_detalle
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "compra_detalle" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "compra_id" uuid NOT NULL,
        "sku_id" uuid NOT NULL,
        "cantidad" int NOT NULL,
        "costo_unitario" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_compra_detalle_compra" FOREIGN KEY ("compra_id") REFERENCES "compra" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_compra_detalle_sku" FOREIGN KEY ("sku_id") REFERENCES "sku" ("id") ON DELETE RESTRICT
      );
    `);

    // 5. Tabla pago_compra
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pago_compra" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "compra_id" uuid NOT NULL,
        "fecha" timestamptz NOT NULL DEFAULT now(),
        "monto" numeric(12,2) NOT NULL,
        "metodo" varchar(100) NOT NULL,
        "referencia" varchar(150),
        "usuario_id" uuid,
        "notas" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_pago_compra_compra" FOREIGN KEY ("compra_id") REFERENCES "compra" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_pago_compra_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL
      );
    `);

    // 6. Índices
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_proveedor_rif" ON "proveedor" ("rif");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_compra_proveedor_id" ON "compra" ("proveedor_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_compra_estado" ON "compra" ("estado");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_compra_detalle_compra_id" ON "compra_detalle" ("compra_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_compra_detalle_sku_id" ON "compra_detalle" ("sku_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pago_compra_compra_id" ON "pago_compra" ("compra_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pago_compra_fecha" ON "pago_compra" ("fecha");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pago_compra";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "compra_detalle";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "compra";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "proveedor";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "purchase_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "purchase_payment_condition_enum";`);
  }
}
