/**
 * QueryManager - Unified query management system
 * 
 * Single responsibility: Handle all query operations including:
 * - View execution
 * - Custom query building
 * - Pagination and aggregation
 * - Multi-tenant support
 * - Query result formatting
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, ViewDefinition, Context } from '../types';
import { buildSelectQuery, buildWhereClause, QueryCondition } from '../utils/query-helpers';
import { safeJsonParse } from '../utils/json-helpers';

// ===== INTERFACES =====

/**
 * Query result interface
 */
export interface QueryResult {
  data: Record<string, any>[];
  total?: number;
  page?: number;
  pageSize?: number;
  meta?: {
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

/**
 * Built query interface
 */
export interface BuiltQuery {
  sql: string;
  params: any[];
}

/**
 * Query options interface
 */
export interface QueryOptions {
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
}

/**
 * Query filter interface
 */
export interface QueryFilter {
  field: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'nin' | 'contains' | 'startswith' | 'endswith';
}

/**
 * Fluent query builder interface
 */
export interface QueryBuilder {
  select(fields?: string[]): QueryBuilder;
  where(conditions: QueryCondition[]): QueryBuilder;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(limit: number): QueryBuilder;
  offset(offset: number): QueryBuilder;
  build(): BuiltQuery;
}

// ===== MAIN QUERY MANAGER CLASS =====

/**
 * QueryManager class
 * Single responsibility: Handle all query operations
 */
export class QueryManager {
  private databaseAdapter: DatabaseAdapter;

  /**
   * Create a new QueryManager instance
   * @param databaseAdapter Database adapter
   */
  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
  }

  // ===== VIEW EXECUTION =====

  /**
   * Execute a view
   * @param entityConfig Entity configuration
   * @param viewName View name
   * @param params View parameters
   * @param context User context
   * @returns Query result
   */
  async executeView(
    entityConfig: EntityConfiguration,
    viewName: string,
    params: Record<string, any> = {},
    context: Context = {}
  ): Promise<QueryResult> {
    // Find the view definition
    const viewDef = entityConfig.views.find(v => v.name === viewName);
    if (!viewDef) {
      throw new Error(`View '${viewName}' not found for entity '${entityConfig.entity.name}'`);
    }

    // Build the query from view definition
    const query = this.buildViewQuery(entityConfig, viewDef, params);

    // Execute the query
    const data = await this.databaseAdapter.query(query.sql, query.params);

    return {
      data,
      total: data.length
    };
  }

  /**
   * Build view query from view definition
   * @param entityConfig Entity configuration
   * @param viewConfig View definition
   * @param params View parameters
   * @returns Built query
   */
  buildViewQuery(entityConfig: EntityConfiguration, viewConfig: ViewDefinition, params: Record<string, any>): BuiltQuery {
    const tableName = entityConfig.entity.name;
    
    // Parse view query configuration
    let queryConfig: any = {};
    if (viewConfig.query_config) {
      if (typeof viewConfig.query_config === 'string') {
        queryConfig = safeJsonParse(viewConfig.query_config, {});
      } else {
        queryConfig = viewConfig.query_config;
      }
    }

    // Start building the SQL query
    let sql = `SELECT ${Array.isArray(viewConfig.fields) ? viewConfig.fields.join(', ') : '*'} FROM ${tableName}`;
    const queryParams: any[] = [];

    // Add joins if specified
    if (queryConfig.joins && queryConfig.joins.length > 0) {
      for (const join of queryConfig.joins) {
        const joinType = join.type || 'inner';
        sql += ` ${joinType.toUpperCase()} JOIN ${join.entity} ${join.alias ? 'AS ' + join.alias : ''} ON ${join.on}`;
      }
    }

    // Add where conditions
    const whereConditions: string[] = [];

    // Add filters from view config
    if (queryConfig.filters) {
      this.addFiltersToQuery(queryConfig.filters, whereConditions, queryParams);
    }

    // Add filters from params
    this.addParamsToQuery(params, whereConditions, queryParams);

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add sorting
    const sortBy = params.sort_by || (queryConfig.sorting && queryConfig.sorting[0]?.field);
    const sortDir = params.sort_dir || (queryConfig.sorting && queryConfig.sorting[0]?.direction) || 'asc';

    if (sortBy) {
      sql += ` ORDER BY ${sortBy} ${sortDir.toUpperCase()}`;
    }

    // Add pagination
    const page = Number(params.page) || 1;
    const perPage = Number(params.per_page) || 
                   (queryConfig.pagination && queryConfig.pagination.default_limit) || 
                   10;

    // Add LIMIT and OFFSET
    sql += ` LIMIT ? OFFSET ?`;
    queryParams.push(perPage, (page - 1) * perPage);

    return { sql, params: queryParams };
  }

  // ===== CUSTOM QUERY EXECUTION =====

  /**
   * Execute a custom query using QueryBuilder
   * @param entityConfig Entity configuration
   * @param queryBuilder Query builder function
   * @param context User context
   * @returns Query result
   */
  async executeCustomQuery(
    entityConfig: EntityConfiguration,
    queryBuilder: (query: QueryBuilder) => QueryBuilder,
    context: Context = {}
  ): Promise<QueryResult> {
    // Create a new query builder instance
    const builder = new FluentQueryBuilder(entityConfig.entity.name);
    
    // Apply the query builder function
    const configuredBuilder = queryBuilder(builder);
    
    // Build the final query
    const query = configuredBuilder.build();

    // Execute the query
    const data = await this.databaseAdapter.query(query.sql, query.params);

    return {
      data,
      total: data.length
    };
  }

  // ===== PAGINATED QUERIES =====

  /**
   * Execute a paginated query
   * @param entityConfig Entity configuration
   * @param conditions Query conditions
   * @param options Query options
   * @param context User context
   * @returns Paginated query result
   */
  async executePaginatedQuery(
    entityConfig: EntityConfiguration,
    conditions: QueryCondition[] = [],
    options: {
      fields?: string[];
      sort?: { field: string; direction: 'ASC' | 'DESC' }[];
      page?: number;
      pageSize?: number;
    } = {},
    context: Context = {}
  ): Promise<QueryResult> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Build the main query
    const query = buildSelectQuery({
      table: entityConfig.entity.name,
      fields: options.fields,
      conditions,
      sorting: options.sort,
      pagination: {
        limit: pageSize,
        offset
      }
    });

    // Build count query
    const countQuery = buildSelectQuery({
      table: entityConfig.entity.name,
      fields: ['COUNT(*) as total'],
      conditions
    });

    // Execute both queries
    const [data, countResult] = await Promise.all([
      this.databaseAdapter.query(query.sql, query.params),
      this.databaseAdapter.query<{ total: number }>(countQuery.sql, countQuery.params)
    ]);

    const total = countResult.length > 0 ? Number(countResult[0].total) : 0;

    return {
      data,
      total,
      page,
      pageSize
    };
  }

