/**
 * DrizzleAdapter - Minimal, type-safe database adapter using Drizzle ORM
 * 
 * High-level abstraction that hides Drizzle internals while leveraging its strengths.
 * Uses Drizzle's sql`` templates instead of fighting against its design.
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback, QueryFilter, QueryOptions } from '../adapter';
import { DatabaseError } from '../../errors';

type DbType = 'postgres' | 'sqlite' | 'mysql';

export const SqlBuilder = {
  quoteIdent(name: string, dbType: DbType): string {
    // Support schema-qualified names like schema.table (and deeper if needed)
    const parts = String(name).split('.');
    const quoted = parts.map((segment) => {
      if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(segment)) {
        throw new Error(`Invalid identifier: ${name}`);
      }
      return dbType === 'mysql' ? `\`${segment}\`` : `"${segment}"`;
    });
    return quoted.join('.');
  },
  placeholder(index: number, dbType: DbType): string {
    return dbType === 'postgres' ? `$${index + 1}` : '?';
  },
  normalizeDirection(dir?: string): 'ASC' | 'DESC' {
    const d = (dir || 'ASC').toUpperCase();
    return d === 'DESC' ? 'DESC' : 'ASC';
  },
  buildWhere(filters: QueryFilter[] = [], dbType: DbType) {
    const clauses: string[] = [];
    const params: any[] = [];
    for (const filter of filters) {
      const operator = (filter.operator || 'eq').toLowerCase();
      const column = String(filter.field);
      if (operator === 'contains' || operator === 'startswith' || operator === 'endswith') {
        const col = SqlBuilder.quoteIdent(column, dbType);
        const ph = SqlBuilder.placeholder(params.length, dbType);
        let value = String(filter.value ?? '');
        if (operator === 'contains') value = `%${value}%`;
        if (operator === 'startswith') value = `${value}%`;
        if (operator === 'endswith') value = `%${value}`;
        clauses.push(`${col} LIKE ${ph}`);
        params.push(value);
        continue;
      }
      if (operator === 'in' || operator === 'nin') {
        const values: any[] = Array.isArray(filter.value) ? filter.value : [];
        const col = SqlBuilder.quoteIdent(column, dbType);
        if (values.length === 0) {
          clauses.push(operator === 'in' ? '1=0' : '1=1');
          continue;
        }
        const phs = values.map((_, i) => SqlBuilder.placeholder(params.length + i, dbType));
        clauses.push(`${col} ${operator === 'in' ? 'IN' : 'NOT IN'} (${phs.join(', ')})`);
        params.push(...values);
        continue;
      }
      const opMap: Record<string, string> = { eq: '=', neq: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=', like: 'LIKE' };
      const sqlOp = opMap[operator] || '=';
      const col = SqlBuilder.quoteIdent(column, dbType);
      const ph = SqlBuilder.placeholder(params.length, dbType);
      clauses.push(`${col} ${sqlOp} ${ph}`);
      params.push(filter.value);
    }
    const clause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    return { clause, params };
  },
  buildOrderBy(orderBy: QueryOptions['orderBy'] = [], dbType: DbType): string {
    if (!orderBy || orderBy.length === 0) return '';
    const parts = orderBy.map((o: any) => {
      const field = SqlBuilder.quoteIdent(String(o.field), dbType);
      const direction = SqlBuilder.normalizeDirection(o.direction || (o as any).dir);
      return `${field} ${direction}`;
    });
    return parts.length ? `ORDER BY ${parts.join(', ')}` : '';
  },
  buildPagination(options: QueryOptions = {}): string {
    const clauses: string[] = [];
    if (options.limit != null) clauses.push(`LIMIT ${Number(options.limit)}`);
    if (options.offset != null) clauses.push(`OFFSET ${Number(options.offset)}`);
    return clauses.join(' ');
  },
  buildSelect(table: string, filters: QueryFilter[], options: QueryOptions, dbType: DbType) {
    const quotedTable = SqlBuilder.quoteIdent(table, dbType);
    const { clause, params } = SqlBuilder.buildWhere(filters, dbType);
    const order = SqlBuilder.buildOrderBy(options.orderBy, dbType);
    const page = SqlBuilder.buildPagination(options);
    const sql = [`SELECT * FROM ${quotedTable}`, clause, order, page].filter(Boolean).join(' ');
    return { sql, params };
  },
  buildInsert(table: string, data: Record<string, any>, dbType: DbType) {
    const quotedTable = SqlBuilder.quoteIdent(table, dbType);
    const fields = Object.keys(data);
    const quoted = fields.map(f => SqlBuilder.quoteIdent(f, dbType));
    const params = Object.values(data);
    const phs = params.map((_, i) => SqlBuilder.placeholder(i, dbType));
    const sql = `INSERT INTO ${quotedTable} (${quoted.join(', ')}) VALUES (${phs.join(', ')})`;
    return { sql, params };
  },
  buildUpdate(table: string, id: string | number, data: Record<string, any>, dbType: DbType) {
    const quotedTable = SqlBuilder.quoteIdent(table, dbType);
    const fields = Object.keys(data);
    const sets = fields.map((f, i) => `${SqlBuilder.quoteIdent(f, dbType)} = ${SqlBuilder.placeholder(i, dbType)}`);
    const idPlaceholder = SqlBuilder.placeholder(fields.length, dbType);
    const sql = `UPDATE ${quotedTable} SET ${sets.join(', ')} WHERE ${SqlBuilder.quoteIdent('id', dbType)} = ${idPlaceholder}`;
    const params = [...Object.values(data), id];
    return { sql, params };
  },
  buildDelete(table: string, id: string | number, dbType: DbType) {
    const quotedTable = SqlBuilder.quoteIdent(table, dbType);
    const sql = `DELETE FROM ${quotedTable} WHERE ${SqlBuilder.quoteIdent('id', dbType)} = ${SqlBuilder.placeholder(0, dbType)}`;
    const params = [id];
    return { sql, params };
  },
  buildCount(table: string, filters: QueryFilter[], dbType: DbType) {
    const quotedTable = SqlBuilder.quoteIdent(table, dbType);
    const { clause, params } = SqlBuilder.buildWhere(filters, dbType);
    const sql = `SELECT COUNT(*) as count FROM ${quotedTable} ${clause}`.trim();
    return { sql, params };
  },
};

interface DrizzleDatabase {
  execute(query: any): Promise<any>;
  transaction<T>(callback: (tx: DrizzleDatabase) => Promise<T>): Promise<T>;
}

interface SqlOperator { raw(sql: string): any; }

interface DatabaseClient {
  connect?(): Promise<void>;
  end?(): Promise<void>;
  close?(): void;
  pragma?(pragma: string): any;
}

export class DrizzleAdapter extends DatabaseAdapter {
  private db: DrizzleDatabase | null = null;
  private client: DatabaseClient | null = null;
  private dbType: DbType;
  private sql: SqlOperator | null = null;

  constructor(config: DatabaseAdapterConfig & { type?: DbType } = {}) {
    super(config);
    this.dbType = (config as any).type || 'sqlite';
  }

  async connect(): Promise<void> {
    if (this.db) return;
    try {
      const drizzleCore = await import('drizzle-orm');
      this.sql = (drizzleCore as any).sql;
    } catch (error) {
      throw new DatabaseError('connect', { cause: new Error('drizzle-orm is not installed'), context: { dependency: 'drizzle-orm' } });
    }
    if (this.dbType === 'postgres') {
      await this.connectPostgres();
    } else if (this.dbType === 'mysql') {
      await this.connectMySQL();
    } else {
      await this.connectSQLite();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.dbType !== 'sqlite' && this.client?.end) {
        await this.client.end();
      } else if (this.dbType === 'sqlite' && this.client?.close) {
        this.client.close();
      }
      this.db = null;
      this.client = null;
    } catch (error) {
      throw new DatabaseError('disconnect', { cause: error });
    }
  }

  isConnected(): boolean { return this.db !== null; }

  async query<T = any>(sqlQuery: string, params: any[] = []): Promise<T[]> {
    await this.ensureConnected();
    try {
      const query = this.createQuery(sqlQuery, params);
      const result = await this.db!.execute(query);
      return Array.isArray(result) ? result : (result.rows || []);
    } catch (error) {
      throw new DatabaseError('query', { cause: error, context: { sql: sqlQuery, params } });
    }
  }

  async execute(sqlQuery: string, params: any[] = []): Promise<{ changes: number; lastInsertId?: string | number }> {
    await this.ensureConnected();
    try {
      const query = this.createQuery(sqlQuery, params);
      const result = await this.db!.execute(query);
      return this.extractExecutionMetadata(result);
    } catch (error) {
      throw new DatabaseError('execute', { cause: error, context: { sql: sqlQuery, params } });
    }
  }

  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    await this.ensureConnected();
    try {
      return await this.db!.transaction(async (tx: DrizzleDatabase) => {
        const txAdapter = new DrizzleAdapter(this.config);
        txAdapter.db = tx;
        txAdapter.sql = this.sql;
        txAdapter.dbType = this.dbType as DbType;
        return callback(txAdapter);
      });
    } catch (error) {
      throw new DatabaseError('transaction', { cause: error });
    }
  }

  async tableExists(schema:string,tableName: string): Promise<boolean> {
    if (this.dbType === 'sqlite') {
      const rows = await this.query<any>(`SELECT name FROM sqlite_master WHERE type='table' AND name=${this.valuePlaceholder(1)} LIMIT 1`, [tableName]);
      return rows.length > 0;
    }
    if (this.dbType === 'postgres') {
      const rows = await this.query<any>(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = ${this.valuePlaceholder(0)} AND table_name = ${this.valuePlaceholder(1)}) as exists`, [schema,tableName]);
      return Boolean(rows[0]?.exists);
    }
    const rows = await this.query<any>(`SELECT EXISTS (SELECT * FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${this.valuePlaceholder(0)}) as \`exists\``, [tableName]);
    return Boolean(rows[0]?.exists);
  }

  async createTable(tableName: string, columns: ColumnDefinition[]): Promise<void> {
    const columnDefs: string[] = [];
    const fkConstraints: string[] = [];
  
    for (const c of columns) {
      const parts: string[] = [
        SqlBuilder.quoteIdent(c.name, this.dbType),
        this.mapDataType(c.type),
      ];
  
      // Identity must come right after the type in Postgres
      if (c.autoIncrement) parts.push('GENERATED ALWAYS AS IDENTITY');
  
      // Defaults can come before/after constraints; this is fine
      if (c.default !== undefined) parts.push('DEFAULT ' + this.formatDefault(c.default));
  
      // NOT NULL is implied by PRIMARY KEY; avoid duplicating
      if (c.notNull && !c.primaryKey) parts.push('NOT NULL');
  
      if (c.unique) parts.push('UNIQUE');
      if (c.primaryKey) parts.push('PRIMARY KEY');
  
      columnDefs.push(parts.join(' '));
  
      // Add FK as a table-level constraint after all columns
      if (c.references) {
        const ref = c.references as any;
        const fkParts = [
          `FOREIGN KEY (${SqlBuilder.quoteIdent(c.name, this.dbType)})`,
          `REFERENCES ${SqlBuilder.quoteIdent(ref.table, this.dbType)}(${SqlBuilder.quoteIdent(ref.column, this.dbType)})`,
        ];
        if (ref.onDelete) fkParts.push(`ON DELETE ${ref.onDelete}`);
        if (ref.onUpdate) fkParts.push(`ON UPDATE ${ref.onUpdate}`);
        fkConstraints.push(fkParts.join(' '));
      }
    }
  
    const allDefs = fkConstraints.length
      ? `${columnDefs.join(', ')}, ${fkConstraints.join(', ')}`
      : columnDefs.join(', ');
  
    const sql = `CREATE TABLE IF NOT EXISTS ${SqlBuilder.quoteIdent(tableName, this.dbType)} (${allDefs})`;
    await this.execute(sql);
  }

  async getTableColumns(tableName: string): Promise<ColumnDefinition[]> {
    if (this.dbType === 'sqlite') {
      const rows = await this.query<any>(`PRAGMA table_info(${SqlBuilder.quoteIdent(tableName, this.dbType)})`);
      return rows.map((r: any) => ({ name: r.name, type: r.type, notNull: Boolean(r.notnull), default: r.dflt_value, primaryKey: Boolean(r.pk) }));
    }
    if (this.dbType === 'postgres') {
      const sql = `SELECT column_name as name, data_type as type, is_nullable = 'NO' as "notNull", column_default as "default" FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${this.valuePlaceholder(0)} ORDER BY ordinal_position`;
      return this.query(sql, [tableName]);
    }
    const sql = `SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE = 'NO' as notNull, COLUMN_DEFAULT as \`default\` FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ${this.valuePlaceholder(0)} ORDER BY ORDINAL_POSITION`;
    return this.query(sql, [tableName]);
  }

  async select(table: string, filters: QueryFilter[], options: QueryOptions): Promise<any[]> {
    const { sql, params } = SqlBuilder.buildSelect(table, filters, options, this.dbType);
    return this.query(sql, params);
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    const { sql, params } = SqlBuilder.buildInsert(table, data, this.dbType);
    const returning = this.dbType === 'postgres' ? ' RETURNING *' : '';
    const res = await this.execute(sql + returning, params);
    return { id: res.lastInsertId, ...data };
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<any> {
    const { sql, params } = SqlBuilder.buildUpdate(table, id, this.dbType === 'postgres' ? data : data, this.dbType);
    const res = await this.execute(sql, params);
    if (res.changes === 0) throw new Error(`No record found with id: ${id}`);
    return { id, ...data };
  }

  async delete(table: string, id: string): Promise<void> {
    const { sql, params } = SqlBuilder.buildDelete(table, id, this.dbType);
    const res = await this.execute(sql, params);
    if (res.changes === 0) throw new Error(`No record found with id: ${id}`);
  }

  async count(table: string, filters: QueryFilter[]): Promise<number> {
    const { sql, params } = SqlBuilder.buildCount(table, filters, this.dbType);
    const rows = await this.query<{ count: number }>(sql, params);
    return Number(rows[0]?.count) || 0;
  }

  async findById(table: string, id: string): Promise<any | null> {
    const quotedTable = SqlBuilder.quoteIdent(table, this.dbType);
    const idCol = SqlBuilder.quoteIdent('id', this.dbType);
    const sql = `SELECT * FROM ${quotedTable} WHERE ${idCol} = ${this.valuePlaceholder(0)} LIMIT 1`;
    const rows = await this.query(sql, [id]);
    return rows[0] || null;
  }

  private createQuery(sqlQuery: string, params: any[]): any {
    if (params.length === 0) return (this.sql as any).raw(sqlQuery);
    const sqlUtil = this.sql as any;
    if (sqlUtil && typeof sqlUtil.fromList === 'function') {
      const chunks: any[] = [];
      const placeholder = this.dbType === 'postgres' ? /\$\d+/ : /\?/;
      const parts = sqlQuery.split(placeholder);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) chunks.push(sqlUtil.raw(parts[i]));
        if (i < parts.length - 1 && i < params.length) {
          chunks.push(params[i]);
        }
      }
      return sqlUtil.fromList(chunks);
    }
    // Fallback
    return { sql: sqlQuery, params } as any;
  }

  private extractExecutionMetadata(result: any): { changes: number; lastInsertId?: string | number } {
    if (this.dbType === 'postgres') {
      return { changes: result.rowCount || 0, lastInsertId: result.rows?.[0]?.id };
    }
    if (this.dbType === 'mysql') {
      return { changes: result.affectedRows || 0, lastInsertId: result.insertId };
    }
    return { changes: result.changes || 0, lastInsertId: result.lastInsertRowid };
  }

  async createSchema(schemaName: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.execute(`CREATE SCHEMA IF NOT EXISTS ${SqlBuilder.quoteIdent(schemaName, this.dbType)}`);
    } else if (this.dbType === 'mysql') {
      await this.execute(`CREATE DATABASE IF NOT EXISTS ${SqlBuilder.quoteIdent(schemaName, this.dbType)}`);
    }
  }

  async dropSchema(schemaName: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.execute(`DROP SCHEMA IF EXISTS ${SqlBuilder.quoteIdent(schemaName, this.dbType)} CASCADE`);
    } else if (this.dbType === 'mysql') {
      await this.execute(`DROP DATABASE IF EXISTS ${SqlBuilder.quoteIdent(schemaName, this.dbType)}`);
    }
  }

  async listSchemas(): Promise<string[]> {
    if (this.dbType === 'sqlite') return ['main'];
    if (this.dbType === 'postgres') {
      const rows = await this.query<any>(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')`
      );
      return rows.map((r: any) => r.schema_name);
    }
    const rows = await this.query<any>(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')`
    );
    return rows.map((r: any) => r.SCHEMA_NAME);
  }

  private async ensureConnected(): Promise<void> { if (!this.db) { await this.connect(); } }
  private valuePlaceholder(index: number): string { return SqlBuilder.placeholder(index, this.dbType); }
  private mapDataType(type: string): string {
    const map: Record<DbType, Record<string, string>> = {
      postgres: { string: 'VARCHAR(255)', text: 'TEXT', integer: 'INTEGER', boolean: 'BOOLEAN', date: 'DATE', datetime: 'TIMESTAMP', json: 'JSONB', uuid: 'UUID' },
      mysql: { string: 'VARCHAR(255)', text: 'TEXT', integer: 'INT', boolean: 'BOOLEAN', date: 'DATE', datetime: 'DATETIME', json: 'JSON', uuid: 'VARCHAR(36)' },
      sqlite: { string: 'TEXT', text: 'TEXT', integer: 'INTEGER', boolean: 'INTEGER', date: 'TEXT', datetime: 'TEXT', json: 'TEXT', uuid: 'TEXT' },
    };
    return map[this.dbType]?.[type.toLowerCase()] || type.toUpperCase();
  }
  private formatDefault(value: any): string {
    if (value === null) return 'NULL';
    if (value === 'CURRENT_TIMESTAMP') return 'CURRENT_TIMESTAMP';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return this.dbType === 'sqlite' ? (value ? '1' : '0') : String(value);
    return String(value);
  }
  private async connectPostgres(): Promise<void> {
    let Client: any; let drizzle: any;
    // @ts-ignore optional peer
    try { Client = (await import('pg')).Client; } catch { throw new Error('pg is not installed'); }
    // @ts-ignore optional peer
    try { drizzle = (await import('drizzle-orm/node-postgres')).drizzle; } catch { throw new Error('drizzle-orm node-postgres not available'); }
    const hasConnStr = typeof (this.config as any).connectionString === 'string' && (this.config as any).connectionString.length > 0;
    const clientConfig = hasConnStr
      ? { connectionString: (this.config as any).connectionString, ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined }
      : { host: this.config.host || 'localhost', port: this.config.port || 5432, database: this.config.database || 'postgres', user: this.config.user, password: this.config.password, ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined };
    const client = new Client(clientConfig); await client.connect(); this.client = client; this.db = drizzle(client) as DrizzleDatabase;
  }
  private async connectMySQL(): Promise<void> {
    let mysql: any; let drizzle: any;
    // @ts-ignore optional peer
    try { mysql = await import('mysql2/promise'); } catch { throw new Error('mysql2 is not installed'); }
    // @ts-ignore optional peer
    try { drizzle = (await import('drizzle-orm/mysql2')).drizzle; } catch { throw new Error('drizzle-orm mysql2 not available'); }
    this.client = await mysql.createConnection({ host: this.config.host || 'localhost', port: this.config.port || 3306, database: this.config.database, user: this.config.user, password: this.config.password });
    this.db = drizzle(this.client) as DrizzleDatabase;
  }
  private async connectSQLite(): Promise<void> {
    let Database: any; let drizzle: any;
    // @ts-ignore optional peer
    try { Database = (await import('better-sqlite3')).default; } catch { throw new Error('better-sqlite3 is not installed'); }
    // @ts-ignore optional peer
    try { drizzle = (await import('drizzle-orm/better-sqlite3')).drizzle; } catch { throw new Error('drizzle-orm better-sqlite3 not available'); }
    const filename = (this.config as any).filename || ':memory:'; this.client = new Database(filename);
    this.client?.pragma?.('foreign_keys = ON'); if (filename !== ':memory:') this.client?.pragma?.('journal_mode = WAL');
    this.db = drizzle(this.client) as DrizzleDatabase;
  }
  get drizzleInstance(): DrizzleDatabase { return this.db!; }
}