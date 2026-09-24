import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Compra } from './compra.entity';
import { Usuario } from './usuario.entity';

@Entity('pago_compra')
@Index('idx_pago_compra_compra_id', ['compra_id'])
@Index('idx_pago_compra_fecha', ['fecha'])
export class PagoCompra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  compra_id: string;

  @ManyToOne(() => Compra, (compra) => compra.pagos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compra_id' })
  compra: Compra;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value) || 0,
    },
  })
  monto: number;

  @Column({ type: 'varchar', length: 100 })
  metodo: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  referencia: string | null;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
