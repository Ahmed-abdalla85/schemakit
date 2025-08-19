/**
 * Shared helper utilities for all framework adapters
 * 
 * These utilities can be extracted from the current Elysia adapter
 * and reused across Express, Fastify, NestJS and other framework adapters.
 */

// Note: This would normally import from '@mobtakronio/schemakit' but for build purposes we'll use placeholder
import type { 
  ApiResponse, 
  PaginatedResponse, 
  PaginationMeta,
  GenericRequest
} from './types';

// Placeholder type for Context (in real implementation this would be imported)
type Context = any;

/**
 * Response formatting helpers
 */
export class ResponseHelpers {
  /**
   * Create a successful API response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
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
  static error(error: string | Error, message?: string): ApiResponse {
    const errorMessage = error instanceof Error ? error.message : error;
    const response: any = {
      success: false,
      error: errorMessage,
      message: message || 'Operation failed',
      timestamp: new Date().toISOString(),
    };
    // Surface underlying database error and rich context when available
    if (error && typeof error === 'object') {
      const err: any = error;
      if (err.cause) {
        response.cause = err.cause instanceof Error ? err.cause.message : err.cause;
      }
      if (err.context) {
        response.context = err.context;
      }
    }
    return response as ApiResponse;
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
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
}

/**
 * Query parsing helpers
 */
export class QueryHelpers {
  /**
   * Parse query parameters for list operations
   */
  static parseListQuery(query: Record<string, any>): {
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
      if (!validKey.test(key)) continue; // skip potentially malicious/invalid identifiers
      filters[key] = value;
    }

    // Handle search parameter
    if (query.search) {
      // Reserved internal search key; not a DB column
      filters._search = query.search;
    }

    return {
      pagination: { page, limit },
      filters,
      sort,
    };
  }
}

/**
 * Sanitize incoming payload keys to valid SQL identifiers
 */
export function sanitizePayloadKeys<T extends Record<string, any>>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const validKey = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!validKey.test(key)) continue;
    sanitized[key] = value;
  }
  return sanitized as T;
}

/**
 * Context extraction helpers
 */
export class ContextHelpers {
  /**
   * Extract SchemaKit context from a generic request
   */
  static extractContext(
    request: GenericRequest,
    tenantId: string,
    contextProvider?: (request: GenericRequest) => Context | Promise<Context>
  ): Context | Promise<Context> {
    if (contextProvider) {
      return contextProvider(request);
    }

    // Default context extraction
    const headerTenant = (request.headers['x-tenant-id'] || request.headers['X-Tenant-Id']) as string | undefined;
    const headerTenantKey = (request.headers['x-tenant-key'] || request.headers['X-Tenant-Key']) as string | undefined;
    const context: Context = {
      tenantId: headerTenant || tenantId,
      user: {
        id: request.headers['x-user-id'] || 'anonymous',
        role: request.headers['x-user-role'] || 'user',
      },
      request: {
        ip: request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown',
        userAgent: request.headers['user-agent'] || 'unknown',
      },
      auth: {
        tenantKey: headerTenantKey,
      }
    };

    return context;
  }
}

/**
 * Validation helpers
 */
export class ValidationHelpers {
  /**
   * Check if entity should be included based on patterns
   */
  static shouldIncludeEntity(
    entityName: string,
    includePatterns?: (string | RegExp)[],
    excludePatterns?: (string | RegExp)[]
  ): boolean {
    // Check exclusions first
    if (excludePatterns) {
      for (const pattern of excludePatterns) {
        if (pattern instanceof RegExp ? pattern.test(entityName) : pattern === entityName) {
          return false;
        }
      }
    }

    // Check inclusions
    if (includePatterns) {
      for (const pattern of includePatterns) {
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
  static sanitizeEntityName(entityName: string): string {
    return entityName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  }
}

/**
 * Async operation helpers
 */
export class AsyncHelpers {
  /**
   * Handle async operations with error wrapping
   */
  static async handleAsync<T>(
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
}