/**
 * Query Builder - Handles query operations and view execution
 */
import { DatabaseAdapter } from '../database/adapter';
import { Context, EntityConfiguration, QueryResult } from '../types';
import { SchemaKitError } from '../errors';
import { ValidationManager } from './validation-manager';
import { PermissionManager } from './permission-manager';

/**
 * Query Builder interface
 */
export interface QueryBuilder {
  table: string;
  selectFields: string;
  whereConditions: { field: string; op: string; value: any }[];
  orderByFields: { field: string; direction: 'asc' | 'desc' }[];
  limitValue: number;
  offsetValue: number;
  
  select(fields: string | string[]): QueryBuilder;
  addWhere(field: string, op: string, value: any): QueryBuilder;
  addOrderBy(field: string, direction?: 'asc' | 'desc'): QueryBuilder;
  setLimit(limit: number): QueryBuilder;
  setOffset(offset: number): QueryBuilder;
}

/**
 * Query Manager class
 */
export class QueryManager {
  private databaseAdapter: DatabaseAdapter;
  private validationManager: ValidationManager;
  private permissionManager: PermissionManager;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
    this.validationManager = new ValidationManager();
    this.permissionManager = new PermissionManager(databaseAdapter);
  }

  /**
   * Execute view query
   * @param entityConfig Entity configuration
   * @param viewName View name
   * @param params Query parameters
   * @param context User context
   */
  async executeView(
    entityConfig: EntityConfiguration,
    viewName: string,
    params: Record<string, any> = {},
    context: Context = {}
  ): Promise<QueryResult> {
    try {
      // Find the requested view
      const view = entityConfig.views.find(v => v.name === viewName);
      if (!view) {
        throw new SchemaKitError(`View '${viewName}' not found for entity '${entityConfig.entity.name}'`);
      }
      
      // Apply RLS (Row Level Security) conditions
      const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
      
      // Build query from view configuration
      const queryConfig = view.query_config;
      
      // Start building the SQL query
      let sql = `SELECT ${Array.isArray(view.fields) ? view.fields.join(', ') : '*'} FROM ${entityConfig.entity.table_name}`;
      
      // Add joins if specified
      if (queryConfig.joins && queryConfig.joins.length > 0) {
        for (const join of queryConfig.joins) {
          const joinType = join.type || 'inner';
          sql += ` ${joinType.toUpperCase()} JOIN ${join.entity} ${join.alias ? 'AS ' + join.alias : ''} ON ${join.on}`;
        }
      }
      
      // Add where conditions
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      
      // Add filters from view config
      if (queryConfig.filters) {
        this.addFiltersToQuery(queryConfig.filters, whereConditions, queryParams);
      }
      
      // Add filters from params
      this.addParamsToQuery(params, whereConditions, queryParams);
      
      // Add RLS conditions if any
      if (rlsConditions.sql) {
        whereConditions.push(`(${rlsConditions.sql})`);
        queryParams.push(...rlsConditions.params);
      }
      
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
      
      // Get total count first
      const countSql = `SELECT COUNT(*) as total FROM ${entityConfig.entity.table_name}`;
      const countWhere = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';
      const countResult = await this.databaseAdapter.query(countSql + countWhere, queryParams);
      const total = countResult[0]?.total || 0;
      
      // Add LIMIT and OFFSET
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(perPage, (page - 1) * perPage);
      
      // Execute query
      const results = await this.databaseAdapter.query(sql, queryParams);
      
      // Process results
      const processedResults = results.map(result => this.validationManager.processEntityResult(entityConfig, result));
      
      // Check permissions for actions
      const permissions = await this.permissionManager.getEntityPermissions(entityConfig, context);
      
      return {
        data: processedResults,
        meta: {
          total,
          page,
          per_page: perPage,
          has_more: total > page * perPage
        },
        permissions: {
          can_create: permissions.create || false,
          can_update: permissions.update || false,
          can_delete: permissions.delete || false
        }
      };
    } catch (error) {
      throw new SchemaKitError(`Failed to execute view '${viewName}' for entity '${entityConfig.entity.name}': ${error}`);
    }
  }

  /**
   * Execute custom query
   * @param entityConfig Entity configuration
   * @param queryBuilder Query builder function
   * @param context User context
   */
  async executeCustomQuery(
    entityConfig: EntityConfiguration,
    queryBuilder: (query: QueryBuilder) => QueryBuilder,
    context: Context = {}
  ): Promise<QueryResult> {
    try {
      // Create a query builder object
      const queryObj: QueryBuilder = {
        table: entityConfig.entity.table_name,
        selectFields: '*',
        whereConditions: [],
        orderByFields: [],
        limitValue: 10,
        offsetValue: 0,
        
        // Methods for building the query
        select(fields: string | string[]): QueryBuilder {
          this.selectFields = Array.isArray(fields) ? fields.join(', ') : fields;
          return this;
        },
        
        addWhere(field: string, op: string, value: any): QueryBuilder {
          this.whereConditions.push({ field, op, value });
          return this;
        },
        
        addOrderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
          this.orderByFields.push({ field, direction });
          return this;
        },
        
        setLimit(limit: number): QueryBuilder {
          this.limitValue = limit;
          return this;
        },
        
        setOffset(offset: number): QueryBuilder {
          this.offsetValue = offset;
          return this;
        }
      };
      
      // Let the caller build the query
      const builtQuery = queryBuilder(queryObj);
      
      // Apply RLS (Row Level Security) conditions
      const rlsConditions = this.permissionManager.buildRLSConditions(entityConfig, context);
      
      // Build SQL query
      let sql = `SELECT ${builtQuery.selectFields} FROM ${builtQuery.table}`;
      const params: any[] = [];
      
      // Add WHERE conditions
      const whereConditions: string[] = [];
      
      for (const condition of builtQuery.whereConditions) {
        whereConditions.push(`${condition.field} ${condition.op} ?`);
        params.push(condition.value);
      }
      
      // Add RLS conditions if any
      if (rlsConditions.sql) {
        whereConditions.push(`(${rlsConditions.sql})`);
        params.push(...rlsConditions.params);
      }
      
      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      // Add ORDER BY clause
      if (builtQuery.orderByFields.length > 0) {
        const orderClauses = builtQuery.orderByFields.map(
          (order: { field: string; direction: 'asc' | 'desc' }) => 
            `${order.field} ${order.direction.toUpperCase()}`
        );
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }
      
      // Add LIMIT and OFFSET
      sql += ` LIMIT ? OFFSET ?`;
      params.push(builtQuery.limitValue, builtQuery.offsetValue);
      
      // Get total count first (for pagination)
      const countSql = `SELECT COUNT(*) as total FROM ${builtQuery.table}`;
      const countWhere = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';
      const countParams = params.slice(0, params.length - 2); // Remove limit and offset
      const countResult = await this.databaseAdapter.query(countSql + countWhere, countParams);
      const total = countResult[0]?.total || 0;
      
      // Execute query
      const results = await this.databaseAdapter.query(sql, params);
      
      // Process results
      const processedResults = results.map(result => this.validationManager.processEntityResult(entityConfig, result));
      
      // Check permissions for actions
      const permissions = await this.permissionManager.getEntityPermissions(entityConfig, context);
      
      return {
        data: processedResults,
        meta: {
          total,
          page: Math.floor(builtQuery.offsetValue / builtQuery.limitValue) + 1,
          per_page: builtQuery.limitValue,
          has_more: total > builtQuery.offsetValue + builtQuery.limitValue
        },
        permissions: {
          can_create: permissions.create || false,
          can_update: permissions.update || false,
          can_delete: permissions.delete || false
        }
      };
    } catch (error) {
      throw new SchemaKitError(`Failed to execute custom query for entity '${entityConfig.entity.name}': ${error}`);
    }
  }

  /**
   * Add filters from view config to query
   * @param filters Filters configuration
   * @param whereConditions Where conditions array
   * @param queryParams Query parameters array
   * @private
   */
  private addFiltersToQuery(
    filters: Record<string, any>,
    whereConditions: string[],
    queryParams: any[]
  ): void {
    for (const [field, filter] of Object.entries(filters)) {
      if (typeof filter === 'object') {
        // Handle complex filters (e.g., range, in, etc.)
        if ('eq' in filter) {
          whereConditions.push(`${field} = ?`);
          queryParams.push(filter.eq);
        } else if ('neq' in filter) {
          whereConditions.push(`${field} != ?`);
          queryParams.push(filter.neq);
        } else if ('gt' in filter) {
          whereConditions.push(`${field} > ?`);
          queryParams.push(filter.gt);
        } else if ('gte' in filter) {
          whereConditions.push(`${field} >= ?`);
          queryParams.push(filter.gte);
        } else if ('lt' in filter) {
          whereConditions.push(`${field} < ?`);
          queryParams.push(filter.lt);
        } else if ('lte' in filter) {
          whereConditions.push(`${field} <= ?`);
          queryParams.push(filter.lte);
        } else if ('in' in filter && Array.isArray(filter.in)) {
          const placeholders = filter.in.map(() => '?').join(', ');
          whereConditions.push(`${field} IN (${placeholders})`);
          queryParams.push(...filter.in);
        } else if ('like' in filter) {
          whereConditions.push(`${field} LIKE ?`);
          queryParams.push(filter.like);
        }
      } else {
        // Handle simple equality filter
        whereConditions.push(`${field} = ?`);
        queryParams.push(filter);
      }
    }
  }

  /**
   * Add parameters to query
   * @param params Query parameters
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
      // Skip pagination and sorting params
      if (['page', 'per_page', 'sort_by', 'sort_dir'].includes(key)) {
        continue;
      }
      
      if (typeof value === 'object' && value !== null) {
        // Handle complex filters from params
        if ('eq' in value) {
          whereConditions.push(`${key} = ?`);
          queryParams.push(value.eq);
        } else if ('neq' in value) {
          whereConditions.push(`${key} != ?`);
          queryParams.push(value.neq);
        } else if ('gt' in value) {
          whereConditions.push(`${key} > ?`);
          queryParams.push(value.gt);
        } else if ('gte' in value) {
          whereConditions.push(`${key} >= ?`);
          queryParams.push(value.gte);
        } else if ('lt' in value) {
          whereConditions.push(`${key} < ?`);
          queryParams.push(value.lt);
        } else if ('lte' in value) {
          whereConditions.push(`${key} <= ?`);
          queryParams.push(value.lte);
        } else if ('in' in value && Array.isArray(value.in)) {
          const placeholders = value.in.map(() => '?').join(', ');
          whereConditions.push(`${key} IN (${placeholders})`);
          queryParams.push(...value.in);
        } else if ('like' in value) {
          whereConditions.push(`${key} LIKE ?`);
          queryParams.push(value.like);
        }
      } else {
        // Handle simple equality filter
        whereConditions.push(`${key} = ?`);
        queryParams.push(value);
      }
    }
  }
}