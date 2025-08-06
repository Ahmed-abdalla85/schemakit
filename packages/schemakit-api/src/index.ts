/**
 * @mobtakronio/schemakit-api
 * 
 * Shared API utilities and middleware for all SchemaKit framework adapters.
 * This package contains framework-agnostic logic that can be reused across
 * Elysia, Express, Fastify, NestJS and other framework adapters.
 * 
 * @example
 * ```typescript
 * // In any framework adapter
 * import { CrudOperations, ResponseHelpers } from '@mobtakronio/schemakit-api';
 * 
 * // Use shared CRUD logic
 * const result = await CrudOperations.createRecord(entity, data, context);
 * 
 * // Use standardized response format
 * return ResponseHelpers.success(result.data, 'Record created');
 * ```
 */

// Re-export common types that all adapters need
export type {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
  ListQueryParams,
  CrudOperation,
} from './types';

// Re-export shared utilities
export {
  ResponseHelpers,
  QueryHelpers,
  ContextHelpers,
  ValidationHelpers,
} from './helpers';

// Re-export CRUD operations
export {
  CrudOperations,
} from './crud';

// Re-export middleware builders
export {
  PermissionMiddleware,
  ValidationMiddleware,
  ErrorHandler,
} from './middleware';

// Re-export schema generators
export {
  OpenAPIGenerator,
  RouteGenerator,
} from './generators';

// Import for use in the base class
import { OpenAPIGenerator } from './generators';

/**
 * Framework Adapter Interface
 * 
 * All framework adapters should implement this interface to ensure consistency
 */
export interface FrameworkAdapter<TApp = any, TRequest = any, TResponse = any> {
  /** Framework-specific app instance */
  app: TApp;
  
  /** Register CRUD routes for an entity */
  registerEntityRoutes(entityName: string, options?: any): void;
  
  /** Handle incoming request */
  handleRequest(request: TRequest): Promise<TResponse>;
  
  /** Set up middleware */
  setupMiddleware(): void;
  
  /** Generate documentation */
  generateDocs?(): void;
}

/**
 * Base adapter class that framework adapters can extend
 */
export abstract class BaseFrameworkAdapter<TApp = any, TRequest = any, TResponse = any> 
  implements FrameworkAdapter<TApp, TRequest, TResponse> {
  
  constructor(public app: TApp) {}
  
  abstract registerEntityRoutes(entityName: string, options?: any): void;
  abstract handleRequest(request: TRequest): Promise<TResponse>;
  abstract setupMiddleware(): void;
  
  // Default implementation using shared generators
  generateDocs() {
    return OpenAPIGenerator.generateSpec();
  }
}