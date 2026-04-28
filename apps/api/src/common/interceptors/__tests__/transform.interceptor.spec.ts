import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { TransformInterceptor } from '../transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  const createMockContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  const createMockCallHandler = (data: any): CallHandler => ({
    handle: () => of(data),
  });

  describe('intercept', () => {
    it('should wrap plain data in { success: true, data, timestamp }', (done) => {
      const context = createMockContext();
      const callHandler = createMockCallHandler({ id: '123', name: 'Test Device' });

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual({ id: '123', name: 'Test Device' });
          expect(result.timestamp).toBeDefined();
          expect(typeof result.timestamp).toBe('string');
          expect(result.meta).toBeUndefined();
          done();
        },
        error: done.fail,
      });
    });

    it('should wrap plain string data', (done) => {
      const context = createMockContext();
      const callHandler = createMockCallHandler('hello world');

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe('hello world');
          expect(result.timestamp).toBeDefined();
          done();
        },
        error: done.fail,
      });
    });

    it('should pass through already-wrapped responses with success field', (done) => {
      const alreadyWrapped = { success: true, data: { id: '1' }, timestamp: '2024-01-01T00:00:00Z' };
      const context = createMockContext();
      const callHandler = createMockCallHandler(alreadyWrapped);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result).toBe(alreadyWrapped);
          expect(result).toEqual({ success: true, data: { id: '1' }, timestamp: '2024-01-01T00:00:00Z' });
          done();
        },
        error: done.fail,
      });
    });

    it('should pass through already-wrapped responses with success: false', (done) => {
      const errorResponse = { success: false, message: 'Something went wrong', statusCode: 400 };
      const context = createMockContext();
      const callHandler = createMockCallHandler(errorResponse);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result).toBe(errorResponse);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle paginated responses { data, meta }', (done) => {
      const paginatedResponse = {
        data: [{ id: '1' }, { id: '2' }],
        meta: { total: 100, page: 1, limit: 10, totalPages: 10 },
      };
      const context = createMockContext();
      const callHandler = createMockCallHandler(paginatedResponse);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual([{ id: '1' }, { id: '2' }]);
          expect(result.meta).toEqual({ total: 100, page: 1, limit: 10, totalPages: 10 });
          expect(result.timestamp).toBeDefined();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle null data', (done) => {
      const context = createMockContext();
      const callHandler = createMockCallHandler(null);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBeNull();
          expect(result.timestamp).toBeDefined();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle undefined data', (done) => {
      const context = createMockContext();
      const callHandler = createMockCallHandler(undefined);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBeUndefined();
          expect(result.timestamp).toBeDefined();
          done();
        },
        error: done.fail,
      });
    });

    it('should handle numeric data', (done) => {
      const context = createMockContext();
      const callHandler = createMockCallHandler(42);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe(42);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle boolean data', (done) => {
      const context = createMockContext();
      const callHandler = createMockCallHandler(true);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe(true);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle array data', (done) => {
      const context = createMockContext();
      const callHandler = createMockCallHandler([1, 2, 3]);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual([1, 2, 3]);
          done();
        },
        error: done.fail,
      });
    });

    it('should prefer success check over paginated check', (done) => {
      // When an object has both "success" and "data"/"meta", it should be passed through
      const response = { success: true, data: [], meta: {} };
      const context = createMockContext();
      const callHandler = createMockCallHandler(response);

      interceptor.intercept(context, callHandler).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          done();
        },
        error: done.fail,
      });
    });
  });
});
