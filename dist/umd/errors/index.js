(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.SchemaLoadError = exports.WorkflowError = exports.PermissionError = exports.EntityNotFoundError = exports.SchemaError = exports.ValidationError = exports.SchemaKitError = void 0;
    /**
     * Base error class for SchemaKit errors
     */
    class SchemaKitError extends Error {
        constructor(message) {
            super(message);
            this.name = 'SchemaKitError';
            // Maintains proper stack trace for where our error was thrown (only available on V8)
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, SchemaKitError);
            }
        }
    }
    exports.SchemaKitError = SchemaKitError;
    /**
     * Error thrown when validation fails
     */
    class ValidationError extends SchemaKitError {
        constructor(errors, entityName) {
            super('Validation failed');
            this.name = 'ValidationError';
            this.entityName = entityName;
            this.errors = errors;
        }
    }
    exports.ValidationError = ValidationError;
    /**
     * Error thrown when a schema operation fails
     */
    class SchemaError extends SchemaKitError {
        constructor(message, entityName) {
            super(message);
            this.name = 'SchemaError';
            this.entityName = entityName;
        }
    }
    exports.SchemaError = SchemaError;
    /**
     * Error thrown when an entity is not found
     */
    class EntityNotFoundError extends SchemaKitError {
        constructor(entityName, id) {
            super(`Entity ${entityName} with id ${id} not found`);
            this.name = 'EntityNotFoundError';
            this.entityName = entityName;
            this.id = id;
        }
    }
    exports.EntityNotFoundError = EntityNotFoundError;
    /**
     * Error thrown when permission is denied
     */
    class PermissionError extends SchemaKitError {
        constructor(action, entityName, context) {
            super(`Permission denied for ${action} on ${entityName}`);
            this.name = 'PermissionError';
            this.action = action;
            this.entityName = entityName;
            this.context = context;
        }
    }
    exports.PermissionError = PermissionError;
    /**
     * Error thrown when a workflow operation fails
     */
    class WorkflowError extends SchemaKitError {
        constructor(workflowName, action, originalError) {
            super(`Workflow ${workflowName} failed at action ${action}`);
            this.name = 'WorkflowError';
            this.workflowName = workflowName;
            this.action = action;
            this.originalError = originalError;
        }
    }
    exports.WorkflowError = WorkflowError;
    /**
     * Error thrown when schema loading fails
     */
    class SchemaLoadError extends SchemaKitError {
        constructor(entityName, cause) {
            super(`Failed to load schema for entity ${entityName}`);
            this.name = 'SchemaLoadError';
            this.entityName = entityName;
            this.cause = cause;
        }
    }
    exports.SchemaLoadError = SchemaLoadError;
    /**
     * Error thrown when database operations fail
     */
    class DatabaseError extends SchemaKitError {
        constructor(operation, cause) {
            super(`Database operation '${operation}' failed`);
            this.name = 'DatabaseError';
            this.operation = operation;
            this.cause = cause;
        }
    }
    exports.DatabaseError = DatabaseError;
});
//# sourceMappingURL=index.js.map