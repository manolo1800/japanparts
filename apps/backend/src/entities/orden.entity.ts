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
import {
  Channel,
  OrderStatus,
  DeliveryType,
  PaymentStatus,
} from '@japonparts/shared';
import { Usuario } from './usuario.entity';
import { CuentaCanal } from './cuenta-canal.entity';
import { Cliente } from './cliente.entity';
import { OrdenDetalle } from './orden-detalle.entity';
import { DocumentoVenta } from './documento-venta.entity';

@Entity('orden')
@Index('idx_orden_numero_orden', ['numero_orden'], { unique: true })
@Index('idx_orden_cliente_id', ['cliente_id'])
@Index('idx_orden_vendedor_id', ['vendedor_id'])
@Index('idx_orden_estado', ['estado'])
@Index('idx_orden_canal', ['canal'])
@Index('idx_orden_fecha', ['fecha'])
export class Orden {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  numero_orden: string;

  @Column({
    type: 'enum',
    enum: Channel,
    default: Channel.MOSTRADOR,
  })
  canal: Channel;

  @Column({ type: 'uuid', nullable: true })
  cuenta_id: string | null;

  @ManyToOne(() => CuentaCanal, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: CuentaCanal | null;

  @Column({ type: 'uuid', nullable: true })
  vendedor_id: string | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendedor_id' })
  vendedor: Usuario | null;

  @Column({ type: 'uuid', nullable: true })
  cliente_id: string | null;

  @ManyToOne(() => Cliente, (cliente) => cliente.ordenes, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  fecha: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDIENTE,
  })
  estado: OrderStatus;

  @Column({
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.RETIRO,
  })
  tipo_entrega: DeliveryType;

  @Column({ type: 'text', nullable: true })
  direccion_entrega: string | null;

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

  @Column({ type: 'varchar', length: 100, default: 'efectivo' })
  metodo_pago: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDIENTE,
  })
  estado_pago: PaymentStatus;

  @Column({ type: 'varchar', length: 100, default: 'mostrador', nullable: true })
  origen: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => OrdenDetalle, (detalle) => detalle.orden, { cascade: true })
  detalles: OrdenDetalle[];

  @OneToMany(() => DocumentoVenta, (doc) => doc.orden)
  documentos: DocumentoVenta[];
}
