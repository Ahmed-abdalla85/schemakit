/**
 * DB Class - SchemaKit Query Builder
 * 
 * This class provides SchemaKit's query building interface with support for:
 * - Multi-tenancy
 * - Permissions (future implementation)
 * - Row-Level Security (future implementation)
 * - Dynamic schema queries
 */
import { DatabaseAdapter, QueryFilter, QueryOptions } from './adapter';
import { SchemaKitError } from '../errors';

type WhereClause = Record<string, any>;

export interface DBOptions {
  adapter: string;
  tenantId: string;
  config?: any; // Adapter config (connection, etc)
}

interface DBContext {
  user?: {
    id: string;
    roles: string[];
  };
  permissions?: string[];
}

/**
 * DB Class
 * 
 * Provides a fluent query builder interface for SchemaKit entities.
 * Handles tenant context, permissions, and RLS before delegating to adapters.
 */
export class DB {
  private adapter: DatabaseAdapter | null = null;
  private tenantId: string;
  private context: DBContext = {};
  private adapterConfig: { type: string; config: any };
  
  // Query builder state
  private _select: string[] = [];
  private _from: string = "";
  private _where: WhereClause[] = [];
  private _orWhere: WhereClause[] = [];
  private _orderBy: { field: string; dir: "ASC" | "DESC" }[] = [];
  private _limit?: number;
  private _offset?: number;

  constructor(opts: DBOptions) {
    this.tenantId = opts.tenantId;
    this.adapterConfig = {
      type: opts.adapter,
      config: opts.config
    };
  }

  /**
   * Initialize the database connection
   * Must be called before using the DB instance
   */
  async init(): Promise<void> {
    if (!this.adapter) {
      this.adapter = await DatabaseAdapter.create(
        this.adapterConfig.type, 
        this.adapterConfig.config
      );
      await this.adapter.connect();
    }
  }

  /**
   * Ensure adapter is initialized
   * @private
   */
  private async ensureAdapter(): Promise<DatabaseAdapter> {
    if (!this.adapter) {
      await this.init();
    }
    return this.adapter!;
  }

  /**
   * Set context for permission checks
   */
  setContext(context: DBContext): this {
    this.context = context;
    return this;
  }

  /**
   * Select fields
   */
  select(fields: string | string[]): this {
    this._select = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * Set table
   */
  from(table: string): this {
    this._from = table;
    return this;
  }

  /**
   * Add where conditions
   */
  where(conditions: WhereClause): this {
    this._where.push(conditions);
    return this;
  }

  /**
   * Add OR where conditions
   */
  orWhere(conditions: WhereClause): this {
    this._orWhere.push(conditions);
    return this;
  }

  /**
   * Set order by
   */
  orderBy(field: string, dir: "ASC" | "DESC" = "ASC"): this {
    this._orderBy.push({ field, dir });
    return this;
  }

  /**
   * Set limit
   */
  limit(n: number): this {
    this._limit = n;
    return this;
  }

  /**
   * Set offset
   */
  offset(n: number): this {
    this._offset = n;
    return this;
  }

  /**
   * Helper to convert where/orWhere to QueryFilter[]
   */
  private buildFilters(): QueryFilter[] {
    const filters: QueryFilter[] = [];
    
    // Convert where clauses
    for (const clause of this._where) {
      for (const key in clause) {
        filters.push({ 
          field: key, 
          value: clause[key], 
          operator: 'eq' 
        });
      }
    }
    
    // TODO: Handle OR logic properly
    // For now, OR clauses are treated as additional AND conditions
    for (const clause of this._orWhere) {
      for (const key in clause) {
        filters.push({ 
          field: key, 
          value: clause[key], 
          operator: 'eq' 
        });
      }
    }
    
    return filters;
  }

  /**
   * Helper to convert orderBy/limit to QueryOptions
   */
  private buildOptions(): QueryOptions {
    const options: QueryOptions = {};
    
    if (this._orderBy.length > 0) {
      options.orderBy = this._orderBy.map(o => ({
        field: o.field,
        direction: o.dir
      }));
    }
    
    if (this._limit !== undefined) {
      options.limit = this._limit;
    }
    
    if (this._offset !== undefined) {
      options.offset = this._offset;
    }
    
    if (this._select.length > 0) {
      options.select = this._select;
    }
    
    return options;
  }

  /**
   * Check permissions for the operation
   * @private
   */
  private async checkPermissions(operation: string, table: string): Promise<void> {
    // TODO: Implement permission checking
    // This is where SchemaKit's permission engine would be integrated
    // For now, allow all operations
  }

  /**
   * Apply Row-Level Security filters
   * @private
   */
  private async applyRLS(table: string, filters: QueryFilter[]): Promise<QueryFilter[]> {
    // TODO: Implement RLS
    // This is where SchemaKit's RLS engine would add additional filters
    // based on the current user context
    return filters;
  }

  /**
   * Execute the query and get results
   */
  async get(table?: string): Promise<any[]> {
    const tableName = table || this._from;
    if (!tableName) {
      throw new SchemaKitError('No table specified for query');
    }

    const adapter = await this.ensureAdapter();

    try {
      // Build filters and options
      const filters = this.buildFilters();
      const options = this.buildOptions();
      
      // Check permissions
      await this.checkPermissions('read', tableName);
      
      // Apply RLS
      const rlsFilters = await this.applyRLS(tableName, filters);
      
      // Execute query through adapter
      const results = await adapter.select(
        tableName,
        rlsFilters,
        options,
        this.tenantId
      );
      
      return results;
    } finally {
      this.reset();
    }
  }

  /**
   * Insert a new record
   */
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const adapter = await this.ensureAdapter();

    try {
      // Check permissions
      await this.checkPermissions('create', table);
      
      // Execute insert through adapter
      const result = await adapter.insert(table, data, this.tenantId);
      
      return result;
    } finally {
      this.reset();
    }
  }

