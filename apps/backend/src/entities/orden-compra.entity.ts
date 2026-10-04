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
import { PurchaseOrderStatus } from '@japonparts/shared';
import { Proveedor } from './proveedor.entity';
import { Usuario } from './usuario.entity';
import { Compra } from './compra.entity';
import { OrdenCompraDetalle } from './orden-compra-detalle.entity';

@Entity('orden_compra')
@Index('idx_orden_compra_proveedor_id', ['proveedor_id'])
@Index('idx_orden_compra_numero', ['numero_orden'])
@Index('idx_orden_compra_estado', ['estado'])
export class OrdenCompra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  proveedor_id: string;

  @ManyToOne(() => Proveedor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ type: 'varchar', length: 100, unique: true })
  numero_orden: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_emision: Date;

  @Column({ type: 'date', nullable: true })
  fecha_entrega_esperada: Date | null;

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.BORRADOR,
  })
  estado: PurchaseOrderStatus;

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

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ type: 'text', nullable: true })
  archivo_pdf_url: string | null;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ type: 'boolean', default: false })
  enviado_email: boolean;

  @Column({ type: 'varchar', length: 150, nullable: true })
  enviado_email_a: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  enviado_email_at: Date | null;

  @Column({ type: 'boolean', default: false })
  enviado_whatsapp: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  enviado_whatsapp_a: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  enviado_whatsapp_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  compra_id: string | null;

  @ManyToOne(() => Compra, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'compra_id' })
  compra: Compra | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => OrdenCompraDetalle, (detalle) => detalle.orden_compra, {
    cascade: true,
  })
  detalles: OrdenCompraDetalle[];
}
