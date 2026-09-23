import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Compatibilidad } from './compatibilidad.entity';
import { Publicacion } from './publicacion.entity';
import { MovimientoStock } from './movimiento-stock.entity';

@Entity('sku')
export class Sku {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_sku_sku_interno', { unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  sku_interno: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  marca: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  codigo_fabricante: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

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
  costo_promedio: number;

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
  precio_base: number;

  @Column({ type: 'int', default: 0 })
  stock_actual: number;

  @Column({ type: 'int', default: 0 })
  stock_minimo: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ubicacion: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => Compatibilidad, (comp) => comp.sku, { cascade: true })
  compatibilidades: Compatibilidad[];

  @OneToMany(() => Publicacion, (pub) => pub.sku, { cascade: true })
  publicaciones: Publicacion[];

  @OneToMany(() => MovimientoStock, (mov) => mov.sku)
  movimientos: MovimientoStock[];
}
