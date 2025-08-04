/**
 * View definition and execution types
 */

import { SortDirection, JoinType } from '../core/common';

export interface JoinDefinition {
  entity: string;
  type?: JoinType;
  on: string;
  alias?: string;
}

export interface SortDefinition {
  field: string;
  direction: SortDirection;
}

export interface PaginationDefinition {
  default_limit: number;
  max_limit: number;
}

export interface ViewDefinition {
  id: string;
  entity_id: string;
  name: string;
  query_config: {
    filters?: Record<string, any>;
    joins?: JoinDefinition[];
    sorting?: SortDefinition[];
    pagination?: PaginationDefinition;
  };
  fields: string[];
  is_default: boolean;
  created_by?: string;
  is_public: boolean;
  metadata?: Record<string, any>;
}

export interface ViewOptions {
  filters?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface ViewResult {
  results: any[];
  total: number;
  fields: import('../core').FieldDefinition[];
  meta: {
    entityName: string;
    viewName: string;
    query?: string; // For debugging
  };
}