import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.connection?.remoteAddress;

    // Inyectar auditoría en el request para controladores y servicios
    req.audit = {
      userId: user?.id || null,
      userEmail: user?.email || null,
      userRole: user?.rol || null,
      timestamp: new Date(),
    };

    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (user) {
          this.logger.log(
            `[User: ${user.email} (${user.rol})] [${method}] ${url} - ${duration}ms (IP: ${ip})`,
          );
        }
      }),
    );
  }
}
