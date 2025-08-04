/**
 * ViewManager - Execute views using loaded Entity metadata
 */
import { DB } from '../../database/db';
import { Context, ViewDefinition, FieldDefinition } from '../../types';
import { RLSPermissionManager } from '../permission/rls-integration';
import { RoleRestrictions } from '../permission/rls-types';

export interface ViewOptions {
  filters?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface ViewResult {
  results: any[];
  total: number;
  fields: FieldDefinition[];
  meta: {
    entityName: string;
    viewName: string;
    query?: string; // For debugging
  };
}

export class ViewManager {
  private rlsManager: RLSPermissionManager | null = null;

  constructor(
    private db: DB,
    private entityName: string,
    private tableName: string,
    private fields: FieldDefinition[],
    private views: ViewDefinition[]
  ) {}

  /**
   * Set RLS restrictions for role-based filtering
   */
  setRLSRestrictions(restrictions: RoleRestrictions): void {
    if (!this.rlsManager) {
      // Create RLS manager using the same adapter as DB
      this.rlsManager = new RLSPermissionManager(this.db);
    }
    this.rlsManager.setRoleRestrictions(restrictions);
  }

  /**
   * Execute a view by name
   */
  async executeView(
    viewName: string, 
    context: Context = {}, 
    options: ViewOptions = {}
  ): Promise<ViewResult> {
    // Find the view definition
    const viewDef = this.views.find(v => v.name === viewName);
    if (!viewDef) {
      throw new Error(`View '${viewName}' not found for entity '${this.entityName}'`);
    }

        // Build query using DB query builder
    let query: DB = this.db.select('*').from(this.tableName);

    // Apply view field selection
    query = this.applyViewSelect(query, viewDef);

    // Apply view filters
    query = this.applyViewFilters(query, viewDef);

    // Apply user filters  
    query = this.applyUserFilters(query, options);

    // Apply sorting
    query = this.applySorting(query, viewDef);
    
    // Apply RLS restrictions
    query = await this.applyRLSRestrictions(query, context);
    
    // Apply pagination
    query = this.applyPagination(query, options);
    
    // Execute the query
    const results = await query.get();

    return {
      results,
      total: results.length, // TODO: Add proper count query in next step
      fields: this.fields,
      meta: {
        entityName: this.entityName,
        viewName
      }
    };
  }

  /**
   * Apply view field selection to query
   */
  private applyViewSelect(query: DB, viewDef: ViewDefinition): DB {
    // If view specifies specific fields, select only those
    if (viewDef.fields && viewDef.fields.length > 0) {
      // Create new query with specific field selection
      query = this.db.select(viewDef.fields).from(this.tableName);
    }
    // Otherwise keep the default SELECT * 
    return query;
  }

  /**
   * Apply view-defined filters to query
   */
  private applyViewFilters(query: DB, viewDef: ViewDefinition): DB {
    if (viewDef.query_config.filters) {
      for (const [field, value] of Object.entries(viewDef.query_config.filters)) {
        query = query.where({ [field]: value });
      }
    }
    return query;
  }

  /**
   * Apply user-provided filters to query
   */
  private applyUserFilters(query: DB, options: ViewOptions): DB {
    if (options.filters) {
      for (const [field, value] of Object.entries(options.filters)) {
        query = query.where({ [field]: value });
      }
    }
    return query;
  }

  /**
   * Apply sorting from view definition
   */
  private applySorting(query: DB, viewDef: ViewDefinition): DB {
    if (viewDef.query_config.sorting && viewDef.query_config.sorting.length > 0) {
      for (const sort of viewDef.query_config.sorting) {
        // Convert lowercase direction to uppercase for DB class
        const direction = sort.direction.toUpperCase() as "ASC" | "DESC";
        query = query.orderBy(sort.field, direction);
      }
    }
    return query;
  }

  /**
   * Apply pagination from user options
   */
  private applyPagination(query: DB, options: ViewOptions): DB {
    if (options.pagination) {
      query = query.limit(options.pagination.limit);
      // Note: DB class doesn't have offset method yet, will add in next step
    }
    return query;
  }

  /**
   * Apply RLS restrictions to query
   */
  private async applyRLSRestrictions(query: DB, context: Context): Promise<DB> {
    // Skip if no RLS manager or no user context
    if (!this.rlsManager || !context.user) {
      return query;
    }

    try {
      // For now, apply a basic user-based restriction if no custom RLS is defined
      // This is a minimal implementation until we enhance the query builder
      if (context.user?.id) {
        // Basic row-level security: users can only see their own records
        query = query.where({ created_by: context.user.id });
      }

      // TODO: Integrate full RLS logic when DB class supports complex where clauses
      // const dummyQuery = `SELECT * FROM ${this.tableName}`;
      // const rlsQuery = this.rlsManager.applyRLSToQuery(dummyQuery, this.entityName, context);

      return query;
    } catch (error) {
      console.warn('Failed to apply RLS restrictions:', error);
      return query; // Continue without RLS if there's an error
    }
  }

  /**
   * Get exposed conditions for user filtering
   */
  getExposedConditions(context: Context): any[] {
    if (!this.rlsManager) {
      return [];
    }
    return this.rlsManager.getExposedConditions(context);
  }
}