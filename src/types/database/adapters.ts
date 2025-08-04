/**
 * Database adapter configuration and interface types
 */

import { FieldType } from '../core/common';
import { QueryFilter, QueryOptions } from './queries';

export interface DatabaseAdapterConfig {
  type: string;
  connection?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    [key: string]: any;
  };
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
  [key: string]: any;
}

export interface ColumnDefinition {
  name: string;
  type: FieldType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  defaultValue?: any;
  primaryKey?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
  foreignKey?: {
    table: string;
    column: string;
    onDelete?: 'cascade' | 'restrict' | 'set null';
    onUpdate?: 'cascade' | 'restrict' | 'set null';
  };
  index?: boolean;
  comment?: string;
}

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Schema operations
  createTable(tableName: string, columns: ColumnDefinition[]): Promise<void>;
  dropTable(tableName: string): Promise<void>;
  addColumn(tableName: string, column: ColumnDefinition): Promise<void>;
  dropColumn(tableName: string, columnName: string): Promise<void>;
  
  // Data operations
  select(tableName: string, filters?: QueryFilter[], options?: QueryOptions): Promise<any[]>;
  insert(tableName: string, data: Record<string, any>): Promise<any>;
  update(tableName: string, data: Record<string, any>, filters: QueryFilter[]): Promise<any>;
  delete(tableName: string, filters: QueryFilter[]): Promise<number>;
  
  // Utility
  escape(value: any): string;
  executeRaw(sql: string, params?: any[]): Promise<any>;
}