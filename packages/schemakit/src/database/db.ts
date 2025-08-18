type WhereClause = Record<string, any>;

export interface DBOptions {
  adapter: string;
  tenantId: string;
  config?: any; // Adapter config (connection, etc)
  multiTenancy?: MultiTenancyConfig;
}

export interface MultiTenancyConfig {
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
import { DatabaseError } from '../errors';
import { DEFAULT_TENANT_ID } from './constants';

type AdapterInstance = DatabaseAdapter;

export class DB {
  private adapter: AdapterInstance | null = null;
  private adapterConfig: { type: string; config: any };
  private tenantId: string;
  private multiTenancy: MultiTenancyConfig;
  private _isQueryBuilder: boolean = false;
  private _select: string[] = [];
  private _from: string = "";
  private _where: WhereClause[] = [];
  private _orWhere: WhereClause[] = [];
  private _orderBy: { field: string; dir: "ASC" | "DESC" }[] = [];
  private _limit?: number;
  private _offset?: number;

  constructor(opts: DBOptions) {
    this.tenantId = opts.tenantId || DEFAULT_TENANT_ID;
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
    if (this.multiTenancy.strategy === 'column' && this.tenantId !== DEFAULT_TENANT_ID) {
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
    if (this.multiTenancy.strategy === 'column' && this.tenantId !== DEFAULT_TENANT_ID) {
      const columnName = this.multiTenancy.columnName || 'tenant_id';
      return {
        ...data,
        [columnName]: this.tenantId
      };
    }
    return data;
  }

  /**
   * Create a forked query builder to avoid mutating shared DB state across concurrent queries
   */
  private fork(): DB {
    const qb: DB = Object.create(this);
    qb._isQueryBuilder = true;
    qb._select = [];
    qb._from = "";
    qb._where = [];
    qb._orWhere = [];
    qb._orderBy = [];
    qb._limit = undefined;
    qb._offset = undefined;
    return qb;
  }

  private asBuilder(): DB {
    return this._isQueryBuilder ? this : this.fork();
  }

  select(fields: string | string[]): this {
    const qb = this.asBuilder();
    qb._select = Array.isArray(fields) ? fields : [fields];
    return qb as this;
  }

  from(table: string): this {
    const qb = this.asBuilder();
    qb._from = table;
    return qb as this;
  }

  where(conditions: WhereClause): this {
    const qb = this.asBuilder();
    qb._where.push(conditions);
    return qb as this;
  }

  orWhere(conditions: WhereClause): this {
    const qb = this.asBuilder();
    qb._orWhere.push(conditions);
    return qb as this;
  }

  orderBy(field: string, dir: "ASC" | "DESC" = "ASC"): this {
    const qb = this.asBuilder();
    qb._orderBy.push({ field, dir });
    return qb as this;
  }

  limit(n: number): this {
    const qb = this.asBuilder();
    qb._limit = n;
    return qb as this;
  }

  /**
   * Set result offset for pagination
   */
  offset(n: number): this {
    const qb = this.asBuilder();
    qb._offset = n;
    return qb as this;
  }

  /**
   * Helper to convert where/orWhere to QueryFilter[]
   */
  private buildFilters(): any[] {
    // Build filters supporting both equality object clauses and structured filters
    const filters: any[] = [];
    for (const clause of this._where) {
      if ((clause as any).field && (clause as any).operator) {
        const { field, operator, value } = clause as any;
        filters.push({ field, value, operator });
        continue;
      }
      for (const key in clause) {
        const value = (clause as any)[key];
        if (Array.isArray(value)) {
          filters.push({ field: key, value, operator: 'in' });
        } else if (value === null) {
          filters.push({ field: key, value, operator: 'isNull' });
        } else {
          filters.push({ field: key, value, operator: 'eq' });
        }
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
