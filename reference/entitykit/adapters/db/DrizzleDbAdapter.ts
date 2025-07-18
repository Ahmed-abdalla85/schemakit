// DrizzleDbAdapter for SchemaKit
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql, and, SQL } from 'drizzle-orm';
import { DbAdapter, QueryFilter, QueryOptions } from './DbAdapter';
// Integrate QueryBuilder
import { QueryBuilderService } from '../../core/QueryBuilderService';

export class DrizzleDbAdapter extends DbAdapter {
  private pool: Pool;
  private db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool);
  }

  async connect(): Promise<void> {
    await this.pool.connect();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    return (await this.db.insert(sql.raw(table)).values(data).returning())[0];
  }

  // For Drizzle, use raw execution:
  async select(table: string, filters: QueryFilter[], options: QueryOptions, tenantId: string): Promise<any[]> {
    const { query, params } = QueryBuilderService.buildSelectQuery(table, tenantId, filters, options);
    const result = await this.db.execute(sql.raw(query), params);
    return result;
  }

  async update(table: string, id: string, data: Record<string, any>, tenantId: string): Promise<any> {
    const qualifiedTable = sql.raw(`${tenantId}.${table}`);
    return (await this.db.update(qualifiedTable).set(data).where(eq(sql`id`, id)).returning())[0];
  }

  async delete(table: string, id: string, tenantId: string): Promise<void> {
    const qualifiedTable = sql.raw(`${tenantId}.${table}`);
    await this.db.delete(qualifiedTable).where(eq(sql`id`, id));
  }

  async count(table: string, filters: QueryFilter[], tenantId: string): Promise<number> {
    const qualifiedTable = sql.raw(`${tenantId}.${table}`);
    const where: SQL[] = filters.map(f => eq(sql.raw(f.field), f.value));
    const result = await this.db.select({ count: sql`COUNT(*)` }).from(qualifiedTable).where(and(...where));
    return Number(result[0].count);
  }

  async findById(table: string, id: string, tenantId: string): Promise<any | null> {
    const qualifiedTable = sql.raw(`${tenantId}.${table}`);
    const result = await this.db.select().from(qualifiedTable).where(eq(sql`id`, id));
    return result[0] || null;
  }
} 