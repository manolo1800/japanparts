import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Channel } from '@japonparts/shared';

export class CreatePublicacionDto {
  @IsUUID('4', { message: 'El sku_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El sku_id es obligatorio' })
  sku_id: string;

  @IsEnum(Channel, { message: 'El canal debe ser ml, whatsapp o mostrador' })
  canal: Channel;

  @IsUUID('4')
  @IsOptional()
  cuenta_id?: string;

  @IsString()
  @IsOptional()
  ml_item_id?: string;

  @IsString()
  @IsNotEmpty({ message: 'El título de la publicación es obligatorio' })
  titulo: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  precio: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  stock_publicado?: number = 0;

  @IsString()
  @IsOptional()
  estado?: string = 'activa';

  @IsString()
  @IsOptional()
  url?: string;
}

export class UpdatePublicacionDto {
  @IsEnum(Channel)
  @IsOptional()
  canal?: Channel;

  @IsUUID('4')
  @IsOptional()
  cuenta_id?: string;

  @IsString()
  @IsOptional()
  ml_item_id?: string;

  @IsString()
  @IsOptional()
  titulo?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  precio?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  stock_publicado?: number;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  url?: string;
}
