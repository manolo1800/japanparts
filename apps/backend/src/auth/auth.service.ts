import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { AuthTokens, UserSummary } from '@japonparts/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const user = await this.usuarioRepository.findOne({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('El usuario se encuentra inactivo');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'dev_refresh_secret_key_japonparts_2026';

      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.usuarioRepository.findOne({
        where: { id: payload.sub, activo: true },
      });

      if (!user) {
        throw new UnauthorizedException('Usuario no válido para renovación');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token expirado o inválido');
    }
  }

  private generateTokens(user: Usuario): AuthTokens {
    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
    };

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'dev_jwt_secret_key_japonparts_2026';
    const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'dev_refresh_secret_key_japonparts_2026';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const access_token = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: jwtExpiresIn as any,
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    const userSummary: UserSummary = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    };

    return {
      access_token,
      refresh_token,
      user: userSummary,
    };
  }

  formatUser(user: Usuario): UserSummary {
    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    };
  }
}
