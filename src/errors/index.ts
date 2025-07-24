/**
 * @fileoverview Comprehensive error handling system for SchemaKit
 * 
 * This module provides a hierarchical error system with:
 * - Structured error codes and types
 * - Rich context and cause chaining
 * - HTTP status code mapping
 * - Type guards for error handling
 * 
 * @version 1.0.0
 */

/**
 * Standard error codes used throughout SchemaKit.
 * These codes help identify specific error conditions programmatically.
 * 
 * @enum {string}
 * @readonly
 */
export enum ErrorCode {
  // General errors
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Workflow errors
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  
  // Schema errors
  SCHEMA_ERROR = 'SCHEMA_ERROR',
  SCHEMA_LOAD_ERROR = 'SCHEMA_LOAD_ERROR',
}

/**
 * Base error class for all SchemaKit errors.
 * Provides consistent error handling and structure across the application.
 * 
 * @class SchemaKitError
 * @extends Error
 * @param {string} message - Human-readable error message
 * @param {Object} [options] - Error options
 * @param {string} [options.code=ErrorCode.UNEXPECTED_ERROR] - Error code for programmatic handling
 * @param {Error|unknown} [options.cause] - Original error that caused this error
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Creating a basic error
 * throw new SchemaKitError('Something went wrong');
 * 
 * // With additional context
 * throw new SchemaKitError('Invalid configuration', {
 *   code: ErrorCode.CONFIGURATION_ERROR,
 *   context: { config: {...} }
 * });
 */
export class SchemaKitError extends Error {
  public code?: string;
  public context?: Record<string, any>;
  public cause?: Error | unknown;

  constructor(
    message: string,
    options?: {
      code?: string;
      context?: Record<string, any>;
      cause?: Error | unknown;
    }
  ) {
    super(message);
    this.name = 'SchemaKitError';
    if (options?.cause !== undefined) {
      (this as any).cause = options.cause;
    }
    if (options?.code) this.code = options.code;
    if (options?.context) this.context = options.context;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      cause: this.cause instanceof Error
        ? (typeof (this.cause as any).toJSON === 'function'
            ? (this.cause as any).toJSON()
            : { name: this.cause.name, message: this.cause.message, stack: this.cause.stack })
        : this.cause,
    };
  }

  getContext(): Record<string, any> {
    return this.context || {};
  }
}

/**
 * Error thrown when data validation fails.
 * 
 * @class ValidationError
 * @extends SchemaKitError
 * @param {ValidationErrorDetail[]} errors - Array of validation errors
 * @param {string} entityName - Name of the entity being validated
 * @param {Object} [options] - Error options
 * @param {Error|unknown} [options.cause] - Original error that caused this error
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Throwing a validation error
 * if (!isValidEmail(email)) {
 *   throw new ValidationError(
 *     [{ field: 'email', code: 'INVALID_EMAIL', message: 'Invalid email format' }],
 *     'User',
 *     { context: { userId: 123 } }
 *   );
 * }
 */
export class ValidationError extends SchemaKitError {
  static readonly ERROR_CODE = ErrorCode.VALIDATION_FAILED;
  entityName: string;
  errors: ValidationErrorDetail[];

  constructor(
    errors: ValidationErrorDetail[], 
    entityName: string, 
    options: { cause?: Error | unknown; context?: Record<string, any> } = {}
  ) {
    super('Validation failed', {
      code: ValidationError.ERROR_CODE,
      cause: options.cause,
      context: { 
        entityName,
        errorCount: errors.length,
        ...options.context 
      }
    });
    this.name = 'ValidationError';
    this.entityName = entityName;
    this.errors = errors;
  }
}

/**
 * Error thrown when a schema-related operation fails.
 * 
 * @class SchemaError
 * @extends SchemaKitError
 * @param {string} message - Error message
 * @param {string} entityName - Name of the entity related to the schema error
 * @param {Object} [options] - Error options
 * @param {Error|unknown} [options.cause] - Original error that caused this error
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Throwing a schema error
 * if (!schemaExists(schemaName)) {
 *   throw new SchemaError(
 *     `Schema '${schemaName}' does not exist`,
 *     'User',
 *     { cause: originalError }
 *   );
 * }
 */
export class SchemaError extends SchemaKitError {
  static readonly ERROR_CODE = ErrorCode.SCHEMA_ERROR;
  entityName: string;

  constructor(
    message: string, 
    entityName: string, 
    options: { cause?: Error | unknown; context?: Record<string, any> } = {}
  ) {
    super(message, {
      code: SchemaError.ERROR_CODE,
      cause: options.cause,
      context: { 
        entityName,
        ...options.context 
      }
    });
    this.name = 'SchemaError';
    this.entityName = entityName;
  }
}

