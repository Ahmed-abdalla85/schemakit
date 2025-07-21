/**
 * PaginationManager
 * Handles pagination logic and calculations
 */
import { DatabaseAdapter } from '../../database/adapter';
import { QueryBuilder, BuiltQuery, QueryFilter } from './query-builder';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult {
  data: any[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
    total_pages: number;
  };
}

/**
 * PaginationManager class
 * Single responsibility: Handle pagination logic
 */
export class PaginationManager {
  private databaseAdapter: DatabaseAdapter;
  private queryBuilder: QueryBuilder;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
    this.queryBuilder = new QueryBuilder(databaseAdapter);
  }

  /**
   * Execute paginated query
   */
  async executePaginatedQuery(
    table: string,
    tenantId: string,
    filters: QueryFilter[] = [],
    options: PaginationOptions = {},
    context: any = {}
  ): Promise<PaginationResult> {
    // Calculate pagination parameters
    const page = options.page || 1;
    const pageSize = options.pageSize || options.limit || 10;
    const offset = options.offset || (page - 1) * pageSize;

    // Get total count
    const countQuery = this.queryBuilder.buildCountQuery(table, tenantId, filters);
    const countResult = await this.databaseAdapter.query(countQuery.sql, countQuery.params);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const dataQuery = this.queryBuilder.buildSelectQuery(table, tenantId, filters, {
      limit: pageSize,
      offset: offset
    });
    const data = await this.databaseAdapter.query(dataQuery.sql, dataQuery.params);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    return {
      data,
      meta: {
        total,
        page,
        per_page: pageSize,
        has_more: hasMore,
        total_pages: totalPages
      }
    };
  }

  /**
   * Execute paginated query with custom options
   */
  async executePaginatedQueryWithOptions(
    table: string,
    tenantId: string,
    filters: QueryFilter[] = [],
    options: {
      fields?: string[];
      sort?: { field: string; direction: 'ASC' | 'DESC' }[];
      page?: number;
      pageSize?: number;
    } = {},
    context: any = {}
  ): Promise<PaginationResult> {
    // Calculate pagination parameters
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countQuery = this.queryBuilder.buildCountQuery(table, tenantId, filters);
    const countResult = await this.databaseAdapter.query(countQuery.sql, countQuery.params);
    const total = countResult[0]?.count || 0;

    // Build data query with custom options
    let sql = `SELECT ${options.fields ? options.fields.join(', ') : '*'} FROM ${table}`;
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

    // Add sorting
    if (options.sort && options.sort.length > 0) {
      const orderClause = options.sort
        .map(sort => `${sort.field} ${sort.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderClause}`;
    }

    // Add pagination
    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    // Execute query
    const data = await this.databaseAdapter.query(sql, params);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    return {
      data,
      meta: {
        total,
        page,
        per_page: pageSize,
        has_more: hasMore,
        total_pages: totalPages
      }
    };
  }

  /**
   * Calculate pagination info without executing query
   */
  calculatePaginationInfo(total: number, page: number, pageSize: number) {
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;
    const offset = (page - 1) * pageSize;

    return {
      total,
      page,
      per_page: pageSize,
      has_more: hasMore,
      total_pages: totalPages,
      offset
    };
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationOptions(options: PaginationOptions): {
    page: number;
    pageSize: number;
    offset: number;
  } {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(1000, Math.max(1, options.pageSize || options.limit || 10));
    const offset = options.offset || (page - 1) * pageSize;

    return { page, pageSize, offset };
  }

  /**
   * Build WHERE clause from filters (helper method)
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