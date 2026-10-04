import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarcaCompatibilidadToOrdenCompraDetalle1700000000006
  implements MigrationInterface
{
  name = 'AddMarcaCompatibilidadToOrdenCompraDetalle1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orden_compra_detalle"
      ADD COLUMN IF NOT EXISTS "marca_compatibilidad" varchar(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orden_compra_detalle"
      DROP COLUMN IF EXISTS "marca_compatibilidad";
    `);
  }
}
