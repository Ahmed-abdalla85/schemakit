/**
 * Base error class for SchemaKit errors
 */
export declare class SchemaKitError extends Error {
    constructor(message: string);
}
/**
 * Error thrown when validation fails
 */
export declare class ValidationError extends SchemaKitError {
    entityName: string;
    errors: ValidationErrorDetail[];
    constructor(errors: ValidationErrorDetail[], entityName: string);
}
/**
 * Error thrown when a schema operation fails
 */
export declare class SchemaError extends SchemaKitError {
    entityName: string;
    constructor(message: string, entityName: string);
}
/**
 * Error thrown when an entity is not found
 */
export declare class EntityNotFoundError extends SchemaKitError {
    entityName: string;
    id: string | number;
    constructor(entityName: string, id: string | number);
}
/**
 * Error thrown when permission is denied
 */
export declare class PermissionError extends SchemaKitError {
    action: string;
    entityName: string;
    context: Record<string, any>;
    constructor(action: string, entityName: string, context: Record<string, any>);
}
/**
 * Error thrown when a workflow operation fails
 */
export declare class WorkflowError extends SchemaKitError {
    workflowName: string;
    action: string;
    originalError: Error;
    constructor(workflowName: string, action: string, originalError: Error);
}
/**
 * Error thrown when schema loading fails
 */
export declare class SchemaLoadError extends SchemaKitError {
    entityName: string;
    cause: Error | unknown;
    constructor(entityName: string, cause: Error | unknown);
}
/**
 * Error thrown when database operations fail
 */
export declare class DatabaseError extends SchemaKitError {
    operation: string;
    cause: Error | unknown;
    constructor(operation: string, cause: Error | unknown);
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