  // ===== AGGREGATION QUERIES =====

  /**
   * Execute an aggregation query
   * @param entityConfig Entity configuration
   * @param aggregations Aggregation functions
   * @param conditions Query conditions
   * @param groupBy Group by fields
   * @param context User context
   * @returns Query result
   */
  async executeAggregationQuery(
    entityConfig: EntityConfiguration,
    aggregations: { function: string; field: string; alias?: string }[],
    conditions: QueryCondition[] = [],
    groupBy: string[] = [],
    context: Context = {}
  ): Promise<QueryResult> {
    const tableName = entityConfig.entity.name;
    
    // Build SELECT clause with aggregations
    const selectFields = aggregations.map(agg => {
      const alias = agg.alias || `${agg.function}_${agg.field}`;
      return `${agg.function}(${agg.field}) as ${alias}`;
    });

    // Add GROUP BY fields to SELECT if they exist
    if (groupBy.length > 0) {
      selectFields.push(...groupBy);
    }

    // Build the query
    let sql = `SELECT ${selectFields.join(', ')} FROM ${tableName}`;
    const params: any[] = [];

    // Add WHERE clause
    if (conditions.length > 0) {
      const whereClause = buildWhereClause(conditions);
      if (whereClause.sql) {
        sql += ` WHERE ${whereClause.sql}`;
        params.push(...whereClause.params);
      }
    }

    // Add GROUP BY clause
    if (groupBy.length > 0) {
      sql += ` GROUP BY ${groupBy.join(', ')}`;
    }

    // Execute the query
    const data = await this.databaseAdapter.query(sql, params);

    return {
      data,
      total: data.length
    };
  }

