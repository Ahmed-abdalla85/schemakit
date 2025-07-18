// Abstract DbAdapter for SchemaKit
// This defines the interface for any database adapter to implement

export interface QueryOptions {
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
}

export interface QueryFilter {
  field: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in';
}

export abstract class DbAdapter {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  // CRUD operations
  abstract insert(table: string, data: Record<string, any>): Promise<any>;
  abstract select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]>;
  abstract update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any>;
  abstract delete(table: string, id: string, tenantId: string): Promise<void>;
  abstract count(table: string, filters: QueryFilter[], tenantId: string): Promise<number>;
  abstract findById(table: string, id: string, tenantId: string): Promise<any | null>;
} 