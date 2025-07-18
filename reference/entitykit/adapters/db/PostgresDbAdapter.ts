// PostgresDbAdapter for SchemaKit
import { Pool } from 'pg';
import { DbAdapter, QueryFilter, QueryOptions } from './DbAdapter';
import { QueryBuilderService } from '../../core/QueryBuilderService';

export class PostgresDbAdapter extends DbAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString });
  }

  async connect(): Promise<void> {
    await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.map((_, i) => `$${i+1}`).join(', ')}) RETURNING *`;
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
    const { query, params } = QueryBuilderService.buildSelectQuery(table, tenantId, filters, options);
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Implement update, delete, count, findById with raw SQL
  async update(table: string, id: string, data: Record<string, any>): Promise<any> {
    const sets = Object.keys(data).map((k, i) => `${k} = $${i+1}`);
    const values = Object.values(data);
    const query = `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${values.length + 1} RETURNING *`;
    const result = await this.pool.query(query, [...values, id]);
    return result.rows[0];
  }

  async delete(table: string, id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  async count(table: string, filters: QueryFilter[]): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${table}`;
    const whereClauses = filters.map(f => `${f.field} ${f.operator || '='} $${filters.indexOf(f) + 1}`);
    if (whereClauses.length) query += ` WHERE ${whereClauses.join(' AND ')}`;
    const result = await this.pool.query(query, filters.map(f => f.value));
    return parseInt(result.rows[0].count, 10);
  }

  async findById(table: string, id: string): Promise<any | null> {
    const result = await this.pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }
} 