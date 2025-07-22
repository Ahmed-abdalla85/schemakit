/**
 * QueryManager - Simplified
 * Essential query building functionality only
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context } from '../types';
import { resolveTableName } from '../utils/query-helpers';

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
  private databaseType: string;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
    // Determine database type from adapter constructor name
    this.databaseType = this.getDatabaseType(databaseAdapter);
  }

  private getDatabaseType(adapter: DatabaseAdapter): string {
    const adapterName = adapter.constructor.name.toLowerCase();
    if (adapterName.includes('postgres')) return 'postgres';
    if (adapterName.includes('sqlite')) return 'sqlite';
    if (adapterName.includes('inmemory')) return 'inmemory';
    return 'sqlite'; // default
  }

  // ===== ESSENTIAL QUERY BUILDING =====

  buildSelectQuery(table: string, tenantId: string, filters: QueryFilter[] = [], options: any = {}): BuiltQuery {
    const qualifiedTable = resolveTableName(table, tenantId, this.databaseType);
    let sql = `SELECT * FROM ${qualifiedTable}`;
    const params: any[] = [];

    // Add custom filters
    if (filters.length > 0) {
      const filterConditions = filters.map((filter, index) => {
        params.push(filter.value);
        return `${filter.field} ${filter.operator} ?`;
      }).join(' AND ');
      
      sql += ` WHERE ${filterConditions}`;
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
    const qualifiedTable = resolveTableName(table, tenantId, this.databaseType);
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${qualifiedTable} (${fields.join(', ')}) VALUES (${placeholders})`;
    const params = Object.values(data);
    
    return { sql, params };
  }

  buildUpdateQuery(table: string, tenantId: string, id: string | number, data: Record<string, any>): BuiltQuery {
    const qualifiedTable = resolveTableName(table, tenantId, this.databaseType);
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE ${qualifiedTable} SET ${setClause} WHERE id = ?`;
    const params = [...Object.values(data), id];
    
    return { sql, params };
  }

  buildDeleteQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    const qualifiedTable = resolveTableName(table, tenantId, this.databaseType);
    const sql = `DELETE FROM ${qualifiedTable} WHERE id = ?`;
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

  // ===== SCHEMA MANAGEMENT QUERIES =====

  buildCreateSchemaQuery(schemaName: string): BuiltQuery {
    const sql = `CREATE SCHEMA IF NOT EXISTS ${schemaName}`;
    return { sql, params: [] };
  }

  buildDropSchemaQuery(schemaName: string): BuiltQuery {
    const sql = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE`;
    return { sql, params: [] };
  }

  buildListSchemasQuery(): BuiltQuery {
    const sql = `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')`;
    return { sql, params: [] };
  }
}