/**
 * Unified Entity Module
 * 
 * Exports for the unified entity handler that combines:
 * - Schema building
 * - CRUD operations
 * - Dynamic entity handling
 */

// Main handler
export { UnifiedEntityHandler } from './unified-entity-handler';

// Factory
export { UnifiedEntityFactory, UnifiedEntityFactoryOptions } from './unified-entity-factory';

// Types
export * from './types';

// Adapters
export { 
  DbAdapter, 
  DatabaseAdapterBridge, 
  createDbAdapter 
} from './adapters/database-adapter-bridge';