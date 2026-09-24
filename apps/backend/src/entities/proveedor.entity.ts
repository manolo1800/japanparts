import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Compra } from './compra.entity';

@Entity('proveedor')
export class Proveedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Index('idx_proveedor_rif', { unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  rif: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contacto: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => Compra, (compra) => compra.proveedor)
  compras: Compra[];
}
