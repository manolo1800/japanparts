import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Channel,
  DeliveryType,
  PaymentStatus,
  DocumentType,
} from '@japonparts/shared';
import { CreateClienteDto } from '../../cliente/dto/cliente.dto';

export class CreateOrdenItemDto {
  @IsString()
  @IsNotEmpty({ message: 'sku_id es obligatorio' })
  sku_id: string;

  @IsInt({ message: 'La cantidad debe ser un entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  cantidad: number;

  @IsNumber({}, { message: 'El precio unitario debe ser numérico' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  precio_unitario: number;

  @IsString()
  @IsOptional()
  publicacion_id?: string;
}

export class CreateOrdenDto {
  @IsEnum(Channel)
  @IsOptional()
  canal?: Channel = Channel.MOSTRADOR;

  @IsString()
  @IsOptional()
  cuenta_id?: string;

  @IsString()
  @IsOptional()
  cliente_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClienteDto)
  cliente_nuevo?: CreateClienteDto;

  @IsEnum(DeliveryType)
  @IsOptional()
  tipo_entrega?: DeliveryType = DeliveryType.RETIRO;

  @IsString()
  @IsOptional()
  direccion_entrega?: string;

  @IsString()
  @IsOptional()
  metodo_pago?: string = 'efectivo';

  @IsEnum(PaymentStatus)
  @IsOptional()
  estado_pago?: PaymentStatus = PaymentStatus.PENDIENTE;

  @IsEnum(DocumentType)
  @IsOptional()
  generar_documento?: DocumentType;

  @IsArray({ message: 'items debe ser un arreglo de productos' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrdenItemDto)
  items: CreateOrdenItemDto[];
}

export class ConfirmarPagoDto {
  @IsString()
  @IsOptional()
  metodo_pago?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  generar_documento?: DocumentType;

  @IsString()
  @IsOptional()
  notas?: string;
}

export class CancelarOrdenDto {
  @IsString()
  @IsOptional()
  motivo?: string;
}

export class GenerarDocumentoDto {
  @IsEnum(DocumentType, { message: 'tipo debe ser factura o recibo' })
  tipo: DocumentType;
}
