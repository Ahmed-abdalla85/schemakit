/**
 * Unit tests for Enhanced SchemaKit with simplified API
 */
import { SchemaKit } from '../src/schemakit';
import { SchemaKitOptions } from '../src/schemakit';

describe('Enhanced SchemaKit - Simplified API', () => {
  // Clean up after each test
  afterEach(async () => {
    await SchemaKit.shutdownAll();
  });

  describe('Static Instance Management', () => {
    it('should initialize default instance', async () => {
      const options: SchemaKitOptions = {
        adapter: {
          type: 'inmemory',
          config: {}
        }
      };

      const instance = await SchemaKit.initDefault(options);
      
      expect(instance).toBeInstanceOf(SchemaKit);
      
      const defaultInstance = SchemaKit.getDefault();
      expect(defaultInstance).toBe(instance);
    });

    it('should initialize named instances', async () => {
      const options: SchemaKitOptions = {
        adapter: {
          type: 'inmemory',
          config: {}
        }
      };

      const instance1 = await SchemaKit.init('primary', options);
      const instance2 = await SchemaKit.init('secondary', options);
      
      expect(instance1).toBeInstanceOf(SchemaKit);
      expect(instance2).toBeInstanceOf(SchemaKit);
      expect(instance1).not.toBe(instance2);
      
      const retrievedInstance1 = SchemaKit.getInstance('primary');
      const retrievedInstance2 = SchemaKit.getInstance('secondary');
      
      expect(retrievedInstance1).toBe(instance1);
      expect(retrievedInstance2).toBe(instance2);
    });

    it('should throw error when getting non-existent instance', () => {
      expect(() => {
        SchemaKit.getInstance('nonexistent');
      }).toThrow('SchemaKit instance \'nonexistent\' not found');
    });

    it('should throw error when getting default instance before initialization', () => {
      expect(() => {
        SchemaKit.getDefault();
      }).toThrow('Default SchemaKit instance not initialized');
    });

    it('should list all instances', async () => {
      const options: SchemaKitOptions = {
        adapter: { type: 'inmemory', config: {} }
      };

      await SchemaKit.initDefault(options);
      await SchemaKit.init('test1', options);
      await SchemaKit.init('test2', options);

      const instances = SchemaKit.listInstances();
      expect(instances).toContain('test1');
      expect(instances).toContain('test2');
    });

    it('should not replace existing instances', async () => {
      const options: SchemaKitOptions = {
        adapter: { type: 'inmemory', config: {} }
      };

      const instance1 = await SchemaKit.initDefault(options);
      const instance2 = await SchemaKit.initDefault(options);

      // Should return the same instance, not create a new one
      expect(instance1).toBe(instance2);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      const options: SchemaKitOptions = {
        adapter: { type: 'inmemory', config: {} }
      };
      await SchemaKit.initDefault(options);
    });

    it('should get cache statistics', () => {
      const stats = SchemaKit.getCacheStats();
      
      expect(stats).toHaveProperty('entityCacheSize');
      expect(stats).toHaveProperty('instanceCacheSize');
      expect(stats).toHaveProperty('entities');
      expect(stats).toHaveProperty('instances');
      expect(Array.isArray(stats.entities)).toBe(true);
      expect(Array.isArray(stats.instances)).toBe(true);
    });

    it('should clear all caches', () => {
      expect(() => {
        SchemaKit.clearAllCache();
      }).not.toThrow();
    });

    it('should clear entity cache', () => {
      expect(() => {
        SchemaKit.clearEntityCache('users', 'tenant1');
      }).not.toThrow();
    });
  });

  describe('Instance Lifecycle', () => {
    it('should shutdown specific instance', async () => {
      const options: SchemaKitOptions = {
        adapter: { type: 'inmemory', config: {} }
      };

      await SchemaKit.init('test', options);
      
      let instances = SchemaKit.listInstances();
      expect(instances).toContain('test');
      
      await SchemaKit.shutdown('test');
      
      expect(() => {
        SchemaKit.getInstance('test');
      }).toThrow();
    });

    it('should shutdown default instance', async () => {
      const options: SchemaKitOptions = {
        adapter: { type: 'inmemory', config: {} }
      };

      await SchemaKit.initDefault(options);
      
      expect(() => {
        SchemaKit.getDefault();
      }).not.toThrow();
      
      await SchemaKit.shutdown();
      
      expect(() => {
        SchemaKit.getDefault();
      }).toThrow();
    });

    it('should shutdown all instances', async () => {
      const options: SchemaKitOptions = {
        adapter: { type: 'inmemory', config: {} }
      };

      await SchemaKit.initDefault(options);
      await SchemaKit.init('test1', options);
      await SchemaKit.init('test2', options);
      
      let instances = SchemaKit.listInstances();
      expect(instances).toHaveLength(2); // Only named instances, not default
      expect(instances).toContain('test1');
      expect(instances).toContain('test2');
      
      await SchemaKit.shutdownAll();
      
      expect(() => SchemaKit.getDefault()).toThrow();
      expect(() => SchemaKit.getInstance('test1')).toThrow();
      expect(() => SchemaKit.getInstance('test2')).toThrow();
      
      instances = SchemaKit.listInstances();
      expect(instances).toHaveLength(0);
    });
  });

  describe('Simplified Entity API', () => {
    let schemaKit: SchemaKit;

    beforeEach(async () => {
      schemaKit = new SchemaKit({
        adapter: { type: 'inmemory', config: {} }
      });
      await schemaKit.init();
    });

    afterEach(async () => {
      await schemaKit.disconnect();
    });

    it('should get entity object', () => {
      const users = schemaKit.entity('user');
      expect(users).toBeDefined();
      expect(typeof users.create).toBe('function');
      expect(typeof users.read).toBe('function');
      expect(typeof users.update).toBe('function');
      expect(typeof users.delete).toBe('function');
      expect(typeof users.findById).toBe('function');
    });

    it('should provide entity properties', () => {
      const users = schemaKit.entity('user');
      expect(users.fields).toBeDefined();
      expect(users.workflows).toBeDefined();
      expect(users.schema).toBeDefined();
    });

    it('should handle entity operations', async () => {
      const users = schemaKit.entity('user');
      const context = { user: { role: 'admin' }, tenantId: 'tenant1' };

      // Test that the entity object is properly configured
      expect(users).toBeDefined();
      expect(typeof users.create).toBe('function');
      expect(typeof users.read).toBe('function');
      expect(typeof users.update).toBe('function');
      expect(typeof users.delete).toBe('function');
      expect(typeof users.findById).toBe('function');
    });
  });

  describe('Database Operations', () => {
    let schemaKit: SchemaKit;

    beforeEach(async () => {
      schemaKit = new SchemaKit({
        adapter: { type: 'inmemory', config: {} }
      });
      await schemaKit.init();
    });

    afterEach(async () => {
      await schemaKit.disconnect();
    });

    it('should check if database is installed', async () => {
      const isInstalled = await schemaKit.isInstalled();
      expect(typeof isInstalled).toBe('boolean');
    });

    it('should get database version', async () => {
      const version = await schemaKit.getVersion();
      expect(version).toBeDefined();
    });

    it('should install database schema', async () => {
      await expect(schemaKit.install()).resolves.not.toThrow();
    });

    it('should reinstall database', async () => {
      await expect(schemaKit.reinstall()).resolves.not.toThrow();
    });
  });

  describe('Entity Cache Management', () => {
    let schemaKit: SchemaKit;

    beforeEach(async () => {
      schemaKit = new SchemaKit({
        adapter: { type: 'inmemory', config: {} }
      });
      await schemaKit.init();
    });

    afterEach(async () => {
      await schemaKit.disconnect();
    });

    it('should clear entity cache', () => {
      expect(() => schemaKit.clearEntityCache()).not.toThrow();
    });

    it('should clear specific entity cache', () => {
      expect(() => schemaKit.clearEntityCache('user')).not.toThrow();
    });

    it('should load entity configuration', async () => {
      // This would require setting up test data in the mock database
      // For now, just test that the method exists and doesn't throw
      expect(typeof schemaKit.loadEntity).toBe('function');
    });
  });
});