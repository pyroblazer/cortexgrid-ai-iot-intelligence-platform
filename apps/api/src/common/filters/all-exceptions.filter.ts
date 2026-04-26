/**
 * @file all-exceptions.filter.ts
 * @description Global exception filter that catches ALL unhandled errors and
 * returns a consistent JSON error response.
 *
 * ELI5: Think of this as the "safety net" at the bottom of the API. If anything
 * goes wrong anywhere in the code (a database error, a validation failure,
 * a null pointer, etc.), this filter catches it and sends a clean, predictable
 * error response to the client. The user never sees a raw stack trace or
 * an ugly HTML error page.
 *
 * HOW IT WORKS:
 *   1. The @Catch() decorator with no arguments means "catch EVERYTHING"
 *   2. It runs AFTER the controller/interceptor but only if an error was thrown
 *   3. It inspects the exception type to determine the appropriate HTTP status
 *   4. Formats the error into a standard JSON structure
 *   5. Logs the error for debugging
 *
 * ERROR TYPES HANDLED:
 *   - HttpException (NestJS built-in): Uses the exception's status code (400, 404, etc.)
 *     Includes special handling for validation errors (array of messages).
 *   - Generic Error: Returns 500 Internal Server Error (something unexpected broke).
 *     Logs the full stack trace for debugging.
 *   - Unknown exceptions: Returns 500 as a safe default.
 *
 * WHY this filter? Without it, NestJS would return its own error format,
 * which might expose internal details. This gives us control over what
 * information reaches the client.
 *
 * SECURITY NOTE: We never send stack traces or internal details to the client.
 * Full error details are only logged server-side for debugging.
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()  // No argument = catch ALL exception types
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Handle an unhandled exception by formatting a clean error response.
   *
   * @param exception - The error that was thrown (could be any type)
   * @param host - Provides access to the HTTP request/response objects
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default to 500 (Internal Server Error) for unknown exceptions.
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      // HttpException is NestJS's standard error class.
      // It includes a status code (e.g., 404, 400) and a response body.
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        // Simple string message (e.g., throw new HttpException('Not found', 404))
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        // Object response (NestJS often wraps messages in objects).
        // This handles validation errors where the response is an array of messages.
        const resp = exceptionResponse as Record<string, any>;
        message = resp.message || exception.message;
        // Validation errors from class-validator come as an array of messages.
        // We extract them into a separate "errors" field for the frontend to display.
        if (Array.isArray(resp.message)) {
          errors = resp.message;
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      // Generic JavaScript Error (not an HttpException).
      // This is unexpected - something in our code threw a plain Error.
      // We use the error's message but keep 500 status.
      message = exception.message;
      // Log the full stack trace for debugging. This is server-side only -
      // the client never sees these details (security best practice).
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Log a summary line for every error (includes method, URL, status, message).
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
    );

    // Send the formatted error response to the client.
    // Uses the same structure as successful responses (from TransformInterceptor)
    // but with success: false, making it easy for the frontend to handle both cases.
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      // Conditionally include the errors array only if there are validation errors.
      // The spread + condition pattern avoids adding "errors: undefined" to the JSON.
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
