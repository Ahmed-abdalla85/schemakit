/**
 * QueryBuilder
 * Core query building logic
 */
import { DatabaseAdapter } from '../../database/adapter';
import { QueryCondition } from '../../utils/query-helpers';

export interface BuiltQuery {
  sql: string;
  params: any[];
}

export interface QueryOptions {
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
}

export interface QueryFilter {
  field: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin' | 'contains' | 'startswith' | 'endswith';
}

/**
 * QueryBuilder class
 * Single responsibility: Build SQL queries
 */
export class QueryBuilder {
  private databaseAdapter: DatabaseAdapter;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
  }

  /**
   * Build SELECT query
   */
  buildSelectQuery(table: string, tenantId: string, filters: QueryFilter[] = [], options: QueryOptions = {}): BuiltQuery {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    // Add tenant filter
    if (tenantId && tenantId !== 'default') {
      sql += ` WHERE tenant_id = ?`;
      params.push(tenantId);
    }

    // Add custom filters
    if (filters.length > 0) {
      const whereClause = this.buildWhereClause(filters, params);
      if (tenantId && tenantId !== 'default') {
        sql += ` AND ${whereClause}`;
      } else {
        sql += ` WHERE ${whereClause}`;
      }
    }

    // Add ordering
    if (options.orderBy && options.orderBy.length > 0) {
      const orderClause = options.orderBy
        .map(order => `${order.field} ${order.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderClause}`;
    }

    // Add pagination
    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    return { sql, params };
  }

  /**
   * Build INSERT query
   */
  buildInsertQuery(table: string, tenantId: string, data: Record<string, any>): BuiltQuery {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const params = fields.map(field => data[field]);

    return { sql, params };
  }

  /**
   * Build UPDATE query
   */
  buildUpdateQuery(table: string, tenantId: string, id: string | number, data: Record<string, any>): BuiltQuery {
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const params = [...fields.map(field => data[field]), id];

    return { sql, params };
  }

  /**
   * Build DELETE query
   */
  buildDeleteQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const params = [id];

    return { sql, params };
  }

  /**
   * Build COUNT query
   */
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
      const whereClause = this.buildWhereClause(filters, params);
      if (tenantId && tenantId !== 'default') {
        sql += ` AND ${whereClause}`;
      } else {
        sql += ` WHERE ${whereClause}`;
      }
    }

    return { sql, params };
  }

  /**
   * Build FIND BY ID query
   */
  buildFindByIdQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    const params = [id];

    return { sql, params };
  }

  /**
   * Build schema management queries
   */
  buildCreateSchemaQuery(schemaName: string): BuiltQuery {
    const sql = `CREATE SCHEMA IF NOT EXISTS ${schemaName}`;
    return { sql, params: [] };
  }

  buildDropSchemaQuery(schemaName: string): BuiltQuery {
    const sql = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE`;
    return { sql, params: [] };
  }

  buildListSchemasQuery(): BuiltQuery {
    const sql = `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog')`;
    return { sql, params: [] };
  }

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(filters: QueryFilter[], params: any[]): string {
    return filters.map(filter => {
      const operator = this.mapOperator(filter.operator || 'eq');
      const value = this.processFilterValue(filter.operator || 'eq', filter.value);
      
      if (operator === 'IN' || operator === 'NOT IN') {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(', ');
          params.push(...value);
          return `${filter.field} ${operator} (${placeholders})`;
        } else {
          params.push(value);
          return `${filter.field} ${operator} (?)`;
        }
      } else {
        params.push(value);
        return `${filter.field} ${operator} ?`;
      }
    }).join(' AND ');
  }

  /**
   * Map operator to SQL operator
   */
  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      eq: '=',
      neq: '!=',
      gt: '>',
      lt: '<',
      gte: '>=',
      lte: '<=',
      like: 'LIKE',
      in: 'IN',
      nin: 'NOT IN',
      contains: 'LIKE',
      startswith: 'LIKE',
      endswith: 'LIKE'
    };
    return operatorMap[operator] || '=';
  }

  /**
   * Process filter value based on operator
   */
  private processFilterValue(operator: string, value: any): any {
    switch (operator) {
      case 'contains':
        return `%${value}%`;
      case 'startswith':
        return `${value}%`;
      case 'endswith':
        return `%${value}`;
      case 'like':
        return value;
      default:
        return value;
    }
  }
}