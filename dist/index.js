"use strict";
/**
 * SchemaKit - Enterprise Schema Management Library
 *
 * Simple, focused API for entity management with enterprise architecture underneath.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.SchemaKitError = exports.SchemaLoader = exports.WorkflowActions = exports.TypeValidators = exports.PaginationManager = exports.QueryBuilder = exports.WorkflowManager = exports.PermissionManager = exports.ValidationManager = exports.Entity = exports.SchemaKit = void 0;
// Core SchemaKit class (optimized)
var schemakit_1 = require("./schemakit");
Object.defineProperty(exports, "SchemaKit", { enumerable: true, get: function () { return schemakit_1.SchemaKit; } });
// Legacy managers (organized by entities) - for backward compatibility
var entity_1 = require("./entities/entity");
Object.defineProperty(exports, "Entity", { enumerable: true, get: function () { return entity_1.Entity; } });
var validation_1 = require("./entities/validation");
Object.defineProperty(exports, "ValidationManager", { enumerable: true, get: function () { return validation_1.ValidationManager; } });
var permission_1 = require("./entities/permission");
Object.defineProperty(exports, "PermissionManager", { enumerable: true, get: function () { return permission_1.PermissionManager; } });
var workflow_1 = require("./entities/workflow");
Object.defineProperty(exports, "WorkflowManager", { enumerable: true, get: function () { return workflow_1.WorkflowManager; } });
// EntityBuilder has been removed - use EntityManager.entity() instead
// Query components (organized)
var query_1 = require("./entities/query");
Object.defineProperty(exports, "QueryBuilder", { enumerable: true, get: function () { return query_1.QueryBuilder; } });
var query_2 = require("./entities/query");
Object.defineProperty(exports, "PaginationManager", { enumerable: true, get: function () { return query_2.PaginationManager; } });
// Validators (organized)
var validation_2 = require("./entities/validation");
Object.defineProperty(exports, "TypeValidators", { enumerable: true, get: function () { return validation_2.TypeValidators; } });
// Workflows (organized)
var workflow_2 = require("./entities/workflow");
Object.defineProperty(exports, "WorkflowActions", { enumerable: true, get: function () { return workflow_2.WorkflowActions; } });
// Core utilities
var schema_loader_1 = require("./database/schema-loader");
Object.defineProperty(exports, "SchemaLoader", { enumerable: true, get: function () { return schema_loader_1.SchemaLoader; } });
// Database module (new structure) - Main gateway for all database operations
__exportStar(require("./database"), exports);
// Types (simplified)
__exportStar(require("./types"), exports);
// Errors
var errors_1 = require("./errors");
Object.defineProperty(exports, "SchemaKitError", { enumerable: true, get: function () { return errors_1.SchemaKitError; } });
// Utilities
__exportStar(require("./utils/date-helpers"), exports);
__exportStar(require("./utils/id-generation"), exports);
__exportStar(require("./utils/json-helpers"), exports);
__exportStar(require("./utils/query-helpers"), exports);
__exportStar(require("./utils/validation-helpers"), exports);
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
//# sourceMappingURL=index.js.map