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
        define(["require", "exports", "../errors", "fs", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SchemaLoader = void 0;
    const errors_1 = require("../errors");
    const fs = __importStar(require("fs"));
    const path = __importStar(require("path"));
    /**
     * Schema Loader class
     */
    class SchemaLoader {
        constructor(databaseAdapter, options = {}) {
            this.entityCache = new Map();
            this.isInstalled = null;
            this.databaseAdapter = databaseAdapter;
            this.options = {
                cache: {
                    enabled: true,
                    ttl: 3600000 // 1 hour
                },
                sqlPath: path.join(__dirname, '../../sql'),
                version: '1.0.0',
                ...options
            };
        }
        /**
         * Load entity configuration from database
         * @param entityName Entity name
         * @param context User context
         */
        async loadEntity(entityName, context = {}) {
            // Check if entity is already in cache
            if (this.options.cache?.enabled && this.entityCache.has(entityName)) {
                return this.entityCache.get(entityName);
            }
            try {
                // Ensure database connection
                if (!this.databaseAdapter.isConnected()) {
                    await this.databaseAdapter.connect();
                }
                // Check if SchemaKit is installed, install if not
                await this.ensureInstallation();
                // Load entity definition
                const entityDef = await this.loadEntityDefinition(entityName);
                if (!entityDef) {
                    throw new errors_1.SchemaKitError(`Entity '${entityName}' not found`);
                }
                // Load fields
                const fields = await this.loadEntityFields(entityDef.id);
                // Load permissions
                const permissions = await this.loadEntityPermissions(entityDef.id, context);
                // Load views
                const views = await this.loadEntityViews(entityDef.id);
                // Load workflows
                const workflows = await this.loadEntityWorkflows(entityDef.id);
                // Load RLS (Row Level Security)
                const rls = await this.loadEntityRLS(entityDef.id, context);
                // Create entity configuration
                const entityConfig = {
                    entity: entityDef,
                    fields,
                    permissions,
                    views,
                    workflows,
                    rls
                };
                // Store in cache if enabled
                if (this.options.cache?.enabled) {
                    this.entityCache.set(entityName, entityConfig);
                }
                return entityConfig;
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to load entity '${entityName}': ${error}`);
            }
        }
        /**
         * Reload entity configuration from database
         * @param entityName Entity name
         */
        async reloadEntity(entityName) {
            // Remove from cache if present
            if (this.entityCache.has(entityName)) {
                this.entityCache.delete(entityName);
            }
            // Load fresh entity configuration
            return this.loadEntity(entityName);
        }
        /**
         * Get loaded entity names
         */
        getLoadedEntities() {
            return Array.from(this.entityCache.keys());
        }
        /**
         * Ensure SchemaKit is installed
         * @private
         */
        async ensureInstallation() {
            // Check if already checked in this session
            if (this.isInstalled === true) {
                return;
            }
            try {
                // Check if installation table exists and has data
                const installationInfo = await this.getInstallationInfo();
                if (!installationInfo) {
                    // Not installed, run installation
                    await this.install();
                    this.isInstalled = true;
                }
                else {
                    // Already installed, check if version update is needed
                    if (installationInfo.version !== this.options.version) {
                        await this.updateVersion(installationInfo.version, this.options.version);
                    }
                    this.isInstalled = true;
                }
            }
            catch (error) {
                // If there's an error checking installation, try to install
                console.warn('Error checking installation, attempting to install:', error);
                await this.install();
                this.isInstalled = true;
            }
        }
        /**
         * Get installation information
         * @private
         */
        async getInstallationInfo() {
            try {
                // Check if installation table exists
                const tableExists = await this.databaseAdapter.tableExists('system_installation');
                if (!tableExists) {
                    return null;
                }
                // Get installation info
                const results = await this.databaseAdapter.query('SELECT * FROM system_installation WHERE id = 1');
                return results.length > 0 ? results[0] : null;
            }
            catch (error) {
                // If there's an error, assume not installed
                return null;
            }
        }
        /**
         * Install SchemaKit by running schema and seed SQL files
         * @private
         */
        async install() {
            try {
                console.log('Installing SchemaKit...');
                // Run schema SQL
                await this.runSqlFile('schema.sql');
                console.log('Schema installed successfully');
                // Run seed SQL
                await this.runSqlFile('seed.sql');
                console.log('Seed data installed successfully');
                console.log('SchemaKit installation completed');
            }
            catch (error) {
                throw new errors_1.SchemaKitError(`Failed to install SchemaKit: ${error}`);
            }
        }
        /**
         * Update SchemaKit version
         * @param fromVersion Current version
         * @param toVersion Target version
         * @private
         */
        async updateVersion(fromVersion, toVersion) {
            try {
                console.log(`Updating SchemaKit from version ${fromVersion} to ${toVersion}...`);
                // Update version in installation table
                await this.databaseAdapter.execute('UPDATE system_installation SET version = ?, updated_at = datetime(\'now\') WHERE id = 1', [toVersion]);
                console.log('SchemaKit version updated successfully');
            }
            catch (error) {
                console.warn(`Failed to update SchemaKit version: ${error}`);
            }
        }
        /**
         * Run SQL file
         * @param filename SQL file name
         * @private
         */
        async runSqlFile(filename) {
            try {
                const sqlPath = path.join(this.options.sqlPath, filename);
                // Check if file exists
                if (!fs.existsSync(sqlPath)) {
                    throw new Error(`SQL file not found: ${sqlPath}`);
                }
                // Read SQL file
                const sqlContent = fs.readFileSync(sqlPath, 'utf8');
                // Split SQL content into individual statements
                const statements = this.splitSqlStatements(sqlContent);
                // Execute each statement
                for (const statement of statements) {
                    if (statement.trim()) {
                        await this.databaseAdapter.execute(statement);
                    }
                }
            }
            catch (error) {
                throw new Error(`Failed to run SQL file ${filename}: ${error}`);
            }
        }
        /**
         * Split SQL content into individual statements
         * @param sqlContent SQL content
         * @private
         */
        splitSqlStatements(sqlContent) {
            // Remove comments and split by semicolon
            const cleanSql = sqlContent
                .replace(/--.*$/gm, '') // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
                .trim();
            // Split by semicolon, but be careful about semicolons in strings
            const statements = [];
            let currentStatement = '';
            let inString = false;
            let stringChar = '';
            for (let i = 0; i < cleanSql.length; i++) {
                const char = cleanSql[i];
                const prevChar = i > 0 ? cleanSql[i - 1] : '';
                if (!inString && (char === '"' || char === "'")) {
                    inString = true;
                    stringChar = char;
                }
                else if (inString && char === stringChar && prevChar !== '\\') {
                    inString = false;
                    stringChar = '';
                }
                else if (!inString && char === ';') {
                    statements.push(currentStatement.trim());
                    currentStatement = '';
                    continue;
                }
                currentStatement += char;
            }
            // Add the last statement if it exists
            if (currentStatement.trim()) {
                statements.push(currentStatement.trim());
            }
            return statements.filter(stmt => stmt.length > 0);
        }
        /**
         * Check if SchemaKit is installed
         */
        async isSchemaKitInstalled() {
            const installationInfo = await this.getInstallationInfo();
            return installationInfo !== null;
        }
        /**
         * Get SchemaKit version
         */
        async getSchemaKitVersion() {
            const installationInfo = await this.getInstallationInfo();
            return installationInfo?.version || null;
        }
        /**
         * Force reinstall SchemaKit (useful for development/testing)
         */
        async reinstall() {
            this.isInstalled = null;
            await this.install();
            this.isInstalled = true;
        }
        /**
         * Load entity definition from database
         * @param entityName Entity name
         * @private
         */
        async loadEntityDefinition(entityName) {
            const entities = await this.databaseAdapter.query('SELECT * FROM system_entities WHERE name = ? AND is_active = ?', [entityName, true]);
            if (entities.length === 0) {
                return null;
            }
            const entity = entities[0];
            // Parse metadata JSON if present
            if (entity.metadata && typeof entity.metadata === 'string') {
                try {
                    entity.metadata = JSON.parse(entity.metadata);
                }
                catch (e) {
                    // If JSON parsing fails, keep as string
                }
            }
            return entity;
        }
        /**
         * Load entity fields from database
         * @param entityId Entity ID
         * @private
         */
        async loadEntityFields(entityId) {
            const fields = await this.databaseAdapter.query('SELECT * FROM system_fields WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC', [entityId, true]);
            // Parse JSON fields
            return fields.map(field => {
                // Parse validation_rules JSON if present
                if (field.validation_rules && typeof field.validation_rules === 'string') {
                    try {
                        field.validation_rules = JSON.parse(field.validation_rules);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                // Parse metadata JSON if present
                if (field.metadata && typeof field.metadata === 'string') {
                    try {
                        field.metadata = JSON.parse(field.metadata);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                return field;
            });
        }
        /**
         * Load entity permissions from database
         * @param entityId Entity ID
         * @param context User context
         * @private
         */
        async loadEntityPermissions(entityId, context) {
            // Get user roles from context
            const userRoles = context.user?.roles || [];
            // If no roles specified, load all permissions
            const params = [entityId];
            let roleCondition = '';
            if (userRoles.length > 0) {
                roleCondition = `AND role IN (${userRoles.map(() => '?').join(', ')})`;
                params.push(...userRoles);
            }
            const permissions = await this.databaseAdapter.query(`SELECT * FROM system_permissions WHERE entity_id = ? ${roleCondition}`, params);
            // Parse JSON fields
            return permissions.map(permission => {
                // Parse conditions JSON if present
                if (permission.conditions && typeof permission.conditions === 'string') {
                    try {
                        permission.conditions = JSON.parse(permission.conditions);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                // Parse field_permissions JSON if present
                if (permission.field_permissions && typeof permission.field_permissions === 'string') {
                    try {
                        permission.field_permissions = JSON.parse(permission.field_permissions);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                return permission;
            });
        }
        /**
         * Load entity views from database
         * @param entityId Entity ID
         * @private
         */
        async loadEntityViews(entityId) {
            const views = await this.databaseAdapter.query('SELECT * FROM system_views WHERE entity_id = ?', [entityId]);
            // Parse JSON fields
            return views.map(view => {
                // Parse query_config JSON
                if (view.query_config && typeof view.query_config === 'string') {
                    try {
                        view.query_config = JSON.parse(view.query_config);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                // Parse fields JSON
                if (view.fields && typeof view.fields === 'string') {
                    try {
                        view.fields = JSON.parse(view.fields);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                // Parse metadata JSON if present
                if (view.metadata && typeof view.metadata === 'string') {
                    try {
                        view.metadata = JSON.parse(view.metadata);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                return view;
            });
        }
        /**
         * Load entity workflows from database
         * @param entityId Entity ID
         * @private
         */
        async loadEntityWorkflows(entityId) {
            const workflows = await this.databaseAdapter.query('SELECT * FROM system_workflows WHERE entity_id = ? AND is_active = ? ORDER BY order_index ASC', [entityId, true]);
            // Parse JSON fields
            return workflows.map(workflow => {
                // Parse conditions JSON if present
                if (workflow.conditions && typeof workflow.conditions === 'string') {
                    try {
                        workflow.conditions = JSON.parse(workflow.conditions);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                // Parse actions JSON
                if (workflow.actions && typeof workflow.actions === 'string') {
                    try {
                        workflow.actions = JSON.parse(workflow.actions);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string or empty array
                        workflow.actions = [];
                    }
                }
                // Parse metadata JSON if present
                if (workflow.metadata && typeof workflow.metadata === 'string') {
                    try {
                        workflow.metadata = JSON.parse(workflow.metadata);
                    }
                    catch (e) {
                        // If JSON parsing fails, keep as string
                    }
                }
                return workflow;
            });
        }
        /**
         * Load entity RLS (Row Level Security) from database
         * @param entityId Entity ID
         * @param context User context
         * @private
         */
        async loadEntityRLS(entityId, context) {
            // Get user roles from context
            const userRoles = context.user?.roles || [];
            // If no roles specified, load all RLS rules
            const params = [entityId, true];
            let roleCondition = '';
            if (userRoles.length > 0) {
                roleCondition = `AND role IN (${userRoles.map(() => '?').join(', ')})`;
                params.push(...userRoles);
            }
            const rlsRules = await this.databaseAdapter.query(`SELECT * FROM system_rls WHERE entity_id = ? AND is_active = ? ${roleCondition}`, params);
            // Parse JSON fields
            return rlsRules.map(rls => {
                // Parse rls_config JSON
                if (rls.rls_config && typeof rls.rls_config === 'string') {
                    try {
                        rls.rls_config = JSON.parse(rls.rls_config);
                    }
                    catch (e) {
                        // If JSON parsing fails, use default structure
                        rls.rls_config = {
                            relationbetweenconditions: 'and',
                            conditions: []
                        };
                    }
                }
                return rls;
            });
        }
    }
    exports.SchemaLoader = SchemaLoader;
});
//# sourceMappingURL=schema-loader.js.map