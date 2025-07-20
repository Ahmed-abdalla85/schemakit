/**
 * QueryManager - Simplified
 * Orchestrates query building, execution, and pagination
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration, Context } from '../types';
import { QueryBuilder, BuiltQuery, QueryFilter } from './query/query-builder';
import { PaginationManager, PaginationOptions } from './query/pagination-manager';
import { QueryExecutor, QueryResult, QueryCondition } from './query/query-executor';

/**
 * Simplified QueryManager class
 * Orchestrates the query components
 */
export class QueryManager {
  private databaseAdapter: DatabaseAdapter;
  private queryBuilder: QueryBuilder;
  private paginationManager: PaginationManager;
  private queryExecutor: QueryExecutor;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
    this.queryBuilder = new QueryBuilder(databaseAdapter);
    this.paginationManager = new PaginationManager(databaseAdapter);
    this.queryExecutor = new QueryExecutor(databaseAdapter);
  }

  // ===== DELEGATE TO QUERY BUILDER =====

  buildSelectQuery(table: string, tenantId: string, filters: QueryFilter[] = [], options: any = {}): BuiltQuery {
    return this.queryBuilder.buildSelectQuery(table, tenantId, filters, options);
  }

  buildInsertQuery(table: string, tenantId: string, data: Record<string, any>): BuiltQuery {
    return this.queryBuilder.buildInsertQuery(table, tenantId, data);
  }

  buildUpdateQuery(table: string, tenantId: string, id: string | number, data: Record<string, any>): BuiltQuery {
    return this.queryBuilder.buildUpdateQuery(table, tenantId, id, data);
  }

  buildDeleteQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    return this.queryBuilder.buildDeleteQuery(table, tenantId, id);
  }

  buildCountQuery(table: string, tenantId: string, filters: QueryFilter[] = []): BuiltQuery {
    return this.queryBuilder.buildCountQuery(table, tenantId, filters);
  }

  buildFindByIdQuery(table: string, tenantId: string, id: string | number): BuiltQuery {
    return this.queryBuilder.buildFindByIdQuery(table, tenantId, id);
  }

  // ===== DELEGATE TO PAGINATION MANAGER =====

  async executePaginatedQuery(
    table: string,
    tenantId: string,
    filters: QueryFilter[] = [],
    options: PaginationOptions = {},
    context: any = {}
  ) {
    return this.paginationManager.executePaginatedQuery(table, tenantId, filters, options, context);
  }

  // ===== DELEGATE TO QUERY EXECUTOR =====

  async executeView(
    entityConfig: EntityConfiguration,
    viewName: string,
    params: Record<string, any> = {},
    context: Context = {}
  ): Promise<QueryResult> {
    return this.queryExecutor.executeView(entityConfig, viewName, params, context);
  }

  async executePaginatedQueryWithEntity(
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
    return this.queryExecutor.executePaginatedQuery(entityConfig, conditions, options, context);
  }

  async executeAggregationQuery(
    entityConfig: EntityConfiguration,
    aggregations: { function: string; field: string; alias?: string }[],
    conditions: QueryCondition[] = [],
    groupBy: string[] = [],
    context: Context = {}
  ): Promise<QueryResult> {
    return this.queryExecutor.executeAggregationQuery(entityConfig, aggregations, conditions, groupBy, context);
  }

  async executeRawQuery(sql: string, params: any[] = [], context: Context = {}): Promise<QueryResult> {
    return this.queryExecutor.executeRawQuery(sql, params, context);
  }

  async executeCustomQuery(
    entityConfig: EntityConfiguration,
    queryBuilder: (query: any) => any,
    context: Context = {}
  ): Promise<QueryResult> {
    return this.queryExecutor.executeCustomQuery(entityConfig, queryBuilder, context);
  }

  // ===== SCHEMA MANAGEMENT =====

  buildCreateSchemaQuery(schemaName: string): BuiltQuery {
    return this.queryBuilder.buildCreateSchemaQuery(schemaName);
  }

  buildDropSchemaQuery(schemaName: string): BuiltQuery {
    return this.queryBuilder.buildDropSchemaQuery(schemaName);
  }

  buildListSchemasQuery(): BuiltQuery {
    return this.queryBuilder.buildListSchemasQuery();
  }
}