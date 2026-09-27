import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MessageRole } from '@japonparts/shared';
import { Conversacion } from './conversacion.entity';

@Entity('mensaje')
export class Mensaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  conversacion_id: string;

  @ManyToOne(() => Conversacion, (conversacion) => conversacion.mensajes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversacion_id' })
  conversacion: Conversacion;

  @Column({
    type: 'enum',
    enum: MessageRole,
    default: MessageRole.USER,
  })
  rol: MessageRole;

  @Column({ type: 'text' })
  contenido: string;

  @Index('idx_mensaje_id_whatsapp')
  @Column({ type: 'varchar', length: 100, nullable: true })
  id_whatsapp: string | null;

  @Index('idx_mensaje_estado_envio')
  @Column({ type: 'varchar', length: 20, default: 'enviado' })
  estado_envio: string;

  @Column({ type: 'int', default: 0 })
  intentos_envio: number;

  @Column({ type: 'text', nullable: true })
  error_envio: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
