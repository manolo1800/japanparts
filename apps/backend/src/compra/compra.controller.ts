import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompraService } from './compra.service';
import { OcrService } from './ocr.service';
import { StorageService } from '../storage/storage.service';
import { CreateCompraDto, CreatePagoCompraDto } from './dto/compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import {
  UserRole,
  ApiResponse,
  PurchaseStatus,
  OcrParsedFacturaResult,
} from '@japonparts/shared';
import { Compra } from '../entities/compra.entity';
import { Usuario } from '../entities/usuario.entity';
import { PagoCompra } from '../entities/pago-compra.entity';

@Controller('compra')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class CompraController {
  constructor(
    private readonly compraService: CompraService,
    private readonly ocrService: OcrService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async create(
    @Body() dto: CreateCompraDto,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<Compra>> {
    const compra = await this.compraService.create(dto, user?.id);
    return {
      success: true,
      data: compra,
      message: 'Factura de compra registrada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async findAll(
    @Query('estado') estado?: PurchaseStatus,
    @Query('proveedor_id') proveedorId?: string,
  ): Promise<ApiResponse<Compra[]>> {
    const compras = await this.compraService.findAll(estado, proveedorId);
    return {
      success: true,
      data: compras,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<Compra>> {
    const compra = await this.compraService.findOne(id);
    return {
      success: true,
      data: compra,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint POST /compra/ocr
   * Sube imagen o PDF a MinIO, extrae los datos estructurados con OCR y devuelve un JSON editable.
   */
  @Post('ocr')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  @UseInterceptors(FileInterceptor('file'))
  async parseInvoiceWithOcr(
    @UploadedFile() file: any,
  ): Promise<ApiResponse<OcrParsedFacturaResult>> {
    if (!file) {
      throw new BadRequestException('Debes subir un archivo PDF o imagen de factura');
    }

    // 1. Guardar en MinIO
    const uploadResult = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Extraer datos con OCR
    const parsedData = await this.ocrService.parseDocument(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    parsedData.archivo_url = uploadResult.url;

    return {
      success: true,
      data: parsedData,
      message: 'Factura procesada con OCR exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint POST /compra/:id/aprobar
   * Aprueba la compra, sube el stock de cada SKU, recalcula costo promedio y registra movimiento de entrada.
   */
  @Post(':id/aprobar')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async aprobar(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<Compra>> {
    const compraAprobada = await this.compraService.aprobar(id, user?.id);
    return {
      success: true,
      data: compraAprobada,
      message: 'Compra aprobada: stock actualizado y costo promedio recalculado',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint POST /compra/:id/pago
   * Registra pagos parciales o totales de cuentas por pagar.
   */
  @Post(':id/pago')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async registrarPago(
    @Param('id') id: string,
    @Body() dto: CreatePagoCompraDto,
    @CurrentUser() user: Usuario,
  ): Promise<ApiResponse<{ compra: Compra; pago: PagoCompra }>> {
    const result = await this.compraService.registrarPago(id, dto, user?.id);
    return {
      success: true,
      data: result,
      message: 'Pago a proveedor registrado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
