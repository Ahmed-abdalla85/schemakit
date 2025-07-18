/**
 * Base error class for SchemaKit errors
 */
export class SchemaKitError extends Error {
    constructor(message) {
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
    constructor(errors, entityName) {
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
    constructor(message, entityName) {
        super(message);
        this.name = 'SchemaError';
        this.entityName = entityName;
    }
}
/**
 * Error thrown when an entity is not found
 */
export class EntityNotFoundError extends SchemaKitError {
    constructor(entityName, id) {
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
    constructor(action, entityName, context) {
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
    constructor(workflowName, action, originalError) {
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
    constructor(entityName, cause) {
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
    constructor(operation, cause) {
        super(`Database operation '${operation}' failed`);
        this.name = 'DatabaseError';
        this.operation = operation;
        this.cause = cause;
    }
}
//# sourceMappingURL=index.js.map