/**
 * Database Adapter Bridge
 * Bridges between UnifiedEntityHandler's DbAdapter interface and existing DatabaseAdapter
 */

import { DatabaseAdapter, QueryFilter, QueryOptions } from '../../../database/adapter';

export interface DbAdapter {
  insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any>;
  select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]>;
  update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any>;
  delete(table: string, id: string, tenantId: string): Promise<void>;
  findById(table: string, id: string, tenantId: string): Promise<any | null>;
}

/**
 * DatabaseAdapterBridge - Adapts existing DatabaseAdapter to DbAdapter interface
 */
export class DatabaseAdapterBridge implements DbAdapter {
  constructor(private adapter: DatabaseAdapter) {}

  async insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any> {
    const result = await this.adapter.insert(table, data, tenantId);
    return {
      ...result,
      changes: result.changes || 1,
      lastInsertId: result.lastInsertId || result.id || data.id
    };
  }

  async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
    return this.adapter.select(table, filters, options, tenantId);
  }

  async update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any> {
    const result = await this.adapter.update(table, id, data, tenantId);
    return {
      ...result,
      changes: result.changes || 1
    };
  }

  async delete(table: string, id: string, tenantId: string): Promise<void> {
    await this.adapter.delete(table, id, tenantId);
  }

  async findById(table: string, id: string, tenantId: string): Promise<any | null> {
    return this.adapter.findById(table, id, tenantId);
  }
}

/**
 * Create a DbAdapter from a DatabaseAdapter
 */
export function createDbAdapter(databaseAdapter: DatabaseAdapter): DbAdapter {
  return new DatabaseAdapterBridge(databaseAdapter);
}