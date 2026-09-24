import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchasePaymentCondition } from '@japonparts/shared';

export class CreateCompraDetalleDto {
  @IsUUID('4', { message: 'El sku_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El sku_id es obligatorio' })
  sku_id: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  cantidad: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costo_unitario: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  subtotal?: number;
}

export class CreateCompraDto {
  @IsUUID('4', { message: 'El proveedor_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El proveedor es obligatorio' })
  proveedor_id: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de factura es obligatorio' })
  numero_factura: string;

  @IsString()
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  total: number;

  @IsEnum(PurchasePaymentCondition)
  condicion_pago: PurchasePaymentCondition;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  dias_credito?: number = 0;

  @IsString()
  @IsOptional()
  archivo_url?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompraDetalleDto)
  items: CreateCompraDetalleDto[];
}

export class CreatePagoCompraDto {
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @Type(() => Number)
  monto: number;

  @IsString()
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  metodo: string;

  @IsString()
  @IsOptional()
  referencia?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}
