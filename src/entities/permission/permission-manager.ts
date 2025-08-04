/**
 * PermissionManager
 * Responsible for handling permissions and RLS
 */
import { DatabaseAdapter } from '../../database/adapter';
import { EntityConfiguration, Context } from '../../types/core';
import { RLSCondition, RLSConditions } from '../../types/permissions';

/**
 * PermissionManager class
 * Single responsibility: Handle permissions and RLS
 */
export class PermissionManager {
  private databaseAdapter: DatabaseAdapter;

  /**
   * Create a new PermissionManager instance
   * @param databaseAdapter Database adapter
   */
  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
  }

  /**
   * Check if user has permission for action
   * @param entityConfig Entity configuration
   * @param action Action name
   * @param context User context
   * @returns True if user has permission
   */
  async checkPermission(entityConfig: EntityConfiguration, action: string, context: Context = {}): Promise<boolean> {
    // Get user roles from context
    const userRoles = context.user?.roles || [];
    
    // If no roles specified, use 'public' role
    const roles = userRoles.length > 0 ? userRoles : ['public'];
    
    // Check if any permission allows the action
    const hasPermission = entityConfig.permissions.some(permission => {
      // Check if permission matches action and role
      if (permission.action !== action || !roles.includes(permission.role)) {
        return false;
      }
      
      // Check if permission is active
      if (permission.is_active === false) {
        return false;
      }
      
      // Evaluate permission conditions if they exist
      if (permission.conditions) {
        return this.evaluatePermissionConditions(permission.conditions, context);
      }
      
      // Default to allowing if no conditions
      return true;
    });

    return hasPermission;
  }

  /**
   * Get entity permissions for user
   * @param entityConfig Entity configuration
   * @param context User context
   */
  async getEntityPermissions(entityConfig: EntityConfiguration, context: Context = {}): Promise<Record<string, boolean>> {
    try {
      // Default permissions
      const permissions: Record<string, boolean> = {
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
    } catch (error) {
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
   * @returns RLS conditions
   */
  buildRLSConditions(entityConfig: EntityConfiguration, context: Context): RLSConditions {
    // Get user roles from context
    const userRoles = context.user?.roles || [];
    
    // If no roles or no RLS rules, return empty conditions
    if (userRoles.length === 0 || entityConfig.rls.length === 0) {
      return { sql: '', params: [] };
    }
    
    const conditions: string[] = [];
    const params: any[] = [];
    
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
      const ruleConditions: string[] = [];
      
      for (const condition of rule.rls_config.conditions) {
        let operator: string;
        
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
          let contextValue: any = context;
          
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
          } else {
            ruleConditions.push(`${condition.field} ${operator} (?)`);
            params.push(value);
          }
        } else {
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
  checkFieldPermission(
    entityConfig: EntityConfiguration, 
    fieldName: string, 
    action: 'read' | 'write', 
    context: Context = {}
  ): boolean {
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
        const fieldPermissions = permission.field_permissions as Record<string, boolean>;
        
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
   * @returns Filtered data object
   */
  filterFieldsByPermissions(
    entityConfig: EntityConfiguration,
    data: Record<string, any>,
    action: 'read' | 'write',
    context: Context = {}
  ): Record<string, any> {
    const filteredData: Record<string, any> = {};
    
    for (const [fieldName, value] of Object.entries(data)) {
      if (this.checkFieldPermission(entityConfig, fieldName, action, context)) {
        filteredData[fieldName] = value;
      }
    }
    
    return filteredData;
  }

  /**
   * Evaluate permission conditions
   * @param conditions Permission conditions
   * @param context User context
   * @returns True if conditions are met
   * @private
   */
  private evaluatePermissionConditions(conditions: any, context: Context): boolean {
    if (!conditions || typeof conditions !== 'object') {
      return true; // No conditions means permission is granted
    }

    // Handle different condition formats
    if (Array.isArray(conditions)) {
      // Array of conditions - all must be true (AND logic)
      return conditions.every(condition => this.evaluateSingleCondition(condition, context));
    } else if (conditions.operator) {
      // Object with operator and conditions
      const { operator, conditions: conditionList } = conditions;
      
      if (!Array.isArray(conditionList)) {
        return this.evaluateSingleCondition(conditions, context);
      }

      switch (operator?.toLowerCase()) {
        case 'and':
          return conditionList.every(condition => this.evaluateSingleCondition(condition, context));
        case 'or':
          return conditionList.some(condition => this.evaluateSingleCondition(condition, context));
        default:
          return conditionList.every(condition => this.evaluateSingleCondition(condition, context));
      }
    } else {
      // Single condition object
      return this.evaluateSingleCondition(conditions, context);
    }
  }

  /**
   * Evaluate a single condition
   * @param condition Single condition object
   * @param context User context
   * @returns True if condition is met
   * @private
   */
  private evaluateSingleCondition(condition: any, context: Context): boolean {
    if (!condition || typeof condition !== 'object') {
      return true;
    }

    const { field, operator, value } = condition;

    if (!field || !operator) {
      return true; // Invalid condition, default to allow
    }

    // Get the actual value from context
    let contextValue: any;
    
    if (field.startsWith('$context.')) {
      const path = field.substring(9).split('.');
      contextValue = context;
      
      for (const key of path) {
        if (contextValue === undefined || contextValue === null) {
          break;
        }
        contextValue = contextValue[key];
      }
    } else if (field.startsWith('$user.')) {
      const path = field.substring(6).split('.');
      contextValue = context.user;
      
      for (const key of path) {
        if (contextValue === undefined || contextValue === null) {
          break;
        }
        contextValue = contextValue[key];
      }
    } else {
      // Direct field access from context
      contextValue = context[field];
    }

    // Evaluate condition based on operator
    switch (operator.toLowerCase()) {
      case 'eq':
      case '=':
      case '==':
        return contextValue === value;
      
      case 'neq':
      case '!=':
      case '<>':
        return contextValue !== value;
      
      case 'gt':
      case '>':
        return contextValue > value;
      
      case 'gte':
      case '>=':
        return contextValue >= value;
      
      case 'lt':
      case '<':
        return contextValue < value;
      
      case 'lte':
      case '<=':
        return contextValue <= value;
      
      case 'in':
        return Array.isArray(value) ? value.includes(contextValue) : contextValue === value;
      
      case 'nin':
      case 'not_in':
        return Array.isArray(value) ? !value.includes(contextValue) : contextValue !== value;
      
      case 'like':
        if (typeof contextValue === 'string' && typeof value === 'string') {
          const regex = new RegExp(value.replace(/%/g, '.*'), 'i');
          return regex.test(contextValue);
        }
        return false;
      
      case 'exists':
        return contextValue !== undefined && contextValue !== null;
      
      case 'not_exists':
        return contextValue === undefined || contextValue === null;
      
      default:
        return true; // Unknown operator, default to allow
    }
  }
}