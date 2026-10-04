import { MigrationInterface, QueryRunner } from 'typeorm';

export class PurchaseOrdersSchema1700000000005 implements MigrationInterface {
  name = 'PurchaseOrdersSchema1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tipo ENUM de estado de orden de compra
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "purchase_order_status_enum" AS ENUM ('borrador', 'enviada', 'confirmada', 'recibida', 'cancelada');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Tabla orden_compra
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orden_compra" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "proveedor_id" uuid NOT NULL,
        "numero_orden" varchar(100) NOT NULL UNIQUE,
        "fecha_emision" date NOT NULL DEFAULT CURRENT_DATE,
        "fecha_entrega_esperada" date,
        "estado" "purchase_order_status_enum" NOT NULL DEFAULT 'borrador',
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "observaciones" text,
        "archivo_pdf_url" text,
        "usuario_id" uuid,
        "enviado_email" boolean NOT NULL DEFAULT false,
        "enviado_email_a" varchar(150),
        "enviado_email_at" timestamptz,
        "enviado_whatsapp" boolean NOT NULL DEFAULT false,
        "enviado_whatsapp_a" varchar(50),
        "enviado_whatsapp_at" timestamptz,
        "compra_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_orden_compra_proveedor" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orden_compra_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_orden_compra_compra" FOREIGN KEY ("compra_id") REFERENCES "compra" ("id") ON DELETE SET NULL
      );
    `);

    // 3. Tabla orden_compra_detalle
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orden_compra_detalle" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orden_compra_id" uuid NOT NULL,
        "sku_id" uuid,
        "codigo_articulo" varchar(100) NOT NULL,
        "descripcion" text NOT NULL,
        "cantidad" int NOT NULL DEFAULT 1,
        "costo_unitario" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_orden_compra_detalle_orden" FOREIGN KEY ("orden_compra_id") REFERENCES "orden_compra" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_orden_compra_detalle_sku" FOREIGN KEY ("sku_id") REFERENCES "sku" ("id") ON DELETE SET NULL
      );
    `);

    // 4. Índices
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_compra_proveedor_id" ON "orden_compra" ("proveedor_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_compra_numero" ON "orden_compra" ("numero_orden");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_compra_estado" ON "orden_compra" ("estado");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_compra_detalle_orden_id" ON "orden_compra_detalle" ("orden_compra_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_compra_detalle_sku_id" ON "orden_compra_detalle" ("sku_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "orden_compra_detalle";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orden_compra";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "purchase_order_status_enum";`);
  }
}