  // ===== RAW QUERY EXECUTION =====

  /**
   * Execute a raw SQL query
   * @param sql SQL query string
   * @param params Query parameters
   * @param context User context
   * @returns Query result
   */
  async executeRawQuery(sql: string, params: any[] = [], context: Context = {}): Promise<QueryResult> {
    const data = await this.databaseAdapter.query(sql, params);
    
    return {
      data,
      total: data.length
    };
  }

  // ===== MULTI-TENANT QUERY BUILDING =====

  /**
   * Build a SELECT query with tenant schema support
   * @param table Table name
   * @param tenantId Tenant identifier (used as schema name)
   * @param filters Query filters
   * @param options Query options
   */
  buildSelectQuery(table: string, tenantId: string, filters: QueryFilter[] = [], options: QueryOptions = {}): BuiltQuery {
    const qualifiedTable = `${tenantId}.${table}`;
    let sql = `SELECT * FROM ${qualifiedTable}`;
    const params: any[] = [];
    
    // Add WHERE clause if filters exist
    if (filters.length) {
      const whereClauses = filters.map((f, i) => {
        params.push(f.value);
        const operator = this.mapOperator(f.operator || 'eq');
        return `${f.field} ${operator} $${i + 1}`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    // Add ORDER BY clause
    if (options.orderBy && options.orderBy.length > 0) {
      const orders = options.orderBy.map((o: { field: string; direction: 'ASC' | 'DESC' }) => 
        `${o.field} ${o.direction}`
      ).join(', ');
      sql += ` ORDER BY ${orders}`;
    }
    
    // Add LIMIT and OFFSET
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }
    
    return { sql, params };
  }

  /**
   * Build an INSERT query with tenant schema support
   * @param table Table name
   * @param tenantId Tenant identifier
   * @param data Data to insert
   */
  buildInsertQuery(table: string, tenantId: string, data: Record<string, any>): BuiltQuery {
    const qualifiedTable = `${tenantId}.${table}`;
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const sql = `INSERT INTO ${qualifiedTable} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    return { sql, params: values };
  }

  /**
   * Build an UPDATE query with tenant schema support
   * @param table Table name
   * @param tenantId Tenant identifier
   * @param id Record ID
   * @param data Data to update
   */
  buildUpdateQuery(table: string, tenantId: string, id: string | number, data: Record<string, any>): BuiltQuery {
    const qualifiedTable = `${tenantId}.${table}`;
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const sql = `UPDATE ${qualifiedTable} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    
    return { sql, params: [...values, id] };
  }

  /**
   * Build a DELETE query with tenant schema support
   * @param table Table name
   * @param tenantId Tenant identifier
   * @param id Record ID
   */
  buildDeleteQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    const qualifiedTable = `${tenantId}.${table}`;
    const sql = `DELETE FROM ${qualifiedTable} WHERE id = $1`;
    
    return { sql, params: [id] };
  }

  /**
   * Build a COUNT query with tenant schema support
   * @param table Table name
   * @param tenantId Tenant identifier
   * @param filters Query filters
   */
  buildCountQuery(table: string, tenantId: string, filters: QueryFilter[] = []): BuiltQuery {
    const qualifiedTable = `${tenantId}.${table}`;
    let sql = `SELECT COUNT(*) as count FROM ${qualifiedTable}`;
    const params: any[] = [];
    
    if (filters.length) {
      const whereClauses = filters.map((f, i) => {
        params.push(f.value);
        const operator = this.mapOperator(f.operator || 'eq');
        return `${f.field} ${operator} $${i + 1}`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    return { sql, params };
  }

  /**
   * Build a find by ID query with tenant schema support
   * @param table Table name
   * @param tenantId Tenant identifier
   * @param id Record ID
   */
  buildFindByIdQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    const qualifiedTable = `${tenantId}.${table}`;
    const sql = `SELECT * FROM ${qualifiedTable} WHERE id = $1`;
    
    return { sql, params: [id] };
  }

  // ===== SCHEMA MANAGEMENT QUERIES =====

  /**
   * Build schema creation query
   * @param schemaName Schema name (tenant ID)
   */
  buildCreateSchemaQuery(schemaName: string): BuiltQuery {
    const sql = `CREATE SCHEMA IF NOT EXISTS ${schemaName}`;
    return { sql, params: [] };
  }

  /**
   * Build schema drop query
   * @param schemaName Schema name (tenant ID)
   */
  buildDropSchemaQuery(schemaName: string): BuiltQuery {
    const sql = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE`;
    return { sql, params: [] };
  }

  /**
   * Build query to list all schemas
   */
  buildListSchemasQuery(): BuiltQuery {
    const sql = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `;
    return { sql, params: [] };
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Add filters to query
   * @param filters Filter configuration
   * @param whereConditions Where conditions array
   * @param queryParams Query parameters array
   * @private
   */
  private addFiltersToQuery(
    filters: Record<string, any>,
    whereConditions: string[],
    queryParams: any[]
  ): void {
    for (const [field, filterConfig] of Object.entries(filters)) {
      if (typeof filterConfig === 'object' && filterConfig !== null) {
        const { operator = 'eq', value } = filterConfig;
        const sqlOperator = this.mapOperator(operator);
        whereConditions.push(`${field} ${sqlOperator} ?`);
        queryParams.push(this.processFilterValue(operator, value));
      } else {
        // Simple equality filter
        whereConditions.push(`${field} = ?`);
        queryParams.push(filterConfig);
      }
    }
  }

  /**
   * Add parameters to query
   * @param params Parameters object
   * @param whereConditions Where conditions array
   * @param queryParams Query parameters array
   * @private
   */
  private addParamsToQuery(
    params: Record<string, any>,
    whereConditions: string[],
    queryParams: any[]
  ): void {
    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith('filter_')) {
        const field = key.substring(7); // Remove 'filter_' prefix
        whereConditions.push(`${field} = ?`);
        queryParams.push(value);
      }
    }
  }

  /**
   * Map filter operators to SQL operators
   * @param operator Filter operator
   * @private
   */
  private mapOperator(operator: string): string {
    switch (operator) {
      case 'eq': return '=';
      case 'neq': return '!=';
      case 'gt': return '>';
      case 'gte': return '>=';
      case 'lt': return '<';
      case 'lte': return '<=';
      case 'like': return 'LIKE';
      case 'in': return 'IN';
      case 'nin': return 'NOT IN';
      case 'contains': return 'ILIKE';
      case 'startswith': return 'ILIKE';
      case 'endswith': return 'ILIKE';
      default: return '=';
    }
  }

  /**
   * Process value for specific operators
   * @param operator Filter operator
   * @param value Filter value
   * @private
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
        return value; // Assume user provides wildcards
      default:
        return value;
    }
  }
}

// ===== FLUENT QUERY BUILDER CLASS =====

/**
 * FluentQueryBuilder class
 * Provides a fluent interface for building queries
 */
class FluentQueryBuilder implements QueryBuilder {
  private tableName: string;
  private selectedFields?: string[];
  private conditions: QueryCondition[] = [];
  private sortFields: { field: string; direction: 'ASC' | 'DESC' }[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string[]): QueryBuilder {
    this.selectedFields = fields;
    return this;
  }

  where(conditions: QueryCondition[]): QueryBuilder {
    this.conditions.push(...conditions);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.sortFields.push({ field, direction });
    return this;
  }

  limit(limit: number): QueryBuilder {
    this.limitValue = limit;
    return this;
  }

  offset(offset: number): QueryBuilder {
    this.offsetValue = offset;
    return this;
  }

  build(): BuiltQuery {
    // Build SELECT clause
    const fields = this.selectedFields ? this.selectedFields.join(', ') : '*';
    let sql = `SELECT ${fields} FROM ${this.tableName}`;
    const params: any[] = [];

    // Build WHERE clause
    if (this.conditions.length > 0) {
      const whereClause = buildWhereClause(this.conditions);
      if (whereClause.sql) {
        sql += ` WHERE ${whereClause.sql}`;
        params.push(...whereClause.params);
      }
    }

    // Build ORDER BY clause
    if (this.sortFields.length > 0) {
      const orderClauses = this.sortFields.map(
        sort => `${sort.field} ${sort.direction}`
      );
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Build LIMIT and OFFSET
    if (this.limitValue !== undefined) {
      sql += ` LIMIT ?`;
      params.push(this.limitValue);
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ?`;
      params.push(this.offsetValue);
    }

    return { sql, params };
  }
}