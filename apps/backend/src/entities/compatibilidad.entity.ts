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
import { Sku } from './sku.entity';

@Entity('compatibilidad')
@Index('idx_compatibilidad_sku_id', ['sku_id'])
@Index('idx_compatibilidad_marca_modelo', ['marca_vehiculo', 'modelo'])
export class Compatibilidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sku_id: string;

  @ManyToOne(() => Sku, (sku) => sku.compatibilidades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sku_id' })
  sku: Sku;

  @Column({ type: 'varchar', length: 100 })
  marca_vehiculo: string;

  @Column({ type: 'varchar', length: 100 })
  modelo: string;

  @Column({ type: 'int' })
  anio_desde: number;

  @Column({ type: 'int', nullable: true })
  anio_hasta: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  motor: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
