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
import { SkuService } from './sku.service';
import { CreateSkuDto, UpdateSkuDto, SkuFilterDto } from './dto/sku.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse, PaginatedResult } from '@japonparts/shared';
import { Sku } from '../entities/sku.entity';

@Controller('sku')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class SkuController {
  constructor(private readonly skuService: SkuService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async create(@Body() createSkuDto: CreateSkuDto): Promise<ApiResponse<Sku>> {
    const sku = await this.skuService.create(createSkuDto);
    return {
      success: true,
      data: sku,
      message: 'SKU creado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async findAll(@Query() query: SkuFilterDto): Promise<ApiResponse<PaginatedResult<Sku>>> {
    const result = await this.skuService.findAll(query);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<Sku>> {
    const sku = await this.skuService.findOne(id);
    return {
      success: true,
      data: sku,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.BODEGA)
  async update(
    @Param('id') id: string,
    @Body() updateSkuDto: UpdateSkuDto,
  ): Promise<ApiResponse<Sku>> {
    const sku = await this.skuService.update(id, updateSkuDto);
    return {
      success: true,
      data: sku,
      message: 'SKU actualizado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    await this.skuService.remove(id);
    return {
      success: true,
      data: null,
      message: 'SKU eliminado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
