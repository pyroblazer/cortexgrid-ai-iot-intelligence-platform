/**
 * @file transform.interceptor.ts
 * @description Response transformation interceptor that wraps all successful
 * API responses in a consistent { success, data, timestamp } format.
 *
 * ELI5: Imagine every package leaving a warehouse needs to be put in the same
 * type of shipping box with a standard label. This interceptor does that for
 * API responses. No matter what shape the data comes in from the controller,
 * the client always receives it in the same format:
 *
 *   { success: true, data: <actual data>, meta?: <pagination info>, timestamp: "..." }
 *
 * WHY standardize responses?
 *   - Frontend code can always check response.success to know if a request worked
 *   - Pagination info is always in response.meta
 *   - Timestamp helps with debugging and caching
 *   - Consistency makes the API easier to learn and use
 *
 * THREE BRANCHES:
 *   1. Already wrapped: If the service already returns { success, ... }, pass through
 *   2. Paginated: If response has { data, meta }, wrap it as { success, data, meta, timestamp }
 *   3. Plain data: Wrap it as { success, data, timestamp }
 *
 * This runs AFTER the controller method returns, but BEFORE the response is sent.
 * It only processes successful responses (errors are handled by AllExceptionsFilter).
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Standard API response envelope that all successful responses follow. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  /**
   * Intercept the response stream and wrap it in our standard format.
   *
   * Uses RxJS map operator to transform the data after the controller
   * method returns but before it's sent to the client.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Branch 1: Response is already wrapped (e.g., auth service returns its own format).
        // Pass it through unchanged to avoid double-wrapping.
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Branch 2: Paginated response from list endpoints.
        // Services return { data: [...], meta: { total, page, ... } }.
        // We wrap it with success and timestamp.
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          return {
            success: true,
            data: data.data,
            meta: data.meta,
            timestamp: new Date().toISOString(),
          };
        }

        // Branch 3: Plain data (single object, string, etc.).
        // Wrap it in the standard envelope.
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
