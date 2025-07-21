/**
 * FluentQueryBuilder - CodeIgniter-style database query builder
 * 
 * Provides a fluent, chainable interface for building and executing database queries
 * similar to CodeIgniter's Active Record pattern.
 */
import { DatabaseAdapter } from './adapter';

export class FluentQueryBuilder {
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByClause: Array<{ field: string; direction: 'ASC' | 'DESC' }> = [];
  private limitCount?: number;
  private offsetCount?: number;
  private tenantId: string;

  constructor(
    private databaseAdapter: DatabaseAdapter,
    tableName: string,
    tenantId = 'default'
  ) {
    this.tableName = tableName;
    this.tenantId = tenantId;
  }

  // === QUERY BUILDING METHODS ===

  /**
   * Select specific fields
   * @param fields Field names to select
   * @returns FluentQueryBuilder instance for chaining
   */
  select(fields: string | string[] = '*'): FluentQueryBuilder {
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * Add WHERE condition
   * @param field Field name
   * @param operator Operator or value (if only 2 params)
   * @param value Value (if 3 params)
   * @returns FluentQueryBuilder instance for chaining
   */
  where(field: string, operator: string | any, value?: any): FluentQueryBuilder {
    if (arguments.length === 2) {
      // where(field, value) - defaults to equals
      this.whereConditions.push({ field, operator: '=', value: operator });
    } else {
      // where(field, operator, value)
      this.whereConditions.push({ field, operator, value });
    }
    return this;
  }

  /**
   * Add WHERE IN condition
   * @param field Field name
   * @param values Array of values
   * @returns FluentQueryBuilder instance for chaining
   */
  whereIn(field: string, values: any[]): FluentQueryBuilder {
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  /**
   * Add WHERE NOT IN condition
   * @param field Field name
   * @param values Array of values
   * @returns FluentQueryBuilder instance for chaining
   */
  whereNotIn(field: string, values: any[]): FluentQueryBuilder {
    this.whereConditions.push({ field, operator: 'NOT IN', value: values });
    return this;
  }

  /**
   * Add WHERE LIKE condition
   * @param field Field name
   * @param value Value to search for (automatically wrapped with %)
   * @returns FluentQueryBuilder instance for chaining
   */
  whereLike(field: string, value: string): FluentQueryBuilder {
    this.whereConditions.push({ field, operator: 'LIKE', value: `%${value}%` });
    return this;
  }

  /**
   * Add WHERE IS NULL condition
   * @param field Field name
   * @returns FluentQueryBuilder instance for chaining
   */
  whereNull(field: string): FluentQueryBuilder {
    this.whereConditions.push({ field, operator: 'IS NULL', value: null });
    return this;
  }

  /**
   * Add WHERE IS NOT NULL condition
   * @param field Field name
   * @returns FluentQueryBuilder instance for chaining
   */
  whereNotNull(field: string): FluentQueryBuilder {
    this.whereConditions.push({ field, operator: 'IS NOT NULL', value: null });
    return this;
  }

  /**
   * Add ORDER BY clause
   * @param field Field name
   * @param direction Sort direction
   * @returns FluentQueryBuilder instance for chaining
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): FluentQueryBuilder {
    this.orderByClause.push({ field, direction });
    return this;
  }

  /**
   * Add LIMIT clause
   * @param count Number of records to limit
   * @param offset Optional offset
   * @returns FluentQueryBuilder instance for chaining
   */
  limit(count: number, offset?: number): FluentQueryBuilder {
    this.limitCount = count;
    if (offset !== undefined) {
      this.offsetCount = offset;
    }
    return this;
  }

  /**
   * Add OFFSET clause
   * @param count Number of records to skip
   * @returns FluentQueryBuilder instance for chaining
   */
  offset(count: number): FluentQueryBuilder {
    this.offsetCount = count;
    return this;
  }

  // === EXECUTION METHODS ===

  /**
   * Execute query and return all matching records
   * @returns Promise<Record<string, any>[]>
   */
  async get(): Promise<Record<string, any>[]> {
    const sql = this.buildSelectSql();
    const params = this.buildParams();
    return await this.databaseAdapter.query(sql, params);
  }

  /**
   * Execute query and return first matching record
   * @returns Promise<Record<string, any> | null>
   */
  async first(): Promise<Record<string, any> | null> {
    this.limitCount = 1;
    const results = await this.get();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Count matching records
   * @returns Promise<number>
   */
  async count(): Promise<number> {
    const sql = this.buildCountSql();
    const params = this.buildParams();
    const result = await this.databaseAdapter.query(sql, params);
    return result.length > 0 ? parseInt(result[0].count, 10) : 0;
  }

  /**
   * Insert a new record
   * @param data Record data
   * @returns Promise<any>
   */
  async insert(data: Record<string, any>): Promise<any> {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.getQualifiedTableName()} (${fields.join(', ')}) VALUES (${placeholders})`;
    const params = Object.values(data);
    return await this.databaseAdapter.execute(sql, params);
  }

  /**
   * Insert multiple records
   * @param dataArray Array of record data
   * @returns Promise<any>
   */
  async insertBatch(dataArray: Record<string, any>[]): Promise<any> {
    if (dataArray.length === 0) {
      throw new Error('Cannot insert empty batch');
    }

    const fields = Object.keys(dataArray[0]);
    const placeholders = fields.map(() => '?').join(', ');
    const valueRows = dataArray.map(() => `(${placeholders})`).join(', ');
    const sql = `INSERT INTO ${this.getQualifiedTableName()} (${fields.join(', ')}) VALUES ${valueRows}`;
    
    const params: any[] = [];
    for (const data of dataArray) {
      params.push(...Object.values(data));
    }
    
    return await this.databaseAdapter.execute(sql, params);
  }

  /**
   * Update matching records
   * @param data Update data
   * @returns Promise<any>
   */
  async update(data: Record<string, any>): Promise<any> {
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    let sql = `UPDATE ${this.getQualifiedTableName()} SET ${setClause}`;
    const params = [...Object.values(data), ...this.buildParams()];
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.buildWhereClause()}`;
    }
    
    return await this.databaseAdapter.execute(sql, params);
  }

  /**
   * Delete matching records
   * @returns Promise<any>
   */
  async delete(): Promise<any> {
    let sql = `DELETE FROM ${this.getQualifiedTableName()}`;
    const params = this.buildParams();
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.buildWhereClause()}`;
    }
    
    return await this.databaseAdapter.execute(sql, params);
  }

  /**
   * Check if any records exist matching the conditions
   * @returns Promise<boolean>
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  // === PRIVATE HELPER METHODS ===

  private buildSelectSql(): string {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.getQualifiedTableName()}`;
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.buildWhereClause()}`;
    }
    
    if (this.orderByClause.length > 0) {
      const orderBy = this.orderByClause.map(o => `${o.field} ${o.direction}`).join(', ');
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (this.limitCount) {
      sql += ` LIMIT ${this.limitCount}`;
    }
    
    if (this.offsetCount) {
      sql += ` OFFSET ${this.offsetCount}`;
    }
    
    return sql;
  }

  private buildCountSql(): string {
    let sql = `SELECT COUNT(*) as count FROM ${this.getQualifiedTableName()}`;
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.buildWhereClause()}`;
    }
    
    return sql;
  }

  private buildWhereClause(): string {
    return this.whereConditions.map(condition => {
      if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
        const placeholders = Array(condition.value.length).fill('?').join(', ');
        return `${condition.field} ${condition.operator} (${placeholders})`;
      }
      if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
        return `${condition.field} ${condition.operator}`;
      }
      return `${condition.field} ${condition.operator} ?`;
    }).join(' AND ');
  }

  private buildParams(): any[] {
    const params: any[] = [];
    for (const condition of this.whereConditions) {
      if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
        params.push(...condition.value);
      } else if (condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL') {
        params.push(condition.value);
      }
    }
    return params;
  }

  private getQualifiedTableName(): string {
    // Handle tenant prefixing if needed
    if (this.tenantId && this.tenantId !== 'default') {
      return `${this.tenantId}_${this.tableName}`;
    }
    return this.tableName;
  }

  // === UTILITY METHODS ===

  /**
   * Reset all query conditions
   * @returns FluentQueryBuilder instance for chaining
   */
  reset(): FluentQueryBuilder {
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.orderByClause = [];
    this.limitCount = undefined;
    this.offsetCount = undefined;
    return this;
  }

  /**
   * Clone the current query builder
   * @returns New FluentQueryBuilder instance with same conditions
   */
  clone(): FluentQueryBuilder {
    const cloned = new FluentQueryBuilder(this.databaseAdapter, this.tableName, this.tenantId);
    cloned.selectFields = [...this.selectFields];
    cloned.whereConditions = [...this.whereConditions];
    cloned.orderByClause = [...this.orderByClause];
    cloned.limitCount = this.limitCount;
    cloned.offsetCount = this.offsetCount;
    return cloned;
  }

  /**
   * Get the SQL query that would be executed (for debugging)
   * @returns Object with sql and params
   */
  toSql(): { sql: string; params: any[] } {
    return {
      sql: this.buildSelectSql(),
      params: this.buildParams()
    };
  }
}