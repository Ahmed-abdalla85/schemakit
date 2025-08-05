/**
 * Entity Class Tests
 * Tests for core entity functionality, CRUD operations, and metadata loading
 */

import { Entity } from '../../src/entities/entity/entity';
import { DB } from '../../src/database/db';
import { SchemaKitError } from '../../src/errors';

// Mock the DB class
jest.mock('../../src/database/db');

describe('Entity', () => {
  let mockDb: jest.Mocked<DB>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock DB
    mockDb = new DB({
      adapter: 'inmemory',
      tenantId: 'test',
      config: {}
    }) as jest.Mocked<DB>;

    // Mock DB methods
    mockDb.select = jest.fn().mockReturnThis();
    mockDb.from = jest.fn().mockReturnThis();
    mockDb.where = jest.fn().mockReturnThis();
    mockDb.insert = jest.fn().mockReturnThis();
    mockDb.update = jest.fn().mockReturnThis();
    mockDb.delete = jest.fn().mockReturnThis();
    mockDb.get = jest.fn();

    // Clear entity cache before each test
    Entity.clearCache();
  });

  describe('Entity Creation and Caching', () => {
    test('should create entity instance', () => {
      const entity = Entity.create('users', 'test-tenant', mockDb);
      expect(entity).toBeInstanceOf(Entity);
      expect(entity.name).toBe('users');
    });

    test('should return cached instance for same entity/tenant', () => {
      const entity1 = Entity.create('users', 'test-tenant', mockDb);
      const entity2 = Entity.create('users', 'test-tenant', mockDb);
      expect(entity1).toBe(entity2);
    });

    test('should create different instances for different tenants', () => {
      const entity1 = Entity.create('users', 'tenant-1', mockDb);
      const entity2 = Entity.create('users', 'tenant-2', mockDb);
      expect(entity1).not.toBe(entity2);
    });

    test('should create different instances for different entities', () => {
      const entity1 = Entity.create('users', 'test-tenant', mockDb);
      const entity2 = Entity.create('orders', 'test-tenant', mockDb);
      expect(entity1).not.toBe(entity2);
    });
  });

  describe('Cache Management', () => {
    test('should provide cache statistics', () => {
      Entity.create('users', 'tenant-1', mockDb);
      Entity.create('orders', 'tenant-1', mockDb);
      Entity.create('users', 'tenant-2', mockDb);

      const stats = Entity.getCacheStats();
      expect(stats.size).toBe(3);
      expect(stats.entities).toContain('tenant-1:users');
      expect(stats.entities).toContain('tenant-1:orders');
      expect(stats.entities).toContain('tenant-2:users');
    });

    test('should clear specific entity from cache', () => {
      Entity.create('users', 'tenant-1', mockDb);
      Entity.create('orders', 'tenant-1', mockDb);

      let stats = Entity.getCacheStats();
      expect(stats.size).toBe(2);

      Entity.clearCache('users', 'tenant-1');

      stats = Entity.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entities).not.toContain('tenant-1:users');
      expect(stats.entities).toContain('tenant-1:orders');
    });

    test('should clear all cache', () => {
      Entity.create('users', 'tenant-1', mockDb);
      Entity.create('orders', 'tenant-1', mockDb);

      let stats = Entity.getCacheStats();
      expect(stats.size).toBe(2);

      Entity.clearCache();

      stats = Entity.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Entity Initialization', () => {
    test('should initialize entity successfully', async () => {
      // Mock successful metadata loading in correct order
      // 1. loadEntityDefinition
      mockDb.get.mockResolvedValueOnce([{
        entity_id: 'ent_001',
        entity_name: 'users',
        entity_table_name: 'app_users',
        entity_display_name: 'Users',
        entity_description: 'User accounts',
        entity_is_active: true,
        entity_created_at: '2024-01-01T00:00:00Z',
        entity_updated_at: '2024-01-01T00:00:00Z'
      }]);
      // 2. loadFields
      mockDb.get.mockResolvedValueOnce([
        {
          field_id: 'field_1',
          field_entity_id: 'ent_001',
          field_name: 'id',
          field_type: 'integer',
          field_is_required: true,
          field_is_unique: true,
          field_display_name: 'ID',
          field_order_index: 0,
          field_is_active: true
        }
      ]);
      // 3. loadPermissions
      mockDb.get.mockResolvedValueOnce([]);
      // 4. loadWorkflows
      mockDb.get.mockResolvedValueOnce([]);
      // 5. loadViews
      mockDb.get.mockResolvedValueOnce([]);

      const entity = Entity.create('users', 'test-tenant', mockDb);
      await entity.initialize();

      expect(entity.isInitialized).toBe(true);
      expect(entity.fields).toHaveLength(1);
      expect(entity.fields[0].field_name).toBe('id');
    });

    test('should handle initialization errors', async () => {
      mockDb.get.mockRejectedValueOnce(new Error('Database connection failed'));

      const entity = Entity.create('users', 'test-tenant', mockDb);
      
      await expect(entity.initialize()).rejects.toThrow(SchemaKitError);
    });

    test('should not reinitialize already initialized entity', async () => {
      // Mock successful initialization in correct order
      // 1. loadEntityDefinition
      mockDb.get.mockResolvedValueOnce([{
        entity_id: 'ent_001',
        entity_name: 'users',
        entity_table_name: 'app_users',
        entity_display_name: 'Users',
        entity_description: 'User accounts',
        entity_is_active: true,
        entity_created_at: '2024-01-01T00:00:00Z',
        entity_updated_at: '2024-01-01T00:00:00Z'
      }]);
      // 2. loadFields
      mockDb.get.mockResolvedValueOnce([]);
      // 3. loadPermissions
      mockDb.get.mockResolvedValueOnce([]);
      // 4. loadWorkflows
      mockDb.get.mockResolvedValueOnce([]);
      // 5. loadViews
      mockDb.get.mockResolvedValueOnce([]);

      const entity = Entity.create('users', 'test-tenant', mockDb);
      await entity.initialize();

      // Reset mock call count
      mockDb.get.mockClear();

      // Try to initialize again
      await entity.initialize();

      // Should not make any database calls
      expect(mockDb.get).not.toHaveBeenCalled();
    });
  });

  describe('CRUD Operations', () => {
    let entity: Entity;

    beforeEach(async () => {
      // Setup initialized entity
      entity = Entity.create('users', 'test-tenant', mockDb);
      
      // Mock initialization data in correct order
      // 1. loadEntityDefinition
      mockDb.get.mockResolvedValueOnce([{
        entity_id: 'ent_001',
        entity_name: 'users',
        entity_table_name: 'app_users',
        entity_display_name: 'Users',
        entity_description: 'User accounts',
        entity_is_active: true,
        entity_created_at: '2024-01-01T00:00:00Z',
        entity_updated_at: '2024-01-01T00:00:00Z'
      }]);
      // 2. loadFields  
      mockDb.get.mockResolvedValueOnce([]); 
      // 3. loadPermissions
      mockDb.get.mockResolvedValueOnce([]); 
      // 4. loadWorkflows
      mockDb.get.mockResolvedValueOnce([]);
      // 5. loadViews
      mockDb.get.mockResolvedValueOnce([]);

      await entity.initialize();
    });

    test('should insert new record', async () => {
      const insertData = { name: 'John Doe', email: 'john@example.com' };

      const result = await entity.insert(insertData);
      
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.id).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should get records by criteria', async () => {
      const expectedRecords = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ];

      mockDb.get.mockResolvedValueOnce(expectedRecords);

      const result = await entity.get({ status: 'active' });

      expect(result).toEqual(expectedRecords);
      expect(mockDb.where).toHaveBeenCalledWith({ status: 'active' });
    });

    test('should get single record by ID', async () => {
      const expectedRecord = { id: 1, name: 'John Doe', email: 'john@example.com' };

      mockDb.get.mockResolvedValueOnce([expectedRecord]);

      const result = await entity.getById(1);

      expect(result).toEqual(expectedRecord);
      expect(mockDb.where).toHaveBeenCalledWith({ id: 1 });
    });

    test('should update record', async () => {
      const updateData = { name: 'John Updated' };
      const existingRecord = { id: 1, name: 'John', email: 'john@example.com' };
      
      // Mock getById call within update
      mockDb.get.mockResolvedValueOnce([existingRecord]);

      const result = await entity.update(1, updateData);

      expect(result.name).toBe('John Updated');
      expect(result.id).toBe(1);
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should delete record', async () => {
      const existingRecord = { id: 1, name: 'John', email: 'john@example.com' };
      
      // Mock getById call within delete
      mockDb.get.mockResolvedValueOnce([existingRecord]);

      const result = await entity.delete(1);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('Context and Permissions', () => {
    test('should pass context to operations', async () => {
      const entity = Entity.create('users', 'test-tenant', mockDb);
      
      // Mock initialization in correct order
      // 1. loadEntityDefinition
      mockDb.get.mockResolvedValueOnce([{
        entity_id: 'ent_001',
        entity_name: 'users',
        entity_table_name: 'app_users',
        entity_display_name: 'Users',
        entity_description: 'User accounts',
        entity_is_active: true,
        entity_created_at: '2024-01-01T00:00:00Z',
        entity_updated_at: '2024-01-01T00:00:00Z'
      }]);
      // 2. loadFields
      mockDb.get.mockResolvedValueOnce([]);
      // 3. loadPermissions
      mockDb.get.mockResolvedValueOnce([]);
      // 4. loadWorkflows
      mockDb.get.mockResolvedValueOnce([]);
      // 5. loadViews
      mockDb.get.mockResolvedValueOnce([]);

      await entity.initialize();

      const context = {
        user: { id: 'user-123', roles: ['user'] },
        tenantId: 'test-tenant'
      };

      await entity.insert({ name: 'Test' }, context);

      // Context should be passed through (verify in implementation)
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should throw error when entity not found', async () => {
      const entity = Entity.create('nonexistent', 'test-tenant', mockDb);
      
      // Mock empty result for entity metadata
      mockDb.get.mockResolvedValueOnce([]);

      await expect(entity.initialize()).rejects.toThrow(SchemaKitError);
    });

    test('should handle database errors in CRUD operations', async () => {
      const entity = Entity.create('users', 'test-tenant', mockDb);
      
      // Mock successful initialization in correct order
      // 1. loadEntityDefinition
      mockDb.get.mockResolvedValueOnce([{
        entity_id: 'ent_001',
        entity_name: 'users',
        entity_table_name: 'app_users',
        entity_display_name: 'Users',
        entity_description: 'User accounts',
        entity_is_active: true,
        entity_created_at: '2024-01-01T00:00:00Z',
        entity_updated_at: '2024-01-01T00:00:00Z'
      }]);
      // 2. loadFields
      mockDb.get.mockResolvedValueOnce([]);
      // 3. loadPermissions
      mockDb.get.mockResolvedValueOnce([]);
      // 4. loadWorkflows
      mockDb.get.mockResolvedValueOnce([]);
      // 5. loadViews
      mockDb.get.mockResolvedValueOnce([]);

      await entity.initialize();

      // Mock database error for insert
      mockDb.insert.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        entity.insert({ name: 'Test' })
      ).rejects.toThrow('Database error');
    });
  });
});