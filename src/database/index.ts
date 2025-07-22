/**
 * Database Module Index
 * 
 * Exports all database-related classes, interfaces, and utilities
 */


// Core database interfaces and adapters
export { DatabaseAdapter } from './adapter';

// Specific adapters
export { SQLiteAdapter } from './adapters/sqlite';
export { PostgresAdapter } from './adapters/postgres';
export { InMemoryAdapter } from './adapters/inmemory';
// Database management utilities
export { QueryManager } from './query-manager';
export { InstallManager } from './install-manager';
