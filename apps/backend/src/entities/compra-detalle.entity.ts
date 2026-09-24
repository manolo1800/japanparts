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
import { Compra } from './compra.entity';
import { Sku } from './sku.entity';

@Entity('compra_detalle')
@Index('idx_compra_detalle_compra_id', ['compra_id'])
@Index('idx_compra_detalle_sku_id', ['sku_id'])
export class CompraDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  compra_id: string;

  @ManyToOne(() => Compra, (compra) => compra.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compra_id' })
  compra: Compra;

  @Column({ type: 'uuid' })
  sku_id: string;

  @ManyToOne(() => Sku, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sku_id' })
  sku: Sku;

  @Column({ type: 'int' })
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
