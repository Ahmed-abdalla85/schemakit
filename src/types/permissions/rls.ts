/**
 * Row Level Security (RLS) types
 */

export interface RLSCondition {
  field: string;
  op: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'like' | 'isNull' | 'notNull';
  value: any;
  exposed?: boolean;
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

export interface RLSDefinition {
  id: string;
  entity_id: string;
  role: string;
  view_id?: string;
  rls_config: {
    relationbetweenconditions: 'and' | 'or';
    conditions: RLSCondition[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RLSConditions {
  sql?: string;  // Legacy support
  params?: any[];  // Legacy support
  conditions?: Array<{ field: string; operator: string; value: any }>;  // New fluent style
}

export interface IRLSManager {
  setRestrictions(restrictions: RoleRestrictions): void;
  getRestriction(roles: string[]): RLSRule[] | undefined;
  generateQuery(user: any, baseQuery: string, userInputs: Record<string, any>, model: string): string;
  getExposedConditions(roles: string[]): RLSCondition[];
}