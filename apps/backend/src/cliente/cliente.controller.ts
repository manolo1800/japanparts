import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../auth/interceptors/audit.interceptor';
import { UserRole, ApiResponse, ClienteSummary } from '@japonparts/shared';
import { ClienteService } from './cliente.service';
import { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';

@Controller('cliente')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async create(@Body() dto: CreateClienteDto): Promise<ApiResponse<ClienteSummary>> {
    const cliente = await this.clienteService.create(dto);
    return {
      success: true,
      data: cliente as any,
      message: 'Cliente registrado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.BODEGA)
  async findAll(@Query('search') search?: string): Promise<ApiResponse<ClienteSummary[]>> {
    const list = await this.clienteService.findAll(search);
    return {
      success: true,
      data: list as any,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.BODEGA)
  async findOne(@Param('id') id: string): Promise<ApiResponse<ClienteSummary>> {
    const cliente = await this.clienteService.findOne(id);
    return {
      success: true,
      data: cliente as any,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
  ): Promise<ApiResponse<ClienteSummary>> {
    const cliente = await this.clienteService.update(id, dto);
    return {
      success: true,
      data: cliente as any,
      message: 'Cliente actualizado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
