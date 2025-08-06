/**
 * Shared types for all SchemaKit framework adapters
 */

/**
 * CRUD operation types
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

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

/**
 * Generic HTTP request interface that adapters can map to
 */
export interface GenericRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, any>;
  query: Record<string, any>;
  body?: any;
}

/**
 * Generic HTTP response interface that adapters can map from
 */
export interface GenericResponse {
  status: number;
  headers?: Record<string, string>;
  body: any;
}

/**
 * Route metadata for generated endpoints
 */
export interface RouteMetadata {
  entityName: string;
  operation: CrudOperation;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description?: string;
  tags?: string[];
}