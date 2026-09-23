import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '@japonparts/shared';

export class AjusteStockDto {
  @IsEnum(MovementType, { message: 'El tipo debe ser entrada, salida o ajuste' })
  @IsNotEmpty({ message: 'El tipo de movimiento es obligatorio' })
  tipo: MovementType;

  @IsNumber({}, { message: 'La cantidad debe ser un número entero' })
  @Min(0, { message: 'La cantidad debe ser mayor o igual a cero' })
  @Type(() => Number)
  cantidad: number;

  @IsString()
  @IsOptional()
  referencia_tipo?: string = 'ajuste_manual';

  @IsString()
  @IsOptional()
  referencia_id?: string;

  @IsString()
  @IsOptional()
  notas?: string;
}
