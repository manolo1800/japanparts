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
import { ChannelType } from '@japonparts/shared';
import { Usuario } from './usuario.entity';
import { Publicacion } from './publicacion.entity';

@Entity('cuenta_canal')
export class CuentaCanal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ChannelType,
  })
  tipo: ChannelType;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.cuentas, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ type: 'varchar', length: 150 })
  alias: string;

  @Column({ type: 'jsonb', default: {} })
  credenciales: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => Publicacion, (pub) => pub.cuenta)
  publicaciones: Publicacion[];
}
