/**
 * QueryExecutor
 * Handles query execution and result processing
 */
import { DatabaseAdapter } from '../../database/adapter';
import { EntityConfiguration, ViewDefinition, Context } from '../../types';
import { QueryBuilder, BuiltQuery, QueryFilter } from './query-builder';
import { PaginationManager, PaginationResult } from './pagination-manager';
import { safeJsonParse } from '../../utils/json-helpers';

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

export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
}

/**
 * QueryExecutor class
 * Single responsibility: Execute queries and process results
 */
export class QueryExecutor {
  private databaseAdapter: DatabaseAdapter;
  private queryBuilder: QueryBuilder;
  private paginationManager: PaginationManager;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
    this.queryBuilder = new QueryBuilder(databaseAdapter);
    this.paginationManager = new PaginationManager(databaseAdapter);
  }

  /**
   * Execute a view
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
   * Execute paginated query
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
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';

    // Convert conditions to filters
    const filters: QueryFilter[] = conditions.map(condition => ({
      field: condition.field,
      operator: condition.operator as any,
      value: condition.value
    }));

    // Execute paginated query
    const result = await this.paginationManager.executePaginatedQueryWithOptions(
      tableName,
      tenantId,
      filters,
      options,
      context
    );

    return {
      data: result.data,
      meta: result.meta
    };
  }

  /**
   * Execute aggregation query
   */
  async executeAggregationQuery(
    entityConfig: EntityConfiguration,
    aggregations: { function: string; field: string; alias?: string }[],
    conditions: QueryCondition[] = [],
    groupBy: string[] = [],
    context: Context = {}
  ): Promise<QueryResult> {
    const tableName = entityConfig.entity.table_name;
    const tenantId = context.tenantId || 'default';

    // Build aggregation query
    const aggregationFields = aggregations.map(agg => {
      const alias = agg.alias || `${agg.function}_${agg.field}`;
      return `${agg.function.toUpperCase()}(${agg.field}) as ${alias}`;
    }).join(', ');

    let sql = `SELECT ${aggregationFields} FROM ${tableName}`;
    const params: any[] = [];

    // Add tenant filter
    if (tenantId && tenantId !== 'default') {
      sql += ` WHERE tenant_id = ?`;
      params.push(tenantId);
    }

    // Add conditions
    if (conditions.length > 0) {
      const whereClause = this.buildWhereClause(conditions, params);
      if (tenantId && tenantId !== 'default') {
        sql += ` AND ${whereClause}`;
      } else {
        sql += ` WHERE ${whereClause}`;
      }
    }

    // Add GROUP BY
    if (groupBy.length > 0) {
      sql += ` GROUP BY ${groupBy.join(', ')}`;
    }

    // Execute query
    const data = await this.databaseAdapter.query(sql, params);

    return {
      data,
      total: data.length
    };
  }

  /**
   * Execute raw query
   */
  async executeRawQuery(sql: string, params: any[] = [], context: Context = {}): Promise<QueryResult> {
    try {
      const data = await this.databaseAdapter.query(sql, params);
      return {
        data,
        total: data.length
      };
    } catch (error) {
      throw new Error(`Raw query execution failed: ${error}`);
    }
  }

  /**
   * Execute custom query using QueryBuilder
   */
  async executeCustomQuery(
    entityConfig: EntityConfiguration,
    queryBuilder: (query: any) => any,
    context: Context = {}
  ): Promise<QueryResult> {
    const tableName = entityConfig.entity.table_name;
    
    // Create fluent query builder
    const fluentBuilder = new FluentQueryBuilder(tableName);
    const builtQuery = queryBuilder(fluentBuilder).build();

    // Execute the query
    const data = await this.databaseAdapter.query(builtQuery.sql, builtQuery.params);

    return {
      data,
      total: data.length
    };
  }

  /**
   * Build view query from view definition
   */
  private buildViewQuery(entityConfig: EntityConfiguration, viewConfig: ViewDefinition, params: Record<string, any>): BuiltQuery {
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

  /**
   * Build WHERE clause from conditions
   */
  private buildWhereClause(conditions: QueryCondition[], params: any[]): string {
    return conditions.map(condition => {
      const operator = this.mapOperator(condition.operator);
      const value = this.processFilterValue(condition.operator, condition.value);
      
      if (operator === 'IN' || operator === 'NOT IN') {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(', ');
          params.push(...value);
          return `${condition.field} ${operator} (${placeholders})`;
        } else {
          params.push(value);
          return `${condition.field} ${operator} (?)`;
        }
      } else {
        params.push(value);
        return `${condition.field} ${operator} ?`;
      }
    }).join(' AND ');
  }

  /**
   * Add filters to query
   */
  private addFiltersToQuery(filters: Record<string, any>, whereConditions: string[], queryParams: any[]): void {
    for (const [field, filter] of Object.entries(filters)) {
      if (typeof filter === 'object' && filter !== null) {
        for (const [operator, value] of Object.entries(filter)) {
          const sqlOperator = this.mapOperator(operator);
          const processedValue = this.processFilterValue(operator, value);
          
          if (sqlOperator === 'IN' || sqlOperator === 'NOT IN') {
            if (Array.isArray(processedValue)) {
              const placeholders = processedValue.map(() => '?').join(', ');
              whereConditions.push(`${field} ${sqlOperator} (${placeholders})`);
              queryParams.push(...processedValue);
            } else {
              whereConditions.push(`${field} ${sqlOperator} (?)`);
              queryParams.push(processedValue);
            }
          } else {
            whereConditions.push(`${field} ${sqlOperator} ?`);
            queryParams.push(processedValue);
          }
        }
      } else {
        whereConditions.push(`${field} = ?`);
        queryParams.push(filter);
      }
    }
  }

  /**
   * Add params to query
   */
  private addParamsToQuery(params: Record<string, any>, whereConditions: string[], queryParams: any[]): void {
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'page' && key !== 'per_page' && key !== 'sort_by' && key !== 'sort_dir') {
        whereConditions.push(`${key} = ?`);
        queryParams.push(value);
      }
    }
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

/**
 * Fluent Query Builder
 */
class FluentQueryBuilder {
  private tableName: string;
  private selectedFields?: string[];
  private conditions: QueryCondition[] = [];
  private sortFields: { field: string; direction: 'ASC' | 'DESC' }[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string[]): FluentQueryBuilder {
    this.selectedFields = fields;
    return this;
  }

  where(conditions: QueryCondition[]): FluentQueryBuilder {
    this.conditions = conditions;
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): FluentQueryBuilder {
    this.sortFields.push({ field, direction });
    return this;
  }

  limit(limit: number): FluentQueryBuilder {
    this.limitValue = limit;
    return this;
  }

  offset(offset: number): FluentQueryBuilder {
    this.offsetValue = offset;
    return this;
  }

  build(): BuiltQuery {
    let sql = `SELECT ${this.selectedFields ? this.selectedFields.join(', ') : '*'} FROM ${this.tableName}`;
    const params: any[] = [];

    // Add WHERE clause
    if (this.conditions.length > 0) {
      const whereClause = this.conditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      }).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    // Add ORDER BY
    if (this.sortFields.length > 0) {
      const orderClause = this.sortFields
        .map(sort => `${sort.field} ${sort.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderClause}`;
    }

    // Add LIMIT and OFFSET
    if (this.limitValue) {
      sql += ` LIMIT ?`;
      params.push(this.limitValue);
    }

    if (this.offsetValue) {
      sql += ` OFFSET ?`;
      params.push(this.offsetValue);
    }

    return { sql, params };
  }
}