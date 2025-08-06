/**
 * Database Module Index
 * 
 * Exports all database-related classes, interfaces, and utilities
 */

// Core database classes
export { DB, type DBOptions } from './db';

// Database adapter interface and types
export { 
  DatabaseAdapter,
  type DatabaseAdapterConfig,
  type ColumnDefinition,
  type TransactionCallback,
  type QueryFilter,
  type QueryOptions,
  type QueryResult
} from './adapter';

// Adapters
export { DrizzleAdapter } from './adapters/drizzle';
export { InMemoryAdapter } from './adapters/inmemory';

// Database management utilities
export { QueryManager } from './query-manager';
export { InstallManager } from './install-manager';
