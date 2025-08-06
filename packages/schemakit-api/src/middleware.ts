/**
 * Shared middleware builders for framework adapters
 * 
 * These provide reusable patterns for permissions, validation, and error handling
 * that can be adapted to any framework's middleware system.
 */

// Note: This would normally import from '@mobtakronio/schemakit' but for build purposes we'll use placeholder
import { ResponseHelpers } from './helpers';
import type { GenericRequest, GenericResponse } from './types';

// Placeholder type for Context (in real implementation this would be imported)
type Context = any;

/**
 * Permission middleware builder
 */
export class PermissionMiddleware {
  /**
   * Create a permission checker that can be adapted to any framework
   */
  static createChecker(options: {
    contextExtractor: (request: GenericRequest) => Context | Promise<Context>;
    entityName: string;
    operation: 'create' | 'read' | 'update' | 'delete';
  }) {
    return async (request: GenericRequest): Promise<{ allowed: boolean; error?: any }> => {
      try {
        const context = await options.contextExtractor(request);
        
        // This would integrate with SchemaKit's permission system
        // For now, return a placeholder implementation
        const allowed = context.user?.role !== 'banned';
        
        return { allowed };
      } catch (error) {
        return { 
          allowed: false, 
          error: ResponseHelpers.error(error as Error, 'Permission check failed')
        };
      }
    };
  }
}

/**
 * Validation middleware builder
 */
export class ValidationMiddleware {
  /**
   * Create a request validator that can be adapted to any framework
   */
  static createValidator(options: {
    validateParams?: (params: any) => { valid: boolean; errors?: string[] };
    validateQuery?: (query: any) => { valid: boolean; errors?: string[] };
    validateBody?: (body: any) => { valid: boolean; errors?: string[] };
  }) {
    return (request: GenericRequest): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      if (options.validateParams) {
        const result = options.validateParams(request.params);
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
      }
      
      if (options.validateQuery) {
        const result = options.validateQuery(request.query);
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
      }
      
      if (options.validateBody) {
        const result = options.validateBody(request.body);
        if (!result.valid && result.errors) {
          errors.push(...result.errors);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    };
  }
}

/**
 * Error handler builder
 */
export class ErrorHandler {
  /**
   * Create a standardized error handler
   */
  static createHandler(options?: {
    logErrors?: boolean;
    includeStack?: boolean;
    customFormatter?: (error: Error) => any;
  }) {
    return (error: Error, entityName?: string, operation?: string): GenericResponse => {
      if (options?.logErrors) {
        console.error(`SchemaKit Error [${entityName}:${operation}]:`, error);
      }
      
      if (options?.customFormatter) {
        return {
          status: 500,
          body: options.customFormatter(error)
        };
      }
      
      const response = ResponseHelpers.error(error);
      
      if (options?.includeStack) {
        (response as any).stack = error.stack;
      }
      
      return {
        status: 500,
        body: response
      };
    };
  }
  
  /**
   * Create a not found handler
   */
  static createNotFoundHandler(message = 'Resource not found'): GenericResponse {
    return {
      status: 404,
      body: ResponseHelpers.error(message, 'Not Found')
    };
  }
  
  /**
   * Create a validation error handler
   */
  static createValidationErrorHandler(errors: string[]): GenericResponse {
    return {
      status: 400,
      body: ResponseHelpers.error(errors.join(', '), 'Validation Error')
    };
  }
}