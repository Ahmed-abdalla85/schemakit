// QueryBuilderService for SchemaKit
import { QueryOptions, QueryFilter } from '../types';

export interface BuiltQuery { query: string; params: any[]; }

export class QueryBuilderService {
  static buildSelectQuery(table: string, tenantId: string, filters: QueryFilter[] = [], options: QueryOptions = {}): BuiltQuery {
    const qualifiedTable = `${tenantId}.${table}`;
    let query = `SELECT * FROM ${qualifiedTable}`;
    const params: any[] = [];
    if (filters.length) {
      const whereClauses = filters.map((f, i) => {
        params.push(f.value);
        return `${f.field} ${f.operator || '='} $${i + 1}`;
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    if (options.orderBy && options.orderBy.length > 0) {
      const orders = options.orderBy.map((o: { field: string; direction: 'ASC' | 'DESC' }) => `${o.field} ${o.direction}`).join(', ');
      query += ` ORDER BY ${orders}`;
    }
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options.offset) query += ` OFFSET ${options.offset}`;
    }
    return { query, params };
  }
  // Add similar for count, etc.
} 