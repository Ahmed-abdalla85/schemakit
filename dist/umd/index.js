/**
 * SchemaKit - Dynamic entity management system
 *
 * A comprehensive system for runtime entity creation, validation, and CRUD operations
 * with support for permissions, workflows, and dynamic query building.
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
        define(["require", "exports", "./errors", "./types", "./database/adapter", "./schemakit-new", "./core/schema-loader", "./core/entity-manager", "./core/validation-manager", "./core/permission-manager", "./core/query-builder", "./core/workflow-manager", "./schemakit"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SchemaKitLegacy = exports.WorkflowManager = exports.QueryManager = exports.PermissionManager = exports.ValidationManager = exports.EntityManager = exports.SchemaLoader = void 0;
    // Export all error types
    __exportStar(require("./errors"), exports);
    // Export core types
    __exportStar(require("./types"), exports);
    // Export database adapters
    __exportStar(require("./database/adapter"), exports);
    // Export main SchemaKit class (new modular version)
    __exportStar(require("./schemakit-new"), exports);
    // Export core modules for advanced usage
    var schema_loader_1 = require("./core/schema-loader");
    Object.defineProperty(exports, "SchemaLoader", { enumerable: true, get: function () { return schema_loader_1.SchemaLoader; } });
    var entity_manager_1 = require("./core/entity-manager");
    Object.defineProperty(exports, "EntityManager", { enumerable: true, get: function () { return entity_manager_1.EntityManager; } });
    var validation_manager_1 = require("./core/validation-manager");
    Object.defineProperty(exports, "ValidationManager", { enumerable: true, get: function () { return validation_manager_1.ValidationManager; } });
    var permission_manager_1 = require("./core/permission-manager");
    Object.defineProperty(exports, "PermissionManager", { enumerable: true, get: function () { return permission_manager_1.PermissionManager; } });
    var query_builder_1 = require("./core/query-builder");
    Object.defineProperty(exports, "QueryManager", { enumerable: true, get: function () { return query_builder_1.QueryManager; } });
    var workflow_manager_1 = require("./core/workflow-manager");
    Object.defineProperty(exports, "WorkflowManager", { enumerable: true, get: function () { return workflow_manager_1.WorkflowManager; } });
    // Keep the old SchemaKit class for backward compatibility
    var schemakit_1 = require("./schemakit");
    Object.defineProperty(exports, "SchemaKitLegacy", { enumerable: true, get: function () { return schemakit_1.SchemaKit; } });
});
//# sourceMappingURL=index.js.map