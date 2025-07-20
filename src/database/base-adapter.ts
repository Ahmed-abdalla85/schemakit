/**
 * BaseAdapter
 * Common functionality for database adapters
 */
import { DatabaseAdapter, DatabaseAdapterConfig, ColumnDefinition, TransactionCallback, QueryFilter, QueryOptions } from './adapter';

/**
 * Base adapter with common functionality
 */
export abstract class BaseAdapter extends DatabaseAdapter {
  protected connected = false;

  constructor(config: DatabaseAdapterConfig = {}) {
    super(config);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a function within a transaction
   */
  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      await this.execute('BEGIN');
      
      try {
        const result = await callback(this);
        await this.execute('COMMIT');
        return result;
      } catch (error) {
        await this.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw new Error(`Transaction failed: ${error}`);
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const result = await this.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [tableName]
      );
      return result[0]?.exists || false;
    } catch (error) {
      throw new Error(`Failed to check table existence: ${error}`);
    }
  }

  /**
   * Create a new table
   */
  async createTable(tableName: string, columns: ColumnDefinition[]): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const columnDefs = columns.map(column => {
        let def = `${column.name} ${column.type}`;
        
        if (column.primaryKey) {
          def += ' PRIMARY KEY';
        }
        
        if (column.notNull) {
          def += ' NOT NULL';
        }
        
        if (column.unique) {
          def += ' UNIQUE';
        }
        
        if (column.default !== undefined) {
          def += ` DEFAULT ${typeof column.default === 'string' ? `'${column.default}'` : column.default}`;
        }
        
        if (column.references) {
          def += ` REFERENCES ${column.references.table}(${column.references.column})`;
          
          if (column.references.onDelete) {
            def += ` ON DELETE ${column.references.onDelete}`;
          }
        }
        
        return def;
      }).join(', ');
      
      await this.execute(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`);
    } catch (error) {
      throw new Error(`Failed to create table: ${error}`);
    }
  }

  /**
   * Get column information for a table
   */
  async getTableColumns(tableName: string): Promise<ColumnDefinition[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    try {
      const result = await this.query<{
        name: string;
        type: string;
        is_nullable: string;
        column_default: string;
      }[]>(`
        SELECT 
          column_name as name,
          data_type as type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      return result.map((row: any) => ({
        name: row.name,
        type: row.type,
        notNull: row.is_nullable === 'NO',
        default: row.column_default
      }));
    } catch (error) {
      throw new Error(`Failed to get table columns: ${error}`);
    }
  }

  /**
   * Select records with tenant-aware filtering
   */
  async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    // Add tenant filter
    if (tenantId && tenantId !== 'default') {
      sql += ` WHERE tenant_id = ?`;
      params.push(tenantId);
    }

    // Add custom filters
    if (filters.length > 0) {
      const whereClause = this.buildWhereClause(filters, params);
      if (tenantId && tenantId !== 'default') {
        sql += ` AND ${whereClause}`;
      } else {
        sql += ` WHERE ${whereClause}`;
      }
    }

    // Add ordering
    if (options.orderBy && options.orderBy.length > 0) {
      const orderClause = options.orderBy
        .map(order => `${order.field} ${order.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orderClause}`;
    }

    // Add pagination
    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    return await this.query(sql, params);
  }

  /**
   * Insert a record with tenant context
   */
  async insert(table: string, data: Record<string, any>, tenantId?: string): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const params = fields.map(field => data[field]);

    const result = await this.execute(sql, params);
    return { id: result.lastInsertId, ...data };
  }

  /**
   * Update a record with tenant context
   */
  async update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const params = [...fields.map(field => data[field]), id];

    const result = await this.execute(sql, params);
    if (result.changes === 0) {
      throw new Error(`Record not found: ${table} with ID ${id}`);
    }

    return { id, ...data };
  }

  /**
   * Delete a record with tenant context
   */
  async delete(table: string, id: string, tenantId: string): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const result = await this.execute(sql, [id]);

    if (result.changes === 0) {
      throw new Error(`Record not found: ${table} with ID ${id}`);
    }
  }

  /**
   * Count records with tenant-aware filtering
   */
  async count(table: string, filters: QueryFilter[], tenantId: string): Promise<number> {
    if (!this.isConnected()) {
      await this.connect();
    }

    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    // Add tenant filter
    if (tenantId && tenantId !== 'default') {
      sql += ` WHERE tenant_id = ?`;
      params.push(tenantId);
    }

    // Add custom filters
    if (filters.length > 0) {
      const whereClause = this.buildWhereClause(filters, params);
      if (tenantId && tenantId !== 'default') {
        sql += ` AND ${whereClause}`;
      } else {
        sql += ` WHERE ${whereClause}`;
      }
    }

    const result = await this.query<{ count: number }>(sql, params);
    return result[0]?.count || 0;
  }

  /**
   * Find a record by ID with tenant context
   */
  async findById(table: string, id: string, tenantId: string): Promise<any | null> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    const result = await this.query(sql, [id]);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Create a database schema
   */
  async createSchema(schemaName: string): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    await this.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
  }

  /**
   * Drop a database schema
   */
  async dropSchema(schemaName: string): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    await this.execute(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  }

  /**
   * List all database schemas
   */
  async listSchemas(): Promise<string[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const result = await this.query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog')`
    );
    return result.map(row => row.schema_name);
  }

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(filters: QueryFilter[], params: any[]): string {
    return filters.map(filter => {
      const operator = this.mapOperator(filter.operator || 'eq');
      const value = this.processFilterValue(filter.operator || 'eq', filter.value);
      
      if (operator === 'IN' || operator === 'NOT IN') {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(', ');
          params.push(...value);
          return `${filter.field} ${operator} (${placeholders})`;
        } else {
          params.push(value);
          return `${filter.field} ${operator} (?)`;
        }
      } else {
        params.push(value);
        return `${filter.field} ${operator} ?`;
      }
    }).join(' AND ');
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