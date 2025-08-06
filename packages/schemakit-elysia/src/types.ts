import type { Elysia } from 'elysia';
import type { SchemaKit, Context } from '@mobtakronio/schemakit';

/**
 * Configuration options for SchemaKit Elysia adapter
 */
export interface SchemaKitElysiaOptions {
  /** Base path for all SchemaKit routes (default: '/api') */
  basePath?: string;
  /** Tenant ID to use for operations (default: 'default') */
  tenantId?: string;
  /** Whether to enable Swagger/OpenAPI documentation (default: true) */
  enableDocs?: boolean;
  /** Path for Swagger documentation (default: '/docs') */
  docsPath?: string;
  /** Custom context provider for requests */
  contextProvider?: (request: Request) => Context | Promise<Context>;
  /** Entity name patterns to include (default: all) */
  includeEntities?: string[] | RegExp[];
  /** Entity name patterns to exclude */
  excludeEntities?: string[] | RegExp[];
  /** Enable CORS for API routes (default: true) */
  enableCors?: boolean;
  /** Custom error handler */
  errorHandler?: (error: Error, entityName?: string, operation?: string) => any;
}

/**
 * CRUD operation types
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

/**
 * Route metadata for generated endpoints
 */
export interface RouteMetadata {
  entityName: string;
  operation: CrudOperation;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
}

/**
 * Response wrapper for API responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Query parameters for list endpoints
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: any;
}