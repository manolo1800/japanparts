import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PublicacionService } from './publicacion.service';
import { CreatePublicacionDto, UpdatePublicacionDto } from './dto/publicacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse, Channel } from '@japonparts/shared';
import { Publicacion } from '../entities/publicacion.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class PublicacionController {
  constructor(private readonly publicacionService: PublicacionService) {}

  @Post('publicacion')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async create(@Body() dto: CreatePublicacionDto): Promise<ApiResponse<Publicacion>> {
    const pub = await this.publicacionService.create(dto);
    return {
      success: true,
      data: pub,
      message: 'Publicación creada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('publicacion')
  async findAll(
    @Query('canal') canal?: Channel,
    @Query('sku_id') skuId?: string,
  ): Promise<ApiResponse<Publicacion[]>> {
    const list = await this.publicacionService.findAll(canal, skuId);
    return {
      success: true,
      data: list,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('publicacion/:id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<Publicacion>> {
    const pub = await this.publicacionService.findOne(id);
    return {
      success: true,
      data: pub,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('publicacion/:id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePublicacionDto,
  ): Promise<ApiResponse<Publicacion>> {
    const pub = await this.publicacionService.update(id, dto);
    return {
      success: true,
      data: pub,
      message: 'Publicación actualizada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('publicacion/:id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.publicacionService.remove(id);
    return {
      success: true,
      data: null,
      message: 'Publicación eliminada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sku/:id/publicaciones')
  async findBySku(@Param('id') skuId: string): Promise<ApiResponse<Publicacion[]>> {
    const items = await this.publicacionService.findBySku(skuId);
    return {
      success: true,
      data: items,
      timestamp: new Date().toISOString(),
    };
  }
}
