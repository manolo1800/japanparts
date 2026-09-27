import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Channel, ConversationStatus } from '@japonparts/shared';
import { CuentaCanal } from './cuenta-canal.entity';
import { Cliente } from './cliente.entity';
import { Orden } from './orden.entity';
import { Mensaje } from './mensaje.entity';

@Entity('conversacion')
export class Conversacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: Channel,
    default: Channel.WHATSAPP,
  })
  canal: Channel;

  @Column({ type: 'uuid', nullable: true })
  cuenta_id: string | null;

  @ManyToOne(() => CuentaCanal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: CuentaCanal | null;

  @Column({ type: 'uuid', nullable: true })
  cliente_id: string | null;

  @ManyToOne(() => Cliente, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente | null;

  @Column({ type: 'varchar', length: 50 })
  telefono: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  jid: string | null;


  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.BOT,
  })
  estado: ConversationStatus;

  @Column({ type: 'uuid', nullable: true })
  orden_id: string | null;

  @ManyToOne(() => Orden, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orden_id' })
  orden: Orden | null;

  @OneToMany(() => Mensaje, (mensaje) => mensaje.conversacion, { cascade: true })
  mensajes: Mensaje[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
