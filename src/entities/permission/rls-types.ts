/**
 * Row Level Security Types
 * Based on temp_sample structure but adapted for SchemaKit
 */

export interface RLSCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'like' | 'isNull' | 'notNull';
  value: any;
  exposed: boolean;
  metadata?: {
    type: 'number' | 'string';
    min?: number;
    max?: number;
    options?: string[];
  };
}

export interface RLSRule {
  conditions: RLSCondition[];
  combinator: 'AND' | 'OR';
}

export interface RoleRestrictions {
  [role: string]: RLSRule[];
}

export interface IRLSManager {
  setRestrictions(restrictions: RoleRestrictions): void;
  getRestriction(roles: string[]): RLSRule[] | undefined;
  generateQuery(user: any, baseQuery: string, userInputs: Record<string, any>, model: string): string;
  getExposedConditions(roles: string[]): RLSCondition[];
}