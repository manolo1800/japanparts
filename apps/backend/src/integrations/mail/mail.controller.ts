import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@japonparts/shared';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  @Roles(UserRole.ADMIN)
  async testMail(@Body('email') email: string) {
    const targetEmail = email || 'admin@tokugawuasp.com';
    const sent = await this.mailService.sendMail(
      targetEmail,
      'Prueba de Correo — Tokugawa Spare Parts ERP',
      `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Prueba Exitosa</h2>
        <p>El servicio de correo transaccional de <strong>Tokugawa Spare Parts</strong> está funcionando correctamente.</p>
      </div>`,
    );

    return {
      success: sent,
      message: sent
        ? `Correo de prueba enviado a ${targetEmail}`
        : 'Error al enviar correo (revisar logs o configuración SMTP)',
      timestamp: new Date().toISOString(),
    };
  }
}
