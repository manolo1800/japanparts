import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarcaToOrdenCompraDetalle1700000000007
  implements MigrationInterface
{
  name = 'AddMarcaToOrdenCompraDetalle1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orden_compra_detalle"
      ADD COLUMN IF NOT EXISTS "marca" varchar(100);
    `);

    // Backfill marca from sku table
    await queryRunner.query(`
      UPDATE "orden_compra_detalle" ocd
      SET "marca" = s."marca"
      FROM "sku" s
      WHERE ocd."sku_id" = s."id" AND (ocd."marca" IS NULL OR ocd."marca" = '');
    `);

    // Ensure marca_compatibilidad uses sku.marca
    await queryRunner.query(`
      UPDATE "orden_compra_detalle"
      SET "marca_compatibilidad" = 'GM/AVEO/OPTRA/CORSA'
      WHERE "codigo_articulo" = 'FA-96879797' AND ("marca_compatibilidad" LIKE 'CHEVROLET%' OR "marca_compatibilidad" IS NULL);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orden_compra_detalle"
      DROP COLUMN IF EXISTS "marca";
    `);
  }
}
