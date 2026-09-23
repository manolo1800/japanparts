import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompatibilidadDto {
  @IsString()
  @IsNotEmpty({ message: 'La marca del vehículo es requerida' })
  marca_vehiculo: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo del vehículo es requerido' })
  modelo: string;

  @IsNumber()
  @Min(1900)
  @Type(() => Number)
  anio_desde: number;

  @IsNumber()
  @Min(1900)
  @IsOptional()
  @Type(() => Number)
  anio_hasta?: number;

  @IsString()
  @IsOptional()
  motor?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}

export class UpdateCompatibilidadDto {
  @IsString()
  @IsOptional()
  marca_vehiculo?: string;

  @IsString()
  @IsOptional()
  modelo?: string;

  @IsNumber()
  @Min(1900)
  @IsOptional()
  @Type(() => Number)
  anio_desde?: number;

  @IsNumber()
  @Min(1900)
  @IsOptional()
  @Type(() => Number)
  anio_hasta?: number;

  @IsString()
  @IsOptional()
  motor?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}

export class BuscarCompatibilidadDto {
  @IsString()
  @IsOptional()
  marca_vehiculo?: string;

  @IsString()
  @IsOptional()
  modelo?: string;

  @IsOptional()
  @Type(() => Number)
  anio?: number;

  @IsString()
  @IsOptional()
  motor?: string;
}
