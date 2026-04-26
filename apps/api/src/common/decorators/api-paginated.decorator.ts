import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export interface PaginatedDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const ApiPaginatedResponse = (model: any) => {
  return ApiExtraModels(model, PaginatedMetaDto).apply(
    null,
    [] as any[],
  ) && ApiOkResponse({
    schema: {
      allOf: [
        {
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(model) },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 100 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 20 },
                totalPages: { type: 'number', example: 5 },
                hasNextPage: { type: 'boolean', example: true },
                hasPrevPage: { type: 'boolean', example: false },
              },
            },
          },
        },
      ],
    },
  });
};

class PaginatedMetaDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
