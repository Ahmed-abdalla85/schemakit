/**
 * Query Builder - Handles query operations and view execution
 */
import { DatabaseAdapter } from '../database/adapter';
import { Context, EntityConfiguration, QueryResult } from '../types';
/**
 * Query Builder interface
 */
export interface QueryBuilder {
    table: string;
    selectFields: string;
    whereConditions: {
        field: string;
        op: string;
        value: any;
    }[];
    orderByFields: {
        field: string;
        direction: 'asc' | 'desc';
    }[];
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
export declare class QueryManager {
    private databaseAdapter;
    private validationManager;
    private permissionManager;
    constructor(databaseAdapter: DatabaseAdapter);
    /**
     * Execute view query
     * @param entityConfig Entity configuration
     * @param viewName View name
     * @param params Query parameters
     * @param context User context
     */
    executeView(entityConfig: EntityConfiguration, viewName: string, params?: Record<string, any>, context?: Context): Promise<QueryResult>;
    /**
     * Execute custom query
     * @param entityConfig Entity configuration
     * @param queryBuilder Query builder function
     * @param context User context
     */
    executeCustomQuery(entityConfig: EntityConfiguration, queryBuilder: (query: QueryBuilder) => QueryBuilder, context?: Context): Promise<QueryResult>;
    /**
     * Add filters from view config to query
     * @param filters Filters configuration
     * @param whereConditions Where conditions array
     * @param queryParams Query parameters array
     * @private
     */
    private addFiltersToQuery;
    /**
     * Add parameters to query
     * @param params Query parameters
     * @param whereConditions Where conditions array
     * @param queryParams Query parameters array
     * @private
     */
    private addParamsToQuery;
}
