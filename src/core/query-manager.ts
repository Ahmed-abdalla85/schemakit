/**
 * QueryManager - Simplified
 * Essential query building functionality only
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context } from '../types';

export interface BuiltQuery {
  sql: string;
  params: any[];
}

export interface QueryFilter {
  field: string;
  operator: string;
  value: any;
}

/**
 * Simplified QueryManager class
 * Essential query building only
 */
export class QueryManager {
  private databaseAdapter: DatabaseAdapter;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
  }

  // ===== ESSENTIAL QUERY BUILDING =====

  buildSelectQuery(table: string, tenantId: string, filters: QueryFilter[] = [], options: any = {}): BuiltQuery {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    // Add tenant filter
    if (tenantId && tenantId !== 'default') {
      sql += ` WHERE tenant_id = ?`;
      params.push(tenantId);
    }

    // Add custom filters
    if (filters.length > 0) {
      const whereClause = filters.length > 0 ? ' WHERE ' : '';
      const filterConditions = filters.map((filter, index) => {
        params.push(filter.value);
        return `${filter.field} ${filter.operator} ?`;
      }).join(' AND ');
      
      if (tenantId && tenantId !== 'default') {
        sql += ` AND ${filterConditions}`;
      } else {
        sql += whereClause + filterConditions;
      }
    }

    // Add ordering
    if (options.sort && options.sort.length > 0) {
      const orderBy = options.sort.map((s: any) => `${s.field} ${s.direction}`).join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }

    // Add limit
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    // Add offset
    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    return { sql, params };
  }

  buildInsertQuery(table: string, tenantId: string, data: Record<string, any>): BuiltQuery {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const params = Object.values(data);
    
    return { sql, params };
  }

  buildUpdateQuery(table: string, tenantId: string, id: string | number, data: Record<string, any>): BuiltQuery {
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const params = [...Object.values(data), id];
    
    return { sql, params };
  }

  buildDeleteQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const params = [id];
    
    return { sql, params };
  }

  buildCountQuery(table: string, tenantId: string, filters: QueryFilter[] = []): BuiltQuery {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    // Add tenant filter
    if (tenantId && tenantId !== 'default') {
      sql += ` WHERE tenant_id = ?`;
      params.push(tenantId);
    }

    // Add custom filters
    if (filters.length > 0) {
      const whereClause = filters.length > 0 ? ' WHERE ' : '';
      const filterConditions = filters.map((filter, index) => {
        params.push(filter.value);
        return `${filter.field} ${filter.operator} ?`;
      }).join(' AND ');
      
      if (tenantId && tenantId !== 'default') {
        sql += ` AND ${filterConditions}`;
      } else {
        sql += whereClause + filterConditions;
      }
    }

    return { sql, params };
  }

  buildFindByIdQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    let sql = `SELECT * FROM ${table} WHERE id = ?`;
    const params = [id];

    // Add tenant filter
    if (tenantId && tenantId !== 'default') {
      sql += ` AND tenant_id = ?`;
      params.push(tenantId);
    }

    return { sql, params };
  }
}