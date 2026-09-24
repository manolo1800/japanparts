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
import { Orden } from './orden.entity';
import { Sku } from './sku.entity';
import { Publicacion } from './publicacion.entity';

@Entity('orden_detalle')
@Index('idx_orden_detalle_orden_id', ['orden_id'])
@Index('idx_orden_detalle_sku_id', ['sku_id'])
export class OrdenDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orden_id: string;

  @ManyToOne(() => Orden, (orden) => orden.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orden_id' })
  orden: Orden;

  @Column({ type: 'uuid' })
  sku_id: string;

  @ManyToOne(() => Sku, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sku_id' })
  sku: Sku;

  @Column({ type: 'uuid', nullable: true })
  publicacion_id: string | null;

  @ManyToOne(() => Publicacion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'publicacion_id' })
  publicacion: Publicacion | null;

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
  precio_unitario: number;

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
