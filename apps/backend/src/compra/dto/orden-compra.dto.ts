import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrdenCompraDetalleDto {
  @IsUUID('4', { message: 'El sku_id debe ser un UUID válido' })
  @IsOptional()
  sku_id?: string;

  @IsString()
  @IsOptional()
  codigo_articulo?: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción del artículo es obligatoria' })
  descripcion: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsString()
  @IsOptional()
  marca_compatibilidad?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  cantidad: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  costo_unitario?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  subtotal?: number;
}

export class CreateOrdenCompraDto {
  @IsUUID('4', { message: 'El proveedor_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El proveedor es obligatorio' })
  proveedor_id: string;

  @IsString()
  @IsOptional()
  numero_orden?: string;

  @IsString()
  @IsOptional()
  fecha_emision?: string;

  @IsString()
  @IsOptional()
  fecha_entrega_esperada?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrdenCompraDetalleDto)
  items: CreateOrdenCompraDetalleDto[];
}

export class EnviarOrdenCompraEmailDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString()
  @IsOptional()
  mensaje?: string;
}

export class EnviarOrdenCompraWhatsappDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de teléfono / WhatsApp es obligatorio' })
  telefono: string;

  @IsString()
  @IsOptional()
  mensaje?: string;
}
