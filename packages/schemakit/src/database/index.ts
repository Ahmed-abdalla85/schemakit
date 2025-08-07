/**
 * Database Module Index
 * 
 * Exports all database-related classes, interfaces, and utilities
 */


// Core database interfaces and adapters
export { DatabaseAdapter } from './adapter';

// Specific adapters
export { DrizzleAdapter } from './adapters/drizzle';
export { InMemoryAdapter } from './adapters/inmemory';

// Database management utilities
export { InstallManager } from './install-manager';
