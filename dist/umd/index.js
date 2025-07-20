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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./schemakit", "./core/entity-manager", "./core/query-manager", "./core/validation-manager", "./core/permission-manager", "./core/workflow-manager", "./core/schema-loader", "./core/install-manager", "./core/entity-builder", "./core/query/query-builder", "./core/query/pagination-manager", "./core/query/query-executor", "./core/validators/type-validators", "./core/workflows/workflow-actions", "./core/file-loader", "./database/adapter", "./database/base-adapter", "./database/adapters/inmemory-simplified", "./database/adapters/postgres", "./database/adapters/sqlite", "./types", "./errors", "./utils/date-helpers", "./utils/id-generation", "./utils/json-helpers", "./utils/query-helpers", "./utils/validation-helpers"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SchemaKitError = exports.SQLiteAdapter = exports.PostgresAdapter = exports.InMemoryAdapter = exports.BaseAdapter = exports.DatabaseAdapter = exports.FileLoader = exports.WorkflowActions = exports.TypeValidators = exports.QueryExecutor = exports.PaginationManager = exports.QueryBuilder = exports.EntityBuilder = exports.InstallManager = exports.SchemaLoader = exports.WorkflowManager = exports.PermissionManager = exports.ValidationManager = exports.QueryManager = exports.EntityManager = exports.SchemaKit = void 0;
    // Core SchemaKit class (optimized)
    var schemakit_1 = require("./schemakit");
    Object.defineProperty(exports, "SchemaKit", { enumerable: true, get: function () { return schemakit_1.SchemaKit; } });
    // Core managers (optimized)
    var entity_manager_1 = require("./core/entity-manager");
    Object.defineProperty(exports, "EntityManager", { enumerable: true, get: function () { return entity_manager_1.EntityManager; } });
    var query_manager_1 = require("./core/query-manager");
    Object.defineProperty(exports, "QueryManager", { enumerable: true, get: function () { return query_manager_1.QueryManager; } });
    var validation_manager_1 = require("./core/validation-manager");
    Object.defineProperty(exports, "ValidationManager", { enumerable: true, get: function () { return validation_manager_1.ValidationManager; } });
    var permission_manager_1 = require("./core/permission-manager");
    Object.defineProperty(exports, "PermissionManager", { enumerable: true, get: function () { return permission_manager_1.PermissionManager; } });
    var workflow_manager_1 = require("./core/workflow-manager");
    Object.defineProperty(exports, "WorkflowManager", { enumerable: true, get: function () { return workflow_manager_1.WorkflowManager; } });
    var schema_loader_1 = require("./core/schema-loader");
    Object.defineProperty(exports, "SchemaLoader", { enumerable: true, get: function () { return schema_loader_1.SchemaLoader; } });
    var install_manager_1 = require("./core/install-manager");
    Object.defineProperty(exports, "InstallManager", { enumerable: true, get: function () { return install_manager_1.InstallManager; } });
    var entity_builder_1 = require("./core/entity-builder");
    Object.defineProperty(exports, "EntityBuilder", { enumerable: true, get: function () { return entity_builder_1.EntityBuilder; } });
    // Query components (new split)
    var query_builder_1 = require("./core/query/query-builder");
    Object.defineProperty(exports, "QueryBuilder", { enumerable: true, get: function () { return query_builder_1.QueryBuilder; } });
    var pagination_manager_1 = require("./core/query/pagination-manager");
    Object.defineProperty(exports, "PaginationManager", { enumerable: true, get: function () { return pagination_manager_1.PaginationManager; } });
    var query_executor_1 = require("./core/query/query-executor");
    Object.defineProperty(exports, "QueryExecutor", { enumerable: true, get: function () { return query_executor_1.QueryExecutor; } });
    // Validators (new split)
    var type_validators_1 = require("./core/validators/type-validators");
    Object.defineProperty(exports, "TypeValidators", { enumerable: true, get: function () { return type_validators_1.TypeValidators; } });
    // Workflows (new split)
    var workflow_actions_1 = require("./core/workflows/workflow-actions");
    Object.defineProperty(exports, "WorkflowActions", { enumerable: true, get: function () { return workflow_actions_1.WorkflowActions; } });
    // Core utilities
    var file_loader_1 = require("./core/file-loader");
    Object.defineProperty(exports, "FileLoader", { enumerable: true, get: function () { return file_loader_1.FileLoader; } });
    // Database adapters (optimized)
    var adapter_1 = require("./database/adapter");
    Object.defineProperty(exports, "DatabaseAdapter", { enumerable: true, get: function () { return adapter_1.DatabaseAdapter; } });
    var base_adapter_1 = require("./database/base-adapter");
    Object.defineProperty(exports, "BaseAdapter", { enumerable: true, get: function () { return base_adapter_1.BaseAdapter; } });
    var inmemory_simplified_1 = require("./database/adapters/inmemory-simplified");
    Object.defineProperty(exports, "InMemoryAdapter", { enumerable: true, get: function () { return inmemory_simplified_1.InMemoryAdapter; } });
    var postgres_1 = require("./database/adapters/postgres");
    Object.defineProperty(exports, "PostgresAdapter", { enumerable: true, get: function () { return postgres_1.PostgresAdapter; } });
    var sqlite_1 = require("./database/adapters/sqlite");
    Object.defineProperty(exports, "SQLiteAdapter", { enumerable: true, get: function () { return sqlite_1.SQLiteAdapter; } });
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
});
//# sourceMappingURL=index.js.map