import type { Context } from '@mobtakronio/schemakit';
import type { 
  ApiResponse, 
  PaginatedResponse, 
  PaginationMeta, 
  ListQueryParams,
  SchemaKitElysiaOptions 
} from './types';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T, 
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: string | Error, 
  message?: string
): ApiResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  return {
    success: false,
    error: errorMessage,
    message: message || 'Operation failed',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  
  const meta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return {
    success: true,
    data,
    meta,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse query parameters for list operations
 */
export function parseListQuery(query: Record<string, any>): {
  pagination: { page: number; limit: number };
  filters: Record<string, any>;
  sort?: { field: string; order: 'asc' | 'desc' };
} {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10));
  
  const filters: Record<string, any> = {};
  const sort = query.sort ? {
    field: query.sort as string,
    order: (query.order as 'asc' | 'desc') || 'asc'
  } : undefined;

  // Extract filters (exclude pagination and sort params)
  const excludeParams = new Set(['page', 'limit', 'sort', 'order', 'search']);
  const validKey = /^[A-Za-z_][A-Za-z0-9_]*$/;
  for (const [key, value] of Object.entries(query)) {
    if (excludeParams.has(key)) continue;
    if (value === undefined || value === '') continue;
    if (!validKey.test(key)) continue; // ignore potentially malicious/invalid identifiers (e.g., ^(.*)$)
    filters[key] = value;
  }

  // Handle search parameter
  if (query.search) {
    filters._search = query.search; // reserved internal key, not a DB column
  }

  return {
    pagination: { page, limit },
    filters,
    sort,
  };
}

/**
 * Extract context from request
 */
export function extractContext(
  request: Request, 
  tenantId: string,
  contextProvider?: (request: Request) => Context | Promise<Context>
): Context | Promise<Context> {
  if (contextProvider) {
    return contextProvider(request);
  }

  // Default context extraction
  const headers = request.headers;
  const context: Context = {
    tenantId,
    user: {
      id: headers.get('x-user-id') || 'anonymous',
      role: headers.get('x-user-role') || 'user',
    },
    request: {
      ip: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
      userAgent: headers.get('user-agent') || 'unknown',
    },
  };

  return context;
}

/**
 * Check if entity should be included based on options
 */
export function shouldIncludeEntity(
  entityName: string, 
  options: SchemaKitElysiaOptions
): boolean {
  // Check exclusions first
  if (options.excludeEntities) {
    for (const pattern of options.excludeEntities) {
      if (pattern instanceof RegExp ? pattern.test(entityName) : pattern === entityName) {
        return false;
      }
    }
  }

  // Check inclusions
  if (options.includeEntities) {
    for (const pattern of options.includeEntities) {
      if (pattern instanceof RegExp ? pattern.test(entityName) : pattern === entityName) {
        return true;
      }
    }
    return false; // If include list exists, only include matching entities
  }

  return true; // Include by default
}

/**
 * Sanitize entity name for URL paths
 */
export function sanitizeEntityName(entityName: string): string {
  return entityName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
}

/**
 * Handle async operations with error wrapping
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  entityName?: string,
  operationType?: string
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { success: false, error: err };
  }
}