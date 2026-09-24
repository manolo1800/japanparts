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
import { DocumentType } from '@japonparts/shared';
import { Orden } from './orden.entity';

@Entity('documento_venta')
@Index('idx_documento_venta_orden_id', ['orden_id'])
@Index('idx_documento_venta_numero', ['numero'], { unique: true })
export class DocumentoVenta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orden_id: string;

  @ManyToOne(() => Orden, (orden) => orden.documentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orden_id' })
  orden: Orden;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  tipo: DocumentType;

  @Column({ type: 'varchar', length: 100, unique: true })
  numero: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  fecha: Date;

  @Column({ type: 'jsonb', default: {} })
  datos_cliente: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  pdf_url: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