/**
 * Error thrown when a requested entity cannot be found.
 * 
 * @class EntityNotFoundError
 * @extends SchemaKitError
 * @param {string} entityName - Name of the entity that wasn't found
 * @param {string|number} id - ID of the entity that wasn't found
 * @param {Object} [options] - Error options
 * @param {Error|unknown} [options.cause] - Original error that caused this error
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Throwing a not found error
 * const user = await findUser(userId);
 * if (!user) {
 *   throw new EntityNotFoundError('User', userId);
 * }
 */
export class EntityNotFoundError extends SchemaKitError {
  static readonly ERROR_CODE = ErrorCode.NOT_FOUND;
  entityName: string;
  id: string | number;

  constructor(
    entityName: string, 
    id: string | number, 
    options: { cause?: Error | unknown; context?: Record<string, any> } = {}
  ) {
    super(`Entity ${entityName} with id ${id} not found`, {
      code: EntityNotFoundError.ERROR_CODE,
      cause: options.cause,
      context: { 
        entityName,
        id,
        ...options.context 
      }
    });
    this.name = 'EntityNotFoundError';
    this.entityName = entityName;
    this.id = id;
  }
}

/**
 * Error thrown when a user lacks permission to perform an action.
 * 
 * @class PermissionError
 * @extends SchemaKitError
 * @param {string} action - The action that was attempted (e.g., 'read', 'update')
 * @param {string} entityName - The entity type the action was attempted on
 * @param {Object} [options] - Error options
 * @param {Error|unknown} [options.cause] - Original error that caused this error
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Throwing a permission error
 * if (!hasPermission(user, 'delete', 'User')) {
 *   throw new PermissionError('delete', 'User', {
 *     context: { userId: user.id, targetUserId: targetUser.id }
 *   });
 * }
 */
export class PermissionError extends SchemaKitError {
  static readonly ERROR_CODE = ErrorCode.PERMISSION_DENIED;
  action: string;
  entityName: string;

  constructor(
    action: string, 
    entityName: string, 
    options: { cause?: Error | unknown; context?: Record<string, any> } = {}
  ) {
    super(`Permission denied for ${action} on ${entityName}`, {
      code: PermissionError.ERROR_CODE,
      cause: options.cause,
      context: { 
        action,
        entityName,
        ...options.context 
      }
    });
    this.name = 'PermissionError';
    this.action = action;
    this.entityName = entityName;
  }
}

/**
 * Error thrown when a workflow operation fails.
 * 
 * @class WorkflowError
 * @extends SchemaKitError
 * @param {string} workflowName - Name of the workflow that failed
 * @param {string} action - The workflow action that was being executed
 * @param {Object} [options] - Error options
 * @param {Error|unknown} [options.cause] - Original error that caused the workflow to fail
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Throwing a workflow error
 * try {
 *   await executeWorkflow('user_registration', userData);
 * } catch (error) {
 *   throw new WorkflowError(
 *     'user_registration',
 *     'send_welcome_email',
 *     { cause: error, context: { userId: userData.id } }
 *   );
 * }
 */
export class WorkflowError extends SchemaKitError {
  static readonly ERROR_CODE = ErrorCode.WORKFLOW_ERROR;
  workflowName: string;
  action: string;

  constructor(
    workflowName: string, 
    action: string, 
    options: { cause?: Error | unknown; context?: Record<string, any> } = {}
  ) {
    super(`Workflow ${workflowName} failed at action ${action}`, {
      code: WorkflowError.ERROR_CODE,
      cause: options.cause,
      context: { 
        workflowName,
        action,
        ...options.context 
      }
    });
    this.name = 'WorkflowError';
    this.workflowName = workflowName;
    this.action = action;
  }
}

/**
 * Error thrown when there's a failure loading a schema.
 * 
 * @class SchemaLoadError
 * @extends SchemaKitError
 * @param {string} entityName - Name of the entity whose schema failed to load
 * @param {Object} [options] - Error options
 * @param {Error|unknown} [options.cause] - Original error that caused the load to fail
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Throwing a schema load error
 * try {
 *   await loadSchema('User');
 * } catch (error) {
 *   throw new SchemaLoadError('User', { cause: error });
 * }
 */
export class SchemaLoadError extends SchemaKitError {
  static readonly ERROR_CODE = ErrorCode.SCHEMA_LOAD_ERROR;
  entityName: string;