  /**
   * Update records
   */
  async update(table: string, data: Record<string, any>): Promise<any> {
    const adapter = await this.ensureAdapter();

    try {
      // Check permissions
      await this.checkPermissions('update', table);
      
      // Build filters to identify record(s) to update
      const filters = this.buildFilters();
      
      if (filters.length === 0) {
        throw new SchemaKitError('No conditions specified for update');
      }
      
      // For now, assume first filter is the ID
      // TODO: Support updating multiple records
      const id = filters[0]?.value;
      
      if (!id) {
        throw new SchemaKitError('No ID specified for update');
      }
      
      // Execute update through adapter
      const result = await adapter.update(table, String(id), data, this.tenantId);
      
      return result;
    } finally {
      this.reset();
    }
  }

  /**
   * Delete records
   */
  async delete(table: string): Promise<void> {
    const adapter = await this.ensureAdapter();

    try {
      // Check permissions
      await this.checkPermissions('delete', table);
      
      // Build filters to identify record(s) to delete
      const filters = this.buildFilters();
      
      if (filters.length === 0) {
        throw new SchemaKitError('No conditions specified for delete');
      }
      
      // For now, assume first filter is the ID
      // TODO: Support deleting multiple records
      const id = filters[0]?.value;
      
      if (!id) {
        throw new SchemaKitError('No ID specified for delete');
      }
      
      // Execute delete through adapter
      await adapter.delete(table, String(id), this.tenantId);
    } finally {
      this.reset();
    }
  }

  /**
   * Count records
   */
  async count(table?: string): Promise<number> {
    const tableName = table || this._from;
    if (!tableName) {
      throw new SchemaKitError('No table specified for count');
    }

    const adapter = await this.ensureAdapter();

    try {
      // Build filters
      const filters = this.buildFilters();
      
      // Check permissions
      await this.checkPermissions('read', tableName);
      
      // Apply RLS
      const rlsFilters = await this.applyRLS(tableName, filters);
      
      // Execute count through adapter
      const count = await adapter.count(
        tableName,
        rlsFilters,
        this.tenantId
      );
      
      return count;
    } finally {
      this.reset();
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(table: string, id: string): Promise<any | null> {
    const adapter = await this.ensureAdapter();

    try {
      // Check permissions
      await this.checkPermissions('read', table);
      
      // Execute query through adapter
      const result = await adapter.findById(table, id, this.tenantId);
      
      return result;
    } finally {
      this.reset();
    }
  }

  /**
   * Execute a raw query (bypass SchemaKit features)
   * @warning This bypasses permissions and RLS
   */
  async raw<T = any>(sql: string, params?: any[]): Promise<T[]> {
    console.warn('Raw queries bypass SchemaKit permissions and RLS');
    const adapter = await this.ensureAdapter();
    return await adapter.query<T>(sql, params);
  }

  /**
   * Start a transaction
   */
  async transaction<T>(callback: (db: DB) => Promise<T>): Promise<T> {
    const adapter = await this.ensureAdapter();
    
    return await adapter.transaction(async (txAdapter) => {
      // Create a new DB instance with the transaction adapter
      const txDb = Object.create(this);
      txDb.adapter = txAdapter;
      return await callback(txDb);
    });
  }

  /**
   * Get the underlying adapter (escape hatch)
   * @warning Direct adapter access bypasses SchemaKit features
   */
  async getAdapter(): Promise<DatabaseAdapter> {
    console.warn('Direct adapter access bypasses SchemaKit features');
    return await this.ensureAdapter();
  }

  /**
   * Reset query builder state
   */
  private reset(): this {
    this._select = [];
    this._from = "";
    this._where = [];
    this._orWhere = [];
    this._orderBy = [];
    this._limit = undefined;
    this._offset = undefined;
    return this;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
    }
  }
}
