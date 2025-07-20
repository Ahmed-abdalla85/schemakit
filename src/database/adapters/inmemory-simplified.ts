/**
 * InMemoryAdapter - Simplified
 * In-memory database adapter with minimal implementation
 */
import { BaseAdapter } from '../base-adapter';
import { DatabaseAdapterConfig } from '../adapter';

/**
 * Simplified InMemoryAdapter
 * Extends BaseAdapter for common functionality
 */
export class InMemoryAdapter extends BaseAdapter {
  private data: Map<string, any[]> = new Map();
  private nextId = 1;

  constructor(config: DatabaseAdapterConfig = {}) {
    super(config);
  }

  /**
   * Connect to in-memory database
   */
  async connect(): Promise<void> {
    this.connected = true;
    // Initialize system tables
    await this.initializeSystemTables();
  }

  /**
   * Disconnect from in-memory database
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.data.clear();
  }

  /**
   * Execute a query that returns rows
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.isConnected()) {
      await this.connect();
    }

    // Simple SQL parsing for basic operations
    const normalizedSql = sql.toLowerCase().trim();
    
    if (normalizedSql.startsWith('select')) {
      return this.handleSelect(sql, params);
    } else if (normalizedSql.startsWith('insert')) {
      return this.handleInsert(sql, params);
    } else if (normalizedSql.startsWith('update')) {
      return this.handleUpdate(sql, params);
    } else if (normalizedSql.startsWith('delete')) {
      return this.handleDelete(sql, params);
    } else if (normalizedSql.startsWith('create table')) {
      return this.handleCreateTable(sql, params);
    } else if (normalizedSql.includes('exists')) {
      return this.handleExists(sql, params);
    } else if (normalizedSql.includes('count')) {
      return this.handleCount(sql, params);
    }

    return [];
  }

  /**
   * Execute a query that doesn't return rows
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number, lastInsertId?: string | number }> {
    if (!this.isConnected()) {
      await this.connect();
    }

    const normalizedSql = sql.toLowerCase().trim();
    
    if (normalizedSql.startsWith('insert')) {
      const result = await this.handleInsert(sql, params);
      return { changes: 1, lastInsertId: this.nextId++ };
    } else if (normalizedSql.startsWith('update')) {
      const result = await this.handleUpdate(sql, params);
      return { changes: result.length };
    } else if (normalizedSql.startsWith('delete')) {
      const result = await this.handleDelete(sql, params);
      return { changes: result.length };
    } else if (normalizedSql.startsWith('create table')) {
      await this.handleCreateTable(sql, params);
      return { changes: 0 };
    } else if (normalizedSql.startsWith('create schema')) {
      return { changes: 0 };
    } else if (normalizedSql.startsWith('drop schema')) {
      return { changes: 0 };
    } else if (normalizedSql.startsWith('begin') || normalizedSql.startsWith('commit') || normalizedSql.startsWith('rollback')) {
      return { changes: 0 };
    }

    return { changes: 0 };
  }

  /**
   * Initialize system tables
   */
  private async initializeSystemTables(): Promise<void> {
    const systemTables = [
      'system_entities',
      'system_fields', 
      'system_permissions',
      'system_views',
      'system_workflows',
      'system_rls'
    ];

    for (const table of systemTables) {
      if (!this.data.has(table)) {
        this.data.set(table, []);
      }
    }
  }

  /**
   * Handle SELECT queries
   */
  private async handleSelect(sql: string, params: any[]): Promise<any[]> {
    // Extract table name from SELECT query
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const tableData = this.data.get(tableName) || [];

    // Simple filtering based on WHERE clause
    if (sql.includes('where')) {
      return this.filterData(tableData, sql, params);
    }

    return tableData;
  }

  /**
   * Handle INSERT queries
   */
  private async handleInsert(sql: string, params: any[]): Promise<any[]> {
    const tableMatch = sql.match(/into\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const tableData = this.data.get(tableName) || [];

    // Create record from params
    const record: any = { id: this.nextId++ };
    for (let i = 0; i < params.length; i++) {
      record[`field${i}`] = params[i];
    }

    tableData.push(record);
    this.data.set(tableName, tableData);

    return [record];
  }

  /**
   * Handle UPDATE queries
   */
  private async handleUpdate(sql: string, params: any[]): Promise<any[]> {
    const tableMatch = sql.match(/update\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const tableData = this.data.get(tableName) || [];

    // Simple update logic
    const updatedRecords: any[] = [];
    for (const record of tableData) {
      if (record.id === params[params.length - 1]) { // Last param is usually the ID
        const updatedRecord = { ...record };
        for (let i = 0; i < params.length - 1; i++) {
          updatedRecord[`field${i}`] = params[i];
        }
        updatedRecords.push(updatedRecord);
      }
    }

    return updatedRecords;
  }

  /**
   * Handle DELETE queries
   */
  private async handleDelete(sql: string, params: any[]): Promise<any[]> {
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    const tableData = this.data.get(tableName) || [];

    // Simple delete logic
    const deletedRecords: any[] = [];
    const remainingRecords: any[] = [];

    for (const record of tableData) {
      if (record.id === params[0]) { // First param is usually the ID
        deletedRecords.push(record);
      } else {
        remainingRecords.push(record);
      }
    }

    this.data.set(tableName, remainingRecords);
    return deletedRecords;
  }

  /**
   * Handle CREATE TABLE queries
   */
  private async handleCreateTable(sql: string, params: any[]): Promise<any[]> {
    const tableMatch = sql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)/i);
    if (!tableMatch) return [];

    const tableName = tableMatch[1];
    if (!this.data.has(tableName)) {
      this.data.set(tableName, []);
    }

    return [];
  }

  /**
   * Handle EXISTS queries
   */
  private async handleExists(sql: string, params: any[]): Promise<any[]> {
    const tableMatch = sql.match(/table_name\s*=\s*\$\d+/i);
    if (!tableMatch) return [{ exists: false }];

    const tableName = params[0];
    return [{ exists: this.data.has(tableName) }];
  }

  /**
   * Handle COUNT queries
   */
  private async handleCount(sql: string, params: any[]): Promise<any[]> {
    const tableMatch = sql.match(/from\s+(\w+)/i);
    if (!tableMatch) return [{ count: 0 }];

    const tableName = tableMatch[1];
    const tableData = this.data.get(tableName) || [];

    if (sql.includes('where')) {
      const filteredData = this.filterData(tableData, sql, params);
      return [{ count: filteredData.length }];
    }

    return [{ count: tableData.length }];
  }

  /**
   * Filter data based on WHERE clause
   */
  private filterData(data: any[], sql: string, params: any[]): any[] {
    // Simple filtering - in a real implementation, you'd parse the WHERE clause
    if (sql.includes('tenant_id')) {
      const tenantId = params.find(p => typeof p === 'string' && p !== 'default');
      if (tenantId) {
        return data.filter(record => record.tenant_id === tenantId);
      }
    }

    if (sql.includes('id =')) {
      const id = params[0];
      return data.filter(record => record.id === id);
    }

    return data;
  }
}