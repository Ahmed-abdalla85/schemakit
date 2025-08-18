/**
 * SchemaKit Core Tests
 * Tests for the main SchemaKit class and integration
 */

import { SchemaKit } from '../../src/schemakit';
import { SchemaKitError } from '../../src/errors';
import { Entity } from '../../src/entities/entity/entity';

// Mock Entity initialization to prevent database loading
jest.spyOn(Entity.prototype, 'initialize').mockImplementation(async function(this: Entity) {
  // Set the entity as initialized without database calls
  (this as any).initialized = true;
  (this as any).fields = [];
  (this as any).permissions = [];
  (this as any).workflow = [];
  (this as any).rls = [];
  (this as any).views = [];
  (this as any).tableName = this.name;
});

describe('SchemaKit Core', () => {
  beforeEach(() => {
    // Clear entity cache before each test
    Entity.clearCache();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const schemaKit = new SchemaKit();
      expect(schemaKit).toBeInstanceOf(SchemaKit);
    });

    test('should initialize with sqlite adapter by default', () => {
      const schemaKit = new SchemaKit();
      expect(schemaKit).toBeInstanceOf(SchemaKit);
    });

    test('should initialize with custom adapter configuration', () => {
      const schemaKit = new SchemaKit({ adapter: 'sqlite' });
      expect(schemaKit).toBeInstanceOf(SchemaKit);
    });

    test('should initialize with cache configuration', () => {
      const schemaKit = new SchemaKit({
        cache: {
          enabled: true,
          ttl: 300
        }
      });
      expect(schemaKit).toBeInstanceOf(SchemaKit);
    });
  });

  describe('Entity Management', () => {
    let schemaKit: SchemaKit;

    beforeEach(() => {
      schemaKit = new SchemaKit({ adapter: 'sqlite' });
    });

    test('should create entity instance', async () => {
      const entity = await schemaKit.entity('users', 'test-tenant');
      expect(entity).toBeDefined();
      expect(entity.name).toBe('users');
    });

    test('should reuse cached entity instances', async () => {
      const entity1 = await schemaKit.entity('users', 'test-tenant');
      const entity2 = await schemaKit.entity('users', 'test-tenant');
      expect(entity1).toBe(entity2); // Same instance
    });

    test('should create separate instances for different tenants', async () => {
      const entity1 = await schemaKit.entity('users', 'tenant-1');
      const entity2 = await schemaKit.entity('users', 'tenant-2');
      expect(entity1).not.toBe(entity2); // Different instances
    });
  });

  describe('Cache Management', () => {
    let schemaKit: SchemaKit;

    beforeEach(() => {
      schemaKit = new SchemaKit({ adapter: 'sqlite' });
    });

    test('should provide cache statistics', async () => {
      // Create some entities
      await schemaKit.entity('users', 'tenant-1');
      await schemaKit.entity('orders', 'tenant-1');
      
      const stats = Entity.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entities).toContain('tenant-1:users');
      expect(stats.entities).toContain('tenant-1:orders');
    });

    test('should clear specific entity cache', async () => {
      await schemaKit.entity('users', 'tenant-1');
      
      let stats = Entity.getCacheStats();
      expect(stats.size).toBe(1);
      
      Entity.clearCache('users', 'tenant-1');
      
      stats = Entity.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test('should clear all cache', async () => {
      await schemaKit.entity('users', 'tenant-1');
      await schemaKit.entity('orders', 'tenant-1');
      
      let stats = Entity.getCacheStats();
      expect(stats.size).toBe(2);
      
      Entity.clearCache();
      
      stats = Entity.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid adapter type gracefully', () => {
      expect(() => { new SchemaKit({ adapter: 'nonexistent-adapter' }); }).toThrow();
    });
  });
});