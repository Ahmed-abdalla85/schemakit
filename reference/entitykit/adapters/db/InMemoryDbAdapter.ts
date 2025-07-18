// InMemoryDbAdapter for SchemaKit testing

import { DbAdapter, QueryFilter, QueryOptions } from './DbAdapter';

export class InMemoryDbAdapter extends DbAdapter {
  private data: Map<string, any[]> = new Map(); // table -> array of records

  async connect(): Promise<void> {
    // No-op for in-memory
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  private getTable(table: string): any[] {
    if (!this.data.has(table)) {
      this.data.set(table, []);
    }
    return this.data.get(table)!;
  }

  async insert(table: string, data: Record<string, any>): Promise<any> {
    const records = this.getTable(table);
    const id = crypto.randomUUID(); // Assuming crypto is available
    const record = { id, ...data };
    records.push(record);
    return record;
  }

  async select(table: string, filters: QueryFilter[], options: QueryOptions): Promise<any[]> {
    let records = this.getTable(table);

    // Apply filters
    records = records.filter(record => 
      filters.every(filter => {
        const value = record[filter.field];
        switch (filter.operator || 'eq') {
          case 'eq': return value === filter.value;
          case 'neq': return value !== filter.value;
          case 'gt': return value > filter.value;
          case 'lt': return value < filter.value;
          case 'gte': return value >= filter.value;
          case 'lte': return value <= filter.value;
          case 'like': return typeof value === 'string' && value.includes(filter.value);
          case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
          default: return false;
        }
      })
    );

    // Apply sorting
    if (options.orderBy && options.orderBy.length > 0) {
      records.sort((a, b) => {
        for (const { field, direction } of options.orderBy!) { // Non-null assertion
          if (a[field] < b[field]) return direction === 'ASC' ? -1 : 1;
          if (a[field] > b[field]) return direction === 'ASC' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || records.length;
    return records.slice(offset, offset + limit);
  }

  async update(table: string, id: string, data: Record<string, any>): Promise<any> {
    const records = this.getTable(table);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Record not found');
    records[index] = { ...records[index], ...data };
    return records[index];
  }

  async delete(table: string, id: string): Promise<void> {
    const records = this.getTable(table);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Record not found');
    records.splice(index, 1);
  }

  async count(table: string, filters: QueryFilter[]): Promise<number> {
    const records = await this.select(table, filters, {});
    return records.length;
  }

  async findById(table: string, id: string): Promise<any | null> {
    const records = this.getTable(table);
    return records.find(r => r.id === id) || null;
  }
} 