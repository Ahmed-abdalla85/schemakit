import { DB } from '../database/db';

export class EntityRepository {
  constructor(private readonly db: DB, private readonly tableName: string) {}

  async select(filters: Record<string, any> = {}, options?: any): Promise<any[]> {
    let q = this.db.select(options?.select || '*').from(this.tableName);
    for (const [field, value] of Object.entries(filters)) {
      q = q.where({ [field]: value });
    }
    if (options?.orderBy) {
      for (const o of options.orderBy) {
        q = q.orderBy(o.field, (o.direction || 'ASC').toUpperCase());
      }
    }
    if (options?.limit != null) {
      q = q.limit(options.limit);
    }
    return q.get();
  }

  async findById(idField: string, id: string | number): Promise<any | null> {
    const res = await this.db.select('*').from(this.tableName).where({ [idField]: id }).get();
    return res && res.length > 0 ? res[0] : null;
  }

  async insert(row: Record<string, any>): Promise<any> {
    return this.db.insert(this.tableName, row);
  }

  async update(idField: string, id: string | number, row: Record<string, any>): Promise<any> {
    return this.db.where({ [idField]: id }).update(this.tableName, row);
  }

  async delete(idField: string, id: string | number): Promise<void> {
    await this.db.where({ [idField]: id }).delete(this.tableName);
  }
}

