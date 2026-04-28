import { of, throwError } from 'rxjs';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditInterceptor } from '../audit.interceptor';
import { AuditService } from '../../../modules/audit/audit.service';
import { AUDIT_ACTION_KEY } from '../../decorators/audit-action.decorator';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: Reflector;
  let auditService: AuditService;

  beforeEach(() => {
    reflector = new Reflector();
    auditService = {
      logAction: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;
    interceptor = new AuditInterceptor(reflector, auditService);
  });

  const createMockContext = (request: any = {}): ExecutionContext => {
    const handler = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => handler,
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('intercept', () => {
    it('should call AuditService.logAction when @AuditAction metadata exists', (done) => {
      const auditMeta = { action: 'CREATE', entity: 'Device' };
      jest.spyOn(reflector, 'get').mockReturnValue(auditMeta);

      const request = {
        user: { id: 'user_001', organizationId: 'org_001' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        params: {},
      };
      const context = createMockContext(request);

      const responseData = { data: { id: 'device_001', name: 'Sensor 1' } };

      interceptor
        .intercept(context, {
          handle: () => of(responseData),
        })
        .subscribe({
          next: () => {
            expect(auditService.logAction).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 'user_001',
                organizationId: 'org_001',
                action: 'CREATE',
                entity: 'Device',
                entityId: 'device_001',
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
              }),
            );
            done();
          },
          error: done.fail,
        });
    });

    it('should NOT call AuditService when no @AuditAction metadata', (done) => {
      jest.spyOn(reflector, 'get').mockReturnValue(null);

      const request = {
        user: { id: 'user_001', organizationId: 'org_001' },
        ip: '127.0.0.1',
        get: jest.fn(),
        params: {},
      };
      const context = createMockContext(request);

      interceptor
        .intercept(context, {
          handle: () => of({ id: '1' }),
        })
        .subscribe({
          next: () => {
            expect(auditService.logAction).not.toHaveBeenCalled();
            done();
          },
          error: done.fail,
        });
    });

    it('should extract entityId from response data.data.id', (done) => {
      const auditMeta = { action: 'UPDATE', entity: 'Device' };
      jest.spyOn(reflector, 'get').mockReturnValue(auditMeta);

      const request = {
        user: { id: 'user_001', organizationId: 'org_001' },
        ip: '10.0.0.1',
        socket: {},
        get: jest.fn().mockReturnValue(undefined),
        params: {},
      };
      const context = createMockContext(request);

      interceptor
        .intercept(context, {
          handle: () => of({ data: { id: 'device_999' } }),
        })
        .subscribe({
          next: () => {
            expect(auditService.logAction).toHaveBeenCalledWith(
              expect.objectContaining({
                entityId: 'device_999',
              }),
            );
            done();
          },
          error: done.fail,
        });
    });

    it('should extract entityId from response.id as fallback', (done) => {
      const auditMeta = { action: 'DELETE', entity: 'Device' };
      jest.spyOn(reflector, 'get').mockReturnValue(auditMeta);

      const request = {
        user: { id: 'user_001', organizationId: 'org_001' },
        ip: '10.0.0.1',
        socket: {},
        get: jest.fn().mockReturnValue(undefined),
        params: {},
      };
      const context = createMockContext(request);

      interceptor
        .intercept(context, {
          handle: () => of({ id: 'device_123' }),
        })
        .subscribe({
          next: () => {
            expect(auditService.logAction).toHaveBeenCalledWith(
              expect.objectContaining({
                entityId: 'device_123',
              }),
            );
            done();
          },
          error: done.fail,
        });
    });

    it('should extract entityId from params as last fallback', (done) => {
      const auditMeta = { action: 'UPDATE', entity: 'Device' };
      jest.spyOn(reflector, 'get').mockReturnValue(auditMeta);

      const request = {
        user: { id: 'user_001', organizationId: 'org_001' },
        ip: '10.0.0.1',
        socket: {},
        get: jest.fn().mockReturnValue(undefined),
        params: { id: 'param_device_456' },
      };
      const context = createMockContext(request);

      interceptor
        .intercept(context, {
          handle: () => of({ message: 'Updated successfully' }),
        })
        .subscribe({
          next: () => {
            expect(auditService.logAction).toHaveBeenCalledWith(
              expect.objectContaining({
                entityId: 'param_device_456',
              }),
            );
            done();
          },
          error: done.fail,
        });
    });

    it('should handle missing user gracefully', (done) => {
      const auditMeta = { action: 'CREATE', entity: 'Alert' };
      jest.spyOn(reflector, 'get').mockReturnValue(auditMeta);

      const request = {
        ip: '127.0.0.1',
        socket: {},
        get: jest.fn().mockReturnValue('TestAgent'),
        params: {},
      };
      const context = createMockContext(request);

      interceptor
        .intercept(context, {
          handle: () => of({ id: 'alert_001' }),
        })
        .subscribe({
          next: () => {
            expect(auditService.logAction).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: undefined,
                organizationId: undefined,
              }),
            );
            done();
          },
          error: done.fail,
        });
    });

    it('should handle request without ip field using socket.remoteAddress', (done) => {
      const auditMeta = { action: 'READ', entity: 'Telemetry' };
      jest.spyOn(reflector, 'get').mockReturnValue(auditMeta);

      const request = {
        user: { id: 'user_001', organizationId: 'org_001' },
        socket: { remoteAddress: '192.168.1.100' },
        get: jest.fn().mockReturnValue('SomeAgent'),
        params: {},
      };
      const context = createMockContext(request);

      interceptor
        .intercept(context, {
          handle: () => of({ id: 'tel_001' }),
        })
        .subscribe({
          next: () => {
            expect(auditService.logAction).toHaveBeenCalledWith(
              expect.objectContaining({
                ipAddress: '192.168.1.100',
              }),
            );
            done();
          },
          error: done.fail,
        });
    });

    it('should still emit the response data unchanged', (done) => {
      const auditMeta = { action: 'CREATE', entity: 'Device' };
      jest.spyOn(reflector, 'get').mockReturnValue(auditMeta);

      const request = {
        user: { id: 'user_001', organizationId: 'org_001' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Agent'),
        params: {},
      };
      const context = createMockContext(request);
      const responseData = { data: { id: 'new_device', name: 'Sensor' } };

      interceptor
        .intercept(context, {
          handle: () => of(responseData),
        })
        .subscribe({
          next: (result) => {
            expect(result).toEqual(responseData);
            done();
          },
          error: done.fail,
        });
    });
  });
});
