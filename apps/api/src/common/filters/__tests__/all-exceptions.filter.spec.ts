import {
  HttpException,
  HttpStatus,
  ArgumentsHost,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AllExceptionsFilter } from '../all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'GET',
      url: '/api/test',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('catch', () => {
    it('should format HttpException responses', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not found',
          path: '/api/test',
          timestamp: expect.any(String),
        }),
      );
      // Ensure errors field is not present for simple messages
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.errors).toBeUndefined();
    });

    it('should format HttpException with string response', () => {
      const exception = new HttpException('Custom error message', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Custom error message',
        }),
      );
    });

    it('should format generic Error as 500', () => {
      const exception = new Error('Something went wrong internally');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong internally',
        }),
      );
    });

    it('should format unknown exceptions as 500 with generic message', () => {
      const exception = 'string exception';

      filter.catch(exception as any, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });

    it('should handle validation errors with messages array', () => {
      const validationMessages = [
        'name must be longer than 2 characters',
        'email must be a valid email',
      ];
      const exception = new HttpException(
        {
          message: validationMessages,
          error: 'Bad Request',
          statusCode: 400,
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          errors: validationMessages,
        }),
      );
    });

    it('should never expose stack traces', () => {
      const exception = new Error('Internal details');

      filter.catch(exception, mockHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
      expect(jsonCall.trace).toBeUndefined();
    });

    it('should never expose stack traces for HttpException either', () => {
      const exception = new HttpException('Error', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();
    });

    it('should include timestamp in the response', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.timestamp).toBeDefined();
      // Verify it's a valid ISO date string
      expect(new Date(jsonCall.timestamp).toISOString()).toBe(jsonCall.timestamp);
    });

    it('should include path in the response', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.path).toBe('/api/test');
    });

    it('should handle HttpException with object response without message array', () => {
      const exception = new HttpException(
        { error: 'Conflict', statusCode: 409 },
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.statusCode).toBe(HttpStatus.CONFLICT);
    });

    it('should handle FORBIDDEN status', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden',
        }),
      );
    });

    it('should handle null exception gracefully', () => {
      filter.catch(null as any, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
      );
    });

    it('should handle undefined exception gracefully', () => {
      filter.catch(undefined as any, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
