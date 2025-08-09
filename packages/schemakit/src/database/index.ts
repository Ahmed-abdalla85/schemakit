/**
 * Database Module Index
 * 
 * Exports all database-related classes, interfaces, and utilities
 */

// Core database class and types
export { DB, type DBOptions, type MultiTenancyConfig } from './db';

// Core database interfaces and adapters
export { DatabaseAdapter } from './adapter';

// Specific adapters
export { DrizzleAdapter } from './adapters/drizzle';
export { DrizzleAdapter_old } from './adapters/drizzle_old';
export { InMemoryAdapter } from './adapters/inmemory';

// Database management utilities
export { InstallManager } from './install-manager';
