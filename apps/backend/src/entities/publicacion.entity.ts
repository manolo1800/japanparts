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
import { Channel } from '@japonparts/shared';
import { Sku } from './sku.entity';
import { CuentaCanal } from './cuenta-canal.entity';

@Entity('publicacion')
@Index('idx_publicacion_sku_id', ['sku_id'])
@Index('idx_publicacion_ml_item_id', ['ml_item_id'])
export class Publicacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sku_id: string;

  @ManyToOne(() => Sku, (sku) => sku.publicaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sku_id' })
  sku: Sku;

  @Column({
    type: 'enum',
    enum: Channel,
    default: Channel.MOSTRADOR,
  })
  canal: Channel;

  @Column({ type: 'uuid', nullable: true })
  cuenta_id: string | null;

  @ManyToOne(() => CuentaCanal, (cuenta) => cuenta.publicaciones, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: CuentaCanal | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ml_item_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

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
  precio: number;

  @Column({ type: 'int', default: 0 })
  stock_publicado: number;

  @Column({ type: 'varchar', length: 50, default: 'activa' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
