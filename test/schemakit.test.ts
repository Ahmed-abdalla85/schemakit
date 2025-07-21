/**
 * SchemaKit Test Suite
 * 
 * Tests the core functionality of the simplified SchemaKit API:
 * - Initialization and setup
 * - Entity operations
 * - Error handling
 * - Cache management
 */

import { SchemaKit } from '../src/schemakit';
import { SchemaKitError } from '../src/errors';

// Mock database adapter
const mockDatabaseAdapter = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true),
  query: jest.fn().mockImplementation((sql: string) => {
    // Mock installation check
    if (sql.includes('information_schema.tables') && sql.includes('system_entities')) {
      return Promise.resolve([{ count: 1 }]);
    }
    return Promise.resolve([]);
  }),
  execute: jest.fn().mockResolvedValue({ changes: 1, lastInsertId: 1 }),
  tableExists: jest.fn().mockResolvedValue(true),
  createTable: jest.fn().mockResolvedValue(undefined),
  getTableColumns: jest.fn().mockResolvedValue([]),
  config: { clearOnDisconnect: false }
};

// Mock the database adapters
jest.mock('../src/database/adapters/inmemory-simplified', () => ({
  InMemoryAdapter: jest.fn().mockImplementation(() => mockDatabaseAdapter)
}));

jest.mock('../src/database/adapters/postgres', () => ({
  PostgresAdapter: jest.fn().mockImplementation(() => mockDatabaseAdapter)
}));

jest.mock('../src/database/adapters/sqlite', () => ({
  SQLiteAdapter: jest.fn().mockImplementation(() => mockDatabaseAdapter)
}));

// Mock file loader
jest.mock('../src/entities/entity/file-loader', () => ({
  FileLoader: {
    loadSchemaFile: jest.fn().mockResolvedValue('CREATE TABLE system_entities (id TEXT PRIMARY KEY);'),
    loadSeedFile: jest.fn().mockResolvedValue(null)
  }
}));

describe('SchemaKit', () => {
  let schemaKit: SchemaKit;

  beforeEach(() => {
    jest.clearAllMocks();
    schemaKit = new SchemaKit({
      adapter: {
        type: 'inmemory',
        config: {}
      }
    });
  });

  afterEach(async () => {
    if (schemaKit) {
      await schemaKit.disconnect();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with default options', async () => {
      const result = await schemaKit.initialize();
      
      expect(result).toBe(schemaKit);
      expect(mockDatabaseAdapter.connect).toHaveBeenCalled();
    });

    it('should initialize with custom adapter options', async () => {
      const customKit = new SchemaKit({
        adapter: {
          type: 'postgres',
          config: { host: 'localhost' }
        }
      });

      await customKit.initialize();
      await customKit.disconnect();
      
      expect(mockDatabaseAdapter.connect).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockDatabaseAdapter.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(schemaKit.initialize()).rejects.toThrow(SchemaKitError);
    });
  });

  describe('Entity Operations', () => {
    beforeEach(async () => {
      await schemaKit.initialize();
    });

    it('should create entity instance', () => {
      const userEntity = schemaKit.entity('user');
      
      expect(userEntity).toBeDefined();
      expect(typeof userEntity.create).toBe('function');
      expect(typeof userEntity.read).toBe('function');
      expect(typeof userEntity.update).toBe('function');
      expect(typeof userEntity.delete).toBe('function');
      expect(typeof userEntity.findById).toBe('function');
    });

    it('should handle schema access errors gracefully', async () => {
      const userEntity = schemaKit.entity('user');
      
      // These should throw errors when entity doesn't exist
      await expect(userEntity.schema).rejects.toThrow();
      await expect(userEntity.fields).rejects.toThrow();
      await expect(userEntity.permissions).rejects.toThrow();
      await expect(userEntity.workflows).rejects.toThrow();
      await expect(userEntity.views).rejects.toThrow();
    });

    it('should provide cache management methods', () => {
      const userEntity = schemaKit.entity('user');
      
      expect(typeof userEntity.clearCache).toBe('function');
      expect(typeof userEntity.reload).toBe('function');
    });

    it('should throw error when accessing entity before initialization', () => {
      const uninitializedKit = new SchemaKit();
      
      expect(() => uninitializedKit.entity('user')).toThrow(SchemaKitError);
      expect(() => uninitializedKit.entity('user')).toThrow('SchemaKit is not initialized');
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await schemaKit.initialize();
    });

    it('should provide cache statistics', () => {
      const stats = schemaKit.getCacheStats();
      
      expect(stats).toHaveProperty('entityCacheSize');
      expect(stats).toHaveProperty('entities');
      expect(Array.isArray(stats.entities)).toBe(true);
    });

    it('should clear specific entity cache', () => {
      expect(() => schemaKit.clearEntityCache('user')).not.toThrow();
    });

    it('should clear all entity cache', () => {
      expect(() => schemaKit.clearEntityCache()).not.toThrow();
    });
  });

  describe('Database Adapter Management', () => {
    it('should create inmemory adapter by default', () => {
      const kit = new SchemaKit();
      expect(kit).toBeDefined();
    });

    it('should create postgres adapter when specified', () => {
      const kit = new SchemaKit({
        adapter: { type: 'postgres', config: {} }
      });
      expect(kit).toBeDefined();
    });

    it('should create sqlite adapter when specified', () => {
      const kit = new SchemaKit({
        adapter: { type: 'sqlite', config: {} }
      });
      expect(kit).toBeDefined();
    });

    it('should fallback to inmemory adapter for unknown types', () => {
      const kit = new SchemaKit({
        adapter: { type: 'unknown', config: {} }
      });
      expect(kit).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDatabaseAdapter.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(schemaKit.initialize()).rejects.toThrow(SchemaKitError);
    });

    it('should handle database disconnection errors', async () => {
      await schemaKit.initialize();
      mockDatabaseAdapter.disconnect.mockRejectedValueOnce(new Error('Disconnect failed'));
      
      await expect(schemaKit.disconnect()).rejects.toThrow('Disconnect failed');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full lifecycle', async () => {
      // Initialize
      await schemaKit.initialize();
      
      // Create entity
      const userEntity = schemaKit.entity('user');
      expect(userEntity).toBeDefined();
      
      // Check cache stats
      const stats = schemaKit.getCacheStats();
      expect(stats.entityCacheSize).toBeGreaterThanOrEqual(0);
      
      // Clear cache
      schemaKit.clearEntityCache();
      
      // Disconnect
      await schemaKit.disconnect();
    });

    it('should handle multiple entity instances', async () => {
      await schemaKit.initialize();
      
      const userEntity = schemaKit.entity('user');
      const productEntity = schemaKit.entity('product');
      
      expect(userEntity).toBeDefined();
      expect(productEntity).toBeDefined();
      expect(userEntity).not.toBe(productEntity);
    });
  });

  describe('API Consistency', () => {
    beforeEach(async () => {
      await schemaKit.initialize();
    });

    it('should provide consistent entity API', () => {
      const userEntity = schemaKit.entity('user');
      
      // CRUD methods
      expect(typeof userEntity.create).toBe('function');
      expect(typeof userEntity.read).toBe('function');
      expect(typeof userEntity.update).toBe('function');
      expect(typeof userEntity.delete).toBe('function');
      expect(typeof userEntity.findById).toBe('function');
      
      // Cache methods
      expect(typeof userEntity.clearCache).toBe('function');
      expect(typeof userEntity.reload).toBe('function');
    });

    it('should maintain method signatures', async () => {
      const userEntity = schemaKit.entity('user');
      
      // These should throw errors when entity doesn't exist
      await expect(userEntity.create({})).rejects.toThrow();
      await expect(userEntity.read({})).rejects.toThrow();
      await expect(userEntity.update(1, {})).rejects.toThrow();
      await expect(userEntity.delete(1)).rejects.toThrow();
      await expect(userEntity.findById(1)).rejects.toThrow();
    });
  });
});