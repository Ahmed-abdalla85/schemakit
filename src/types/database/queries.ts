/**
 * Database query and result types
 */

import { SortDirection } from '../core/common';

export interface QueryFilter {
  field: string;
  operator: string;
  value: any;
}

export interface QueryOptions {
  orderBy?: Array<{
    field: string;
    dir: SortDirection;
  }>;
  limit?: number;
  offset?: number;
  groupBy?: string[];
  having?: QueryFilter[];
}

export interface BuiltQuery {
  sql: string;
  params: any[];
  filters: QueryFilter[];
  options: QueryOptions;
}

export interface QueryResult<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  permissions?: {
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
}