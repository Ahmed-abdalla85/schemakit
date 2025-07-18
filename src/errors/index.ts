/**
 * Base error class for SchemaKit errors
 */
export class SchemaKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaKitError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchemaKitError);
    }
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends SchemaKitError {
  entityName: string;
  errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[], entityName: string) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.entityName = entityName;
    this.errors = errors;
  }
}

/**
 * Error thrown when a schema operation fails
 */
export class SchemaError extends SchemaKitError {
  entityName: string;

  constructor(message: string, entityName: string) {
    super(message);
    this.name = 'SchemaError';
    this.entityName = entityName;
  }
}

/**
 * Error thrown when an entity is not found
 */
export class EntityNotFoundError extends SchemaKitError {
  entityName: string;
  id: string | number;

  constructor(entityName: string, id: string | number) {
    super(`Entity ${entityName} with id ${id} not found`);
    this.name = 'EntityNotFoundError';
    this.entityName = entityName;
    this.id = id;
  }
}

/**
 * Error thrown when permission is denied
 */
export class PermissionError extends SchemaKitError {
  action: string;
  entityName: string;
  context: Record<string, any>;

  constructor(action: string, entityName: string, context: Record<string, any>) {
    super(`Permission denied for ${action} on ${entityName}`);
    this.name = 'PermissionError';
    this.action = action;
    this.entityName = entityName;
    this.context = context;
  }
}

/**
 * Error thrown when a workflow operation fails
 */
export class WorkflowError extends SchemaKitError {
  workflowName: string;
  action: string;
  originalError: Error;

  constructor(workflowName: string, action: string, originalError: Error) {
    super(`Workflow ${workflowName} failed at action ${action}`);
    this.name = 'WorkflowError';
    this.workflowName = workflowName;
    this.action = action;
    this.originalError = originalError;
  }
}

/**
 * Error thrown when schema loading fails
 */
export class SchemaLoadError extends SchemaKitError {
  entityName: string;
  cause: Error | unknown;

  constructor(entityName: string, cause: Error | unknown) {
    super(`Failed to load schema for entity ${entityName}`);
    this.name = 'SchemaLoadError';
    this.entityName = entityName;
    this.cause = cause;
  }
}

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends SchemaKitError {
  operation: string;
  cause: Error | unknown;

  constructor(operation: string, cause: Error | unknown) {
    super(`Database operation '${operation}' failed`);
    this.name = 'DatabaseError';
    this.operation = operation;
    this.cause = cause;
  }
}

/**
 * Validation error detail interface
 */
export interface ValidationErrorDetail {
  field: string;
  code: string;
  message: string;
  value?: any;
}