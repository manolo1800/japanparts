import { MigrationInterface, QueryRunner } from 'typeorm';

export class SalesAndDocumentsSchema1700000000002 implements MigrationInterface {
  name = 'SalesAndDocumentsSchema1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tipos ENUM de Fase 3
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_status_enum" AS ENUM ('pendiente', 'confirmada', 'por_despachar', 'despachada', 'cerrada', 'cancelada');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "delivery_type_enum" AS ENUM ('retiro', 'delivery', 'encomienda');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_status_enum" AS ENUM ('pendiente', 'confirmado');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "document_type_enum" AS ENUM ('factura', 'recibo');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Tabla cliente
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cliente" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "nombre" varchar(150) NOT NULL,
        "telefono" varchar(50),
        "email" varchar(150),
        "direccion" text,
        "notas" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 3. Tabla orden
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orden" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "numero_orden" varchar(50) NOT NULL UNIQUE,
        "canal" "channel_enum" NOT NULL DEFAULT 'mostrador',
        "cuenta_id" uuid,
        "vendedor_id" uuid,
        "cliente_id" uuid,
        "fecha" timestamptz NOT NULL DEFAULT now(),
        "estado" "order_status_enum" NOT NULL DEFAULT 'pendiente',
        "tipo_entrega" "delivery_type_enum" NOT NULL DEFAULT 'retiro',
        "direccion_entrega" text,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "metodo_pago" varchar(100) NOT NULL DEFAULT 'efectivo',
        "estado_pago" "payment_status_enum" NOT NULL DEFAULT 'pendiente',
        "origen" varchar(100) DEFAULT 'mostrador',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_orden_cuenta" FOREIGN KEY ("cuenta_id") REFERENCES "cuenta_canal" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_orden_vendedor" FOREIGN KEY ("vendedor_id") REFERENCES "usuario" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_orden_cliente" FOREIGN KEY ("cliente_id") REFERENCES "cliente" ("id") ON DELETE SET NULL
      );
    `);

    // 4. Tabla orden_detalle
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orden_detalle" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orden_id" uuid NOT NULL,
        "sku_id" uuid NOT NULL,
        "publicacion_id" uuid,
        "cantidad" int NOT NULL,
        "precio_unitario" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_orden_detalle_orden" FOREIGN KEY ("orden_id") REFERENCES "orden" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_orden_detalle_sku" FOREIGN KEY ("sku_id") REFERENCES "sku" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orden_detalle_publicacion" FOREIGN KEY ("publicacion_id") REFERENCES "publicacion" ("id") ON DELETE SET NULL
      );
    `);

    // 5. Tabla documento_venta
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documento_venta" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orden_id" uuid NOT NULL,
        "tipo" "document_type_enum" NOT NULL,
        "numero" varchar(100) NOT NULL UNIQUE,
        "fecha" timestamptz NOT NULL DEFAULT now(),
        "datos_cliente" jsonb NOT NULL DEFAULT '{}',
        "pdf_url" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_documento_venta_orden" FOREIGN KEY ("orden_id") REFERENCES "orden" ("id") ON DELETE CASCADE
      );
    `);

    // 6. Índices
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cliente_nombre" ON "cliente" ("nombre");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cliente_telefono" ON "cliente" ("telefono");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_numero_orden" ON "orden" ("numero_orden");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_cliente_id" ON "orden" ("cliente_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_vendedor_id" ON "orden" ("vendedor_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_estado" ON "orden" ("estado");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_canal" ON "orden" ("canal");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_fecha" ON "orden" ("fecha");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_detalle_orden_id" ON "orden_detalle" ("orden_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orden_detalle_sku_id" ON "orden_detalle" ("sku_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_documento_venta_orden_id" ON "documento_venta" ("orden_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_documento_venta_numero" ON "documento_venta" ("numero");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "documento_venta";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orden_detalle";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orden";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cliente";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum";`);
  }
}
