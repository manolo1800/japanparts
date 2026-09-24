import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { PurchasePaymentCondition, PurchaseStatus } from '@japonparts/shared';
import { Proveedor } from './proveedor.entity';
import { CompraDetalle } from './compra-detalle.entity';
import { PagoCompra } from './pago-compra.entity';
import { Usuario } from './usuario.entity';

@Entity('compra')
@Index('idx_compra_proveedor_id', ['proveedor_id'])
@Index('idx_compra_estado', ['estado'])
export class Compra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  proveedor_id: string;

  @ManyToOne(() => Proveedor, (proveedor) => proveedor.compras, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ type: 'varchar', length: 100 })
  numero_factura: string;

  @Column({ type: 'date' })
  fecha: Date;

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
  total: number;

  @Column({
    type: 'enum',
    enum: PurchasePaymentCondition,
    default: PurchasePaymentCondition.CONTADO,
  })
  condicion_pago: PurchasePaymentCondition;

  @Column({ type: 'int', default: 0 })
  dias_credito: number;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.PENDIENTE,
  })
  estado: PurchaseStatus;

  @Column({ type: 'text', nullable: true })
  archivo_url: string | null;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => CompraDetalle, (detalle) => detalle.compra, { cascade: true })
  detalles: CompraDetalle[];

  @OneToMany(() => PagoCompra, (pago) => pago.compra)
  pagos: PagoCompra[];
}
