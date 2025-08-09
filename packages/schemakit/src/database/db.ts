type WhereClause = Record<string, any>;

interface DBOptions {
  adapter: string;
  tenantId: string;
  config?: any; // Adapter config (connection, etc)
  multiTenancy?: MultiTenancyConfig;
}

interface MultiTenancyConfig {
  strategy: 'schema' | 'table-prefix' | 'column' | 'none';
  // For column-based multi-tenancy
  columnName?: string;
  // For table-prefix strategy
  separator?: string; // Default: '_'
}

interface Adapter {
  select(query: any): any;
  insert(query: any): any;
  update(query: any): any;
  delete(query: any): any;
}

// Adapter imports
import { DatabaseAdapter, DatabaseAdapterConfig } from './adapter';
import { InMemoryAdapter } from './adapters/inmemory';
import { DatabaseError } from '../errors';

type AdapterInstance = DatabaseAdapter;

export class DB {
  private adapter: AdapterInstance | null = null;
  private adapterConfig: { type: string; config: any };
  private tenantId: string;
  private multiTenancy: MultiTenancyConfig;
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
      config: opts.config || {}
    };
    
    // Default multi-tenancy configuration
    this.multiTenancy = opts.multiTenancy || {
      strategy: 'column',
      columnName: 'tenant_id'
    };
  }

  /**
   * Initialize the database adapter
   * Must be called before using the DB instance
   */
  async init(): Promise<void> {
    if (!this.adapter) {
      this.adapter = await DatabaseAdapter.create(
        this.adapterConfig.type,
        this.adapterConfig.config
      );
    }
  }

  /**
   * Ensure adapter is initialized
   */
  private async ensureAdapter(): Promise<void> {
    if (!this.adapter) {
      await this.init();
    }
  }

  /**
   * Resolve table name based on multi-tenancy strategy
   */
  private resolveTableName(table: string): string {
    switch (this.multiTenancy.strategy) {
      case 'schema':
        // For schema-based, prepend schema name
        return `${this.tenantId}.${table}`;
      
      case 'table-prefix':
        // For table-prefix, add tenant prefix
        const separator = this.multiTenancy.separator || '_';
        return `${this.tenantId}${separator}${table}`;
      
      case 'column':
      case 'none':
      default:
        // For column-based or none, use table name as-is
        return table;
    }
  }

  /**
   * Add tenant filter based on multi-tenancy strategy
   */
  private addTenantFilter(filters: any[]): any[] {
    if (this.multiTenancy.strategy === 'column' && this.tenantId !== 'default') {
      const columnName = this.multiTenancy.columnName || 'tenant_id';
      return [
        ...filters,
        { field: columnName, operator: 'eq', value: this.tenantId }
      ];
    }
    return filters;
  }

  /**
   * Add tenant data to insert/update operations
   */
  private addTenantData(data: Record<string, any>): Record<string, any> {
    if (this.multiTenancy.strategy === 'column' && this.tenantId !== 'default') {
      const columnName = this.multiTenancy.columnName || 'tenant_id';
      return {
        ...data,
        [columnName]: this.tenantId
      };
    }
    return data;
  }

  select(fields: string | string[]): this {
    this._select = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  from(table: string): this {
    this._from = table;
    return this;
  }

  where(conditions: WhereClause): this {
    this._where.push(conditions);
    return this;
  }

  orWhere(conditions: WhereClause): this {
    this._orWhere.push(conditions);
    return this;
  }

  orderBy(field: string, dir: "ASC" | "DESC" = "ASC"): this {
    this._orderBy.push({ field, dir });
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  /**
   * Set result offset for pagination
   */
  offset(n: number): this {
    this._offset = n;
    return this;
  }

  /**
   * Helper to convert where/orWhere to QueryFilter[]
   */
  private buildFilters(): any[] {
    // Emit { field, value, operator: '=' } for equality
    const filters: any[] = [];
    for (const clause of this._where) {
      for (const key in clause) {
        filters.push({ field: key, value: clause[key], operator: '=' });
      }
    }
    // OR logic not handled here; extend as needed
    return filters;
  }

  /**
   * Helper to convert orderBy/limit to QueryOptions
   */
  private buildOptions(): any {
    const options: any = {};
    if (this._orderBy.length > 0) {
      options.orderBy = this._orderBy;
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

  async get(table?: string): Promise<any> {
    await this.ensureAdapter();
    const baseFilters = this.buildFilters();
    const filters = this.addTenantFilter(baseFilters);
    const options = this.buildOptions();
    const tableName = table || this._from;
    const resolvedTable = this.resolveTableName(tableName);
    
    const res = await this.adapter!.select(
      resolvedTable,
      filters,
      options
    );
    this.reset();
    return res;
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    await this.ensureAdapter();
    const resolvedTable = this.resolveTableName(table);
    const dataWithTenant = this.addTenantData(data);
    
    const res = await this.adapter!.insert(resolvedTable, dataWithTenant);
    this.reset();
    return res;
  }

  async update(table: string, data: Record<string, any>): Promise<any> {
    await this.ensureAdapter();
    const resolvedTable = this.resolveTableName(table);
    const dataWithTenant = this.addTenantData(data);
    
    // For now, only support update by filters (not by ID)
    // You may want to extend for update by ID
    const filters = this.buildFilters();
    // Assume first filter is the ID if present
    const id = filters[0]?.value;
    const res = await this.adapter!.update(resolvedTable, id, dataWithTenant);
    this.reset();
    return res;
  }

  async delete(table: string): Promise<any> {
    await this.ensureAdapter();
    const resolvedTable = this.resolveTableName(table);
    
    const filters = this.buildFilters();
    const id = filters[0]?.value;
    const res = await this.adapter!.delete(resolvedTable, id);
    this.reset();
    return res;
  }

  reset(): this {
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
   * Get the underlying adapter instance (escape hatch)
   * @warning This bypasses some SchemaKit features. Use with caution.
   */
  async getAdapter(): Promise<DatabaseAdapter> {
    await this.ensureAdapter();
    return this.adapter!;
  }

  /**
   * Execute a raw query
   * @warning This bypasses multi-tenancy and other SchemaKit features
   */
  async raw<T = any>(sql: string, params?: any[]): Promise<T[]> {
    await this.ensureAdapter();
    return this.adapter!.query<T>(sql, params);
  }

  /**
   * Execute within a transaction
   */
  async transaction<T>(callback: (trx: DB) => Promise<T>): Promise<T> {
    await this.ensureAdapter();
    
    return this.adapter!.transaction(async (trxAdapter) => {
      // Create a new DB instance with the transaction adapter
      const trxDB = Object.create(this);
      trxDB.adapter = trxAdapter;
      return callback(trxDB);
    });
  }

  /**
   * Create a new DB instance with a different tenant
   */
  withTenant(tenantId: string): DB {
    const newDB = Object.create(this);
    newDB.tenantId = tenantId;
    // Reset query builder state
    newDB._select = [];
    newDB._from = "";
    newDB._where = [];
    newDB._orWhere = [];
    newDB._orderBy = [];
    newDB._limit = undefined;
    return newDB;
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): string {
    return this.tenantId;
  }

  /**
   * Get multi-tenancy configuration
   */
  getMultiTenancyConfig(): MultiTenancyConfig {
    return { ...this.multiTenancy };
  }

  /**
   * Create schema for tenant (if using schema-based multi-tenancy)
   */
  async createTenantSchema(tenantId: string): Promise<void> {
    if (this.multiTenancy.strategy !== 'schema') {
      throw new Error('Schema creation is only supported for schema-based multi-tenancy');
    }
    
    await this.ensureAdapter();
    await this.adapter!.createSchema(tenantId);
  }

  /**
   * Drop schema for tenant (if using schema-based multi-tenancy)
   */
  async dropTenantSchema(tenantId: string): Promise<void> {
    if (this.multiTenancy.strategy !== 'schema') {
      throw new Error('Schema dropping is only supported for schema-based multi-tenancy');
    }
    
    await this.ensureAdapter();
    await this.adapter!.dropSchema(tenantId);
  }

  /**
   * List all tenant schemas
   */
  async listTenantSchemas(): Promise<string[]> {
    if (this.multiTenancy.strategy !== 'schema') {
      throw new Error('Schema listing is only supported for schema-based multi-tenancy');
    }
    
    await this.ensureAdapter();
    return this.adapter!.listSchemas();
  }
}

// Export types
export type { DBOptions, MultiTenancyConfig };
