import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { Sku } from './sku.entity';

@Entity('orden_compra_detalle')
@Index('idx_orden_compra_detalle_orden_id', ['orden_compra_id'])
@Index('idx_orden_compra_detalle_sku_id', ['sku_id'])
export class OrdenCompraDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orden_compra_id: string;

  @ManyToOne(() => OrdenCompra, (orden) => orden.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orden_compra_id' })
  orden_compra: OrdenCompra;

  @Column({ type: 'uuid', nullable: true })
  sku_id: string | null;

  @ManyToOne(() => Sku, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sku_id' })
  sku: Sku | null;

  @Column({ type: 'varchar', length: 100 })
  codigo_articulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  marca: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  marca_compatibilidad: string | null;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0,
    },
  })
  costo_unitario: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0,
    },
  })
  subtotal: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
