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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../errors", "./adapters/sqlite", "./adapters/postgres", "./adapters/inmemory"], factory);
    }
})(function (require, exports) {
    "use strict";
    var __syncRequire = typeof module === "object" && typeof module.exports === "object";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseAdapter = void 0;
    /**
     * Database adapter interface and factory
     */
    const errors_1 = require("../errors");
    const sqlite_1 = require("./adapters/sqlite");
    const postgres_1 = require("./adapters/postgres");
    const inmemory_1 = require("./adapters/inmemory");
    /**
     * Abstract database adapter class
     */
    class DatabaseAdapter {
        /**
         * Create a new database adapter
         * @param config Configuration options
         */
        constructor(config = {}) {
            this.config = config;
        }
        /**
         * Create a database adapter instance
         * @param type Adapter type ('sqlite', 'postgres', or 'inmemory')
         * @param config Configuration options
         */
        static async create(type = 'sqlite', config = {}) {
            switch (type.toLowerCase()) {
                case 'sqlite':
                    // Import SQLiteAdapter using dynamic import
                    const { SQLiteAdapter } = await (__syncRequire ? Promise.resolve().then(() => __importStar(require('./adapters/sqlite'))) : new Promise((resolve_1, reject_1) => { require(['./adapters/sqlite'], resolve_1, reject_1); }).then(__importStar));
                    return new SQLiteAdapter(config);
                case 'postgres':
                    // Import PostgresAdapter using dynamic import
                    const { PostgresAdapter } = await (__syncRequire ? Promise.resolve().then(() => __importStar(require('./adapters/postgres'))) : new Promise((resolve_2, reject_2) => { require(['./adapters/postgres'], resolve_2, reject_2); }).then(__importStar));
                    return new PostgresAdapter(config);
                case 'inmemory':
                    // Import InMemoryAdapter using dynamic import
                    const { InMemoryAdapter } = await (__syncRequire ? Promise.resolve().then(() => __importStar(require('./adapters/inmemory'))) : new Promise((resolve_3, reject_3) => { require(['./adapters/inmemory'], resolve_3, reject_3); }).then(__importStar));
                    return new InMemoryAdapter(config);
                default:
                    throw new errors_1.DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
            }
        }
        /**
         * Create a database adapter instance synchronously (for backward compatibility)
         * @param type Adapter type ('sqlite', 'postgres', or 'inmemory')
         * @param config Configuration options
         */
        static createSync(type = 'sqlite', config = {}) {
            switch (type.toLowerCase()) {
                case 'sqlite':
                    return new sqlite_1.SQLiteAdapter(config);
                case 'postgres':
                    return new postgres_1.PostgresAdapter(config);
                case 'inmemory':
                    return new inmemory_1.InMemoryAdapter(config);
                default:
                    throw new errors_1.DatabaseError('create', new Error(`Unsupported adapter type: ${type}`));
            }
        }
    }
    exports.DatabaseAdapter = DatabaseAdapter;
});
//# sourceMappingURL=adapter.js.map