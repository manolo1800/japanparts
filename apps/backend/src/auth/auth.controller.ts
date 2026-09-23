import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Usuario } from '../entities/usuario.entity';
import { ApiResponse, AuthTokens, UserSummary } from '@japonparts/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.authService.login(loginDto);
    return {
      success: true,
      data: tokens,
      message: 'Inicio de sesión exitoso',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.authService.refreshToken(refreshTokenDto.refresh_token);
    return {
      success: true,
      data: tokens,
      message: 'Token actualizado exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: Usuario): Promise<ApiResponse<UserSummary>> {
    return {
      success: true,
      data: this.authService.formatUser(user),
      timestamp: new Date().toISOString(),
    };
  }
}
