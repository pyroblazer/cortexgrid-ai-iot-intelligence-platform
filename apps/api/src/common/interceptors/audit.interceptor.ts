import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get(AUDIT_ACTION_KEY, context.getHandler());
    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    return next.handle().pipe(
      tap((responseData) => {
        const entityId = responseData?.data?.id || responseData?.id || (request.params as any)?.id;

        this.auditService.logAction({
          userId: user?.id,
          organizationId: user?.organizationId,
          action: auditMeta.action,
          entity: auditMeta.entity,
          entityId,
          ipAddress: request.ip || request.socket?.remoteAddress,
          userAgent: request.get('user-agent') || undefined,
        });
      }),
    );
  }
}
