import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSkuDto {
  @IsString()
  @IsNotEmpty({ message: 'El SKU interno es obligatorio' })
  sku_interno: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del repuesto es obligatorio' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'La marca del repuesto es obligatoria' })
  marca: string;

  @IsString()
  @IsOptional()
  codigo_fabricante?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber({}, { message: 'El costo promedio debe ser numérico' })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  costo_promedio?: number = 0;

  @IsNumber({}, { message: 'El precio base debe ser numérico' })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  precio_base?: number = 0;

  @IsNumber({}, { message: 'El stock actual debe ser un número entero' })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  stock_actual?: number = 0;

  @IsNumber({}, { message: 'El stock mínimo debe ser un número entero' })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  stock_minimo?: number = 0;

  @IsString()
  @IsOptional()
  ubicacion?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;
}

export class UpdateSkuDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsString()
  @IsOptional()
  codigo_fabricante?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  costo_promedio?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  precio_base?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  stock_minimo?: number;

  @IsString()
  @IsOptional()
  ubicacion?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class SkuFilterDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  bajo_stock?: string | boolean;

  @IsOptional()
  activo?: string | boolean;
}
