/**
 * Row Restriction Manager
 * Handles dynamic row-level security based on user roles and context
 */

import { IRLSManager, RoleRestrictions, RLSRule, RLSCondition } from './rls-types';

export class RowRestrictionManager implements IRLSManager {
  private restrictions: RoleRestrictions;

  constructor() {
    this.restrictions = {};
  }

  setRestrictions(restrictions: RoleRestrictions): void {
    this.restrictions = restrictions;
  }

  getRestriction(roles: string[]): RLSRule[] | undefined {
    // Parse roles if they're stringified
    roles = Array.isArray(roles) ? roles : JSON.parse(roles as unknown as string);

    // Parse roles as integers and sort in descending order
    const sortedRoles = roles
      .map(role => {
        const parsedRole = parseInt(role, 10);
        return isNaN(parsedRole) ? role : parsedRole;
      })
      .sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return b - a; // Sort numbers in descending order
        }
        if (typeof a === 'string' && typeof b === 'string') {
          return b.localeCompare(a); // Sort strings in descending order
        }
        return typeof a === 'number' ? -1 : 1; // Numbers before strings
      });
    
    // Find the first (highest) role that has restrictions
    for (const role of sortedRoles) {
      const restriction = this.restrictions[role.toString()];
      if (restriction) {
        return restriction;
      }
    }
    
    return undefined;
  }

  generateQuery(user: any, baseQuery: string, userInputs: Record<string, any> = {}, model: string): string {
    const rules = this.getRestriction(user.roles || []);
    let whereClause: string;

    if (rules && rules.length > 0) {
      whereClause = this.generateWhereClause(rules, userInputs, user);
    } else {
      whereClause = this.generateWhereClause([], userInputs, user) || '';
      // Default where clause when no rules are found
      if (whereClause) {
        whereClause += ` AND created_by = '${user.id}'`;
      } else {
        whereClause = `created_by = '${user.id}'`;
      }
    }

    if (whereClause) {
      // Check if baseQuery already has WHERE clause
      const hasWhere = baseQuery.toLowerCase().includes('where');
      return `${baseQuery} ${hasWhere ? 'AND' : 'WHERE'} ${whereClause}`;
    }
    
    return baseQuery;
  }

  getExposedConditions(roles: string[]): RLSCondition[] {
    const rules = this.getRestriction(roles);
    if (!rules) return [];

    return rules.flatMap(rule => 
      rule.conditions.filter(condition => condition.exposed)
    );
  }

  private generateWhereClause(rules: RLSRule[], userInputs: Record<string, any>, user: { [key: string]: any }): string {
    const ruleConditions = rules.map(rule => {
      const conditions = rule.conditions.flatMap(condition => this.generateCondition(condition, userInputs, user));
      return conditions.length ? `(${conditions.join(` ${rule.combinator} `)})` : null;
    }).filter(Boolean);

    const userInputConditions = Object.entries(userInputs).map(([field, value]) => {
      const operator = Number.isInteger(Number(value)) ? 'eq' : 'like';
      return this.generateCondition({ field, operator, value, exposed: true }, userInputs, user);
    }).flat();

    const allConditions = [...ruleConditions, ...userInputConditions].filter(Boolean);
 
    return allConditions.length ? allConditions.join(' AND ') : '';
  }

  private generateCondition(condition: RLSCondition, userInputs: Record<string, any>, user: { [key: string]: any }): string[] {
    let value = condition.value;
    let conditions: string[] = [];
    
    if (condition.exposed && condition.field in userInputs) {
      value = this.validateUserInput(condition, userInputs[condition.field]);
    } else if (typeof value === 'string' && value.startsWith('currentUser.')) {
      const userProperty = value.split('.')[1];
      value = user[userProperty];
    }

    if (Array.isArray(value) && condition.operator !== 'notIn') {
      condition.operator = "in";
    }

    switch (condition.operator) {
      case 'eq':
        conditions.push(`${condition.field} = ${this.formatValue(value)}`);
        break;
      case 'ne':
        conditions.push(`${condition.field} != ${this.formatValue(value)}`);
        break;
      case 'gt':
        conditions.push(`${condition.field} > ${this.formatValue(value)}`);
        break;
      case 'lt':
        conditions.push(`${condition.field} < ${this.formatValue(value)}`);
        break;
      case 'gte':
        conditions.push(`${condition.field} >= ${this.formatValue(value)}`);
        break;
      case 'lte':
        conditions.push(`${condition.field} <= ${this.formatValue(value)}`);
        break;
      case 'in':
        conditions.push(`${condition.field} IN (${this.formatArray(value)})`);
        break;
      case 'notIn':
        conditions.push(`${condition.field} NOT IN (${this.formatArray(value)})`);
        break;
      case 'like':
        conditions.push(`${condition.field} LIKE "%${value}%"`);
        break;  
      case 'isNull':
        conditions.push(`${condition.field} IS NULL`);
        break;    
      case 'notNull':
        conditions.push(`${condition.field} IS NOT NULL`);
        break;  
      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }

    return conditions;
  }

  private validateUserInput(condition: RLSCondition, userInput: any): any {
    if (!condition.metadata) return userInput;

    switch (condition.metadata.type) {
      case 'number':
        const num = Number(userInput);
        if (isNaN(num)) throw new Error(`Invalid number for field ${condition.field}`);
        if (condition.metadata.min !== undefined && num < condition.metadata.min) 
          throw new Error(`Value for ${condition.field} must be at least ${condition.metadata.min}`);
        if (condition.metadata.max !== undefined && num > condition.metadata.max) 
          throw new Error(`Value for ${condition.field} must be at most ${condition.metadata.max}`);
        return num;
      case 'string':
        if (condition.metadata.options && !condition.metadata.options.includes(userInput)) 
          throw new Error(`Invalid option for ${condition.field}`);
        return userInput;
      default:
        return userInput;
    }
  }

  private formatValue(value: any): string {
    if (value === undefined || value === null) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    return value.toString();
  }

  private formatArray(arr: any[]): string {
    return arr.filter(item => item !== undefined && item !== null)
              .map(this.formatValue.bind(this))
              .join(', ');
  }
}