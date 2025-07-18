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
    exports.PermissionManager = void 0;
    /**
     * Permission Manager class
     */
    class PermissionManager {
        constructor(databaseAdapter) {
            this.databaseAdapter = databaseAdapter;
        }
        /**
         * Check if user has permission for action
         * @param entityConfig Entity configuration
         * @param action Action name
         * @param context User context
         */
        async checkPermission(entityConfig, action, context = {}) {
            try {
                // Get user roles from context
                const userRoles = context.user?.roles || [];
                // If no roles specified and no context user, use default permissions
                if (userRoles.length === 0 && !context.user) {
                    // Default permissions: allow all operations for now
                    // In a production system, you might want to be more restrictive
                    return true;
                }
                // Check if any permission allows the action
                const hasPermission = entityConfig.permissions.some(p => p.action === action &&
                    p.is_allowed &&
                    userRoles.includes(p.role));
                return hasPermission;
            }
            catch (error) {
                // If there's an error checking permissions, default to denying access
                console.error(`Error checking permission: ${error}`);
                return false;
            }
        }
        /**
         * Get entity permissions for user
         * @param entityConfig Entity configuration
         * @param context User context
         */
        async getEntityPermissions(entityConfig, context = {}) {
            try {
                // Default permissions
                const permissions = {
                    create: false,
                    read: false,
                    update: false,
                    delete: false,
                    list: false
                };
                // Check each permission individually
                permissions.create = await this.checkPermission(entityConfig, 'create', context);
                permissions.read = await this.checkPermission(entityConfig, 'read', context);
                permissions.update = await this.checkPermission(entityConfig, 'update', context);
                permissions.delete = await this.checkPermission(entityConfig, 'delete', context);
                permissions.list = await this.checkPermission(entityConfig, 'list', context);
                return permissions;
            }
            catch (error) {
                // If there's an error checking permissions, default to denying all access
                console.error(`Error getting entity permissions: ${error}`);
                return {
                    create: false,
                    read: false,
                    update: false,
                    delete: false,
                    list: false
                };
            }
        }
        /**
         * Build RLS (Row Level Security) conditions
         * @param entityConfig Entity configuration
         * @param context User context
         */
        buildRLSConditions(entityConfig, context) {
            // Get user roles from context
            const userRoles = context.user?.roles || [];
            // If no roles or no RLS rules, return empty conditions
            if (userRoles.length === 0 || entityConfig.rls.length === 0) {
                return { sql: '', params: [] };
            }
            const conditions = [];
            const params = [];
            // Process each RLS rule
            for (const rule of entityConfig.rls) {
                // Skip inactive rules
                if (!rule.is_active) {
                    continue;
                }
                // Skip rules for roles not in user context
                if (!userRoles.includes(rule.role)) {
                    continue;
                }
                // Process rule conditions
                const ruleConditions = [];
                for (const condition of rule.rls_config.conditions) {
                    let operator;
                    // Map operator
                    switch (condition.op) {
                        case 'eq':
                            operator = '=';
                            break;
                        case 'neq':
                            operator = '!=';
                            break;
                        case 'gt':
                            operator = '>';
                            break;
                        case 'gte':
                            operator = '>=';
                            break;
                        case 'lt':
                            operator = '<';
                            break;
                        case 'lte':
                            operator = '<=';
                            break;
                        case 'in':
                            operator = 'IN';
                            break;
                        case 'nin':
                            operator = 'NOT IN';
                            break;
                        case 'like':
                            operator = 'LIKE';
                            break;
                        default:
                            operator = '=';
                    }
                    // Handle special value cases
                    let value = condition.value;
                    // Handle context variables
                    if (typeof value === 'string' && value.startsWith('$context.')) {
                        const path = value.substring(9).split('.');
                        let contextValue = context;
                        for (const key of path) {
                            if (contextValue === undefined || contextValue === null) {
                                break;
                            }
                            contextValue = contextValue[key];
                        }
                        value = contextValue;
                    }
                    // Build condition SQL
                    if (operator === 'IN' || operator === 'NOT IN') {
                        if (Array.isArray(value)) {
                            const placeholders = value.map(() => '?').join(', ');
                            ruleConditions.push(`${condition.field} ${operator} (${placeholders})`);
                            params.push(...value);
                        }
                        else {
                            ruleConditions.push(`${condition.field} ${operator} (?)`);
                            params.push(value);
                        }
                    }
                    else {
                        ruleConditions.push(`${condition.field} ${operator} ?`);
                        params.push(value);
                    }
                }
                // Combine rule conditions
                if (ruleConditions.length > 0) {
                    const relationOperator = rule.rls_config.relationbetweenconditions === 'or' ? ' OR ' : ' AND ';
                    conditions.push(`(${ruleConditions.join(relationOperator)})`);
                }
            }
            // Combine all rule conditions with OR (any matching rule grants access)
            if (conditions.length > 0) {
                return {
                    sql: conditions.join(' OR '),
                    params
                };
            }
            return { sql: '', params: [] };
        }
        /**
         * Check field-level permissions
         * @param entityConfig Entity configuration
         * @param fieldName Field name
         * @param action Action (read, write)
         * @param context User context
         */
        checkFieldPermission(entityConfig, fieldName, action, context = {}) {
            // Get user roles from context
            const userRoles = context.user?.roles || [];
            if (userRoles.length === 0) {
                return true; // Default to allowing field access
            }
            // Check field permissions in entity permissions
            for (const permission of entityConfig.permissions) {
                if (!userRoles.includes(permission.role)) {
                    continue;
                }
                if (permission.field_permissions && typeof permission.field_permissions === 'object') {
                    const fieldPermissions = permission.field_permissions;
                    // Check specific field permission
                    const fieldKey = `${fieldName}_${action}`;
                    if (fieldPermissions.hasOwnProperty(fieldKey)) {
                        return fieldPermissions[fieldKey];
                    }
                    // Check general field permission
                    if (fieldPermissions.hasOwnProperty(fieldName)) {
                        return fieldPermissions[fieldName];
                    }
                }
            }
            // Default to allowing field access if no specific permissions are defined
            return true;
        }
        /**
         * Filter fields based on permissions
         * @param entityConfig Entity configuration
         * @param data Data object
         * @param action Action (read, write)
         * @param context User context
         */
        filterFieldsByPermissions(entityConfig, data, action, context = {}) {
            const filteredData = {};
            for (const [fieldName, value] of Object.entries(data)) {
                if (this.checkFieldPermission(entityConfig, fieldName, action, context)) {
                    filteredData[fieldName] = value;
                }
            }
            return filteredData;
        }
    }
    exports.PermissionManager = PermissionManager;
});
//# sourceMappingURL=permission-manager.js.map