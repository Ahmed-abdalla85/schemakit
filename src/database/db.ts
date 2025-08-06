type WhereClause = Record<string, any>;

interface DBOptions {
  adapter: string;
  tenantId: string;
  config?: any; // Adapter config (connection, etc)
}

interface Adapter {
  select(query: any): any;
  insert(query: any): any;
  update(query: any): any;
  delete(query: any): any;
}

// Adapter imports
import { PostgresAdapter } from './adapters/postgres';
import { SQLiteAdapter } from './adapters/sqlite';
import { InMemoryAdapter } from './adapters/inmemory';

type AdapterInstance = PostgresAdapter | SQLiteAdapter | InMemoryAdapter;

export class DB {
  private adapter: AdapterInstance;
  private tenantId: string;
  private _select: string[] = [];
  private _from: string = "";
  private _where: WhereClause[] = [];
  private _orWhere: WhereClause[] = [];
  private _orderBy: { field: string; dir: "ASC" | "DESC" }[] = [];
  private _limit?: number;

  constructor(opts: DBOptions) {
    this.tenantId = opts.tenantId;
    const adapterName = opts.adapter?.toLowerCase();
    const config = opts.config || {};
    if (adapterName === 'postgres') {
      this.adapter = new PostgresAdapter(config);
    } else if (adapterName === 'sqlite') {
      this.adapter = new SQLiteAdapter(config);
    } else if (adapterName === 'inmemory' || adapterName === 'memory' || adapterName === 'mock') {
      this.adapter = new InMemoryAdapter(config);
    } else {
      throw new Error(`Unknown adapter: ${adapterName}`);
    }
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
   * Helper to convert where/orWhere to QueryFilter[]
   */
  private buildFilters(): any[] {
    // Emit { field, value, operator: 'eq' } for equality
    const filters: any[] = [];
    for (const clause of this._where) {
      for (const key in clause) {
        filters.push({ field: key, value: clause[key], operator: 'eq' });
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
    if (this._select.length > 0) {
      options.select = this._select;
    }
    return options;
  }

  async get(table?: string): Promise<any> {
    const filters = this.buildFilters();
    const options = this.buildOptions();
    const tableName = table || this._from;
    const res = await this.adapter.select(
      tableName,
      filters,
      options,
      this.tenantId
    );
    this.reset();
    return res;
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    const res = await this.adapter.insert(table, data, this.tenantId);
    this.reset();
    return res;
  }

  async update(table: string, data: Record<string, any>): Promise<any> {
    // For now, only support update by filters (not by ID)
    // You may want to extend for update by ID
    const filters = this.buildFilters();
    // Assume first filter is the ID if present
    const id = filters[0]?.value;
    const res = await this.adapter.update(table, id, data, this.tenantId);
    this.reset();
    return res;
  }

  async delete(table: string): Promise<any> {
    const filters = this.buildFilters();
    const id = filters[0]?.value;
    const res = await this.adapter.delete(table, id, this.tenantId);
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
    return this;
  }
}
