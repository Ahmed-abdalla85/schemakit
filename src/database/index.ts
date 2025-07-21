/**
 * Database Module Index
 * 
 * Exports all database-related classes, interfaces, and utilities
 */

// Main database gateway
export { DatabaseManager } from './database-manager';
export type { DatabaseConfig, ConnectionInfo, TableInfo, ColumnInfo } from './database-manager';
import { DatabaseManager, DatabaseConfig } from './database-manager';

// Fluent query builder
export { FluentQueryBuilder } from './fluent-query-builder';

// Core database interfaces and adapters
export { DatabaseAdapter } from './adapter';
export { BaseAdapter } from './base-adapter';

// Specific adapters
export { SQLiteAdapter } from './adapters/sqlite';
export { PostgresAdapter } from './adapters/postgres';
export { InMemoryAdapter } from './adapters/inmemory';
export { InMemoryAdapter as InMemorySimplifiedAdapter } from './adapters/inmemory-simplified';

// Database management utilities
export { QueryManager } from './query-manager';
export { InstallManager } from './install-manager';

/**
 * Convenience function to create a DatabaseManager with common configurations
 */
export function createDatabase(config: DatabaseConfig): DatabaseManager {
  return new DatabaseManager(config);
}

/**
 * Convenience function to create an in-memory database for testing
 */
export function createInMemoryDatabase(): DatabaseManager {
  return new DatabaseManager({
    type: 'inmemory-simplified'
  });
}

/**
 * Convenience function to create a SQLite database
 */
export function createSQLiteDatabase(filename = ':memory:'): DatabaseManager {
  return new DatabaseManager({
    type: 'sqlite',
    filename
  });
}

/**
 * Convenience function to create a PostgreSQL database
 */
export function createPostgresDatabase(config: {
  host: string;
  database: string;
  username?: string;
  password?: string;
  port?: number;
}): DatabaseManager {
  return new DatabaseManager({
    type: 'postgres',
    host: config.host,
    database: config.database,
    username: config.username,
    password: config.password,
    port: config.port
  });
}