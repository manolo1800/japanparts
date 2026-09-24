import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre o razón social del proveedor es requerido' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El RIF o documento fiscal es requerido' })
  rif: string;

  @IsString()
  @IsOptional()
  contacto?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  direccion?: string;
}

export class UpdateProveedorDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  rif?: string;

  @IsString()
  @IsOptional()
  contacto?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  direccion?: string;
}
