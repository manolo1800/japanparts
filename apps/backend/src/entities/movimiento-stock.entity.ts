import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MovementType } from '@japonparts/shared';
import { Sku } from './sku.entity';
import { Usuario } from './usuario.entity';

@Entity('movimiento_stock')
@Index('idx_movimiento_stock_sku_id', ['sku_id'])
@Index('idx_movimiento_stock_created_at', ['created_at'])
export class MovimientoStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sku_id: string;

  @ManyToOne(() => Sku, (sku) => sku.movimientos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sku_id' })
  sku: Sku;

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  tipo: MovementType;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia_tipo: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  referencia_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.movimientos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