  constructor(
    entityName: string, 
    options: { cause?: Error | unknown; context?: Record<string, any> } = {}
  ) {
    super(`Failed to load schema for entity ${entityName}`, {
      code: SchemaLoadError.ERROR_CODE,
      cause: options.cause,
      context: { 
        entityName,
        ...options.context 
      }
    });
    this.name = 'SchemaLoadError';
    this.entityName = entityName;
  }
}

/**
 * Error thrown when a database operation fails.
 * 
 * @class DatabaseError
 * @extends SchemaKitError
 * @param {string} operation - The database operation that failed (e.g., 'query', 'insert')
 * @param {Object} [options] - Error options
 * @param {Error|unknown} [options.cause] - Original database error
 * @param {Record<string, any>} [options.context] - Additional context about the error
 * 
 * @example
 * // Throwing a database error
 * try {
 *   await db.query('SELECT * FROM users');
 * } catch (error) {
 *   throw new DatabaseError('query', {
 *     cause: error,
 *     context: { query: 'SELECT * FROM users' }
 *   });
 * }
 */
export class DatabaseError extends SchemaKitError {
  static readonly ERROR_CODE = ErrorCode.DATABASE_ERROR;
  operation: string;

  constructor(
    operation: string, 
    options: { cause?: Error | unknown; context?: Record<string, any> } = {}
  ) {
    const message = options.cause instanceof Error 
      ? `Database operation '${operation}' failed: ${options.cause.message}`
      : `Database operation '${operation}' failed`;
      
    super(message, {
      code: DatabaseError.ERROR_CODE,
      cause: options.cause,
      context: { 
        operation,
        ...options.context 
      }
    });
    this.name = 'DatabaseError';
    this.operation = operation;
  }
}

/**
 * Describes a single validation error.
 * 
 * @interface ValidationErrorDetail
 * @property {string} field - The field that failed validation
 * @property {string} code - A machine-readable error code
 * @property {string} message - Human-readable error message
 * @property {any} [value] - The value that failed validation (optional)
 * 
 * @example
 * {
 *   field: 'email',
 *   code: 'INVALID_EMAIL',
 *   message: 'Must be a valid email address',
 *   value: 'not-an-email'
 * }
 */
export interface ValidationErrorDetail {
  field: string;
  code: string;
  message: string;
  value?: any;
}

/**
 * Type guard to check if an error is a SchemaKitError.
 * 
 * @param {any} err - The error to check
 * @returns {boolean} True if the error is a SchemaKitError
 * 
 * @example
 * try {
 *   // some operation
 * } catch (error) {
 *   if (isSchemaKitError(error)) {
 *     // Handle SchemaKitError
 *     console.error('SchemaKit Error:', error.code, error.message);
 *   }
 * }
 */
export function isSchemaKitError(err: any): err is SchemaKitError {
  return err instanceof SchemaKitError;
}
export function isValidationError(err: any): err is ValidationError {
  return err instanceof ValidationError;
}
export function isSchemaError(err: any): err is SchemaError {
  return err instanceof SchemaError;
}
export function isEntityNotFoundError(err: any): err is EntityNotFoundError {
  return err instanceof EntityNotFoundError;
}
export function isPermissionError(err: any): err is PermissionError {
  return err instanceof PermissionError;
}
export function isWorkflowError(err: any): err is WorkflowError {
  return err instanceof WorkflowError;
}
export function isSchemaLoadError(err: any): err is SchemaLoadError {
  return err instanceof SchemaLoadError;
}
export function isDatabaseError(err: any): err is DatabaseError {
  return err instanceof DatabaseError;
}

/**
 * Maps SchemaKit error codes to appropriate HTTP status codes.
 * 
 * @param {ErrorCode} code - The error code to map
 * @returns {number} The corresponding HTTP status code
 * 
 * @example
 * // Using with Express error handler
 * app.use((err, req, res, next) => {
 *   const status = isSchemaKitError(err) 
 *     ? getHttpStatus(err.code as ErrorCode) 
 *     : 500;
 *   res.status(status).json({
 *     error: {
 *       code: err.code,
 *       message: err.message,
 *       ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
 *     }
 *   });
 * });
 */
export function getHttpStatus(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.VALIDATION_FAILED: return 422;
    case ErrorCode.PERMISSION_DENIED: return 403;
    case ErrorCode.NOT_FOUND: return 404;
    case ErrorCode.DUPLICATE_ENTRY: return 409;
    case ErrorCode.CONFIGURATION_ERROR:
    case ErrorCode.SCHEMA_ERROR:
    case ErrorCode.SCHEMA_LOAD_ERROR:
    case ErrorCode.WORKFLOW_ERROR:
    case ErrorCode.DATABASE_ERROR:
    default:
      return 500;
  }
}