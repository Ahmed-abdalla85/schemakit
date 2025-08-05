/**
 * InstallManager Tests
 * Tests for database installation and setup functionality
 * Focuses on behavior and outcomes, not implementation details
 */

import { InstallManager } from '../../src/database/install-manager';
import { InMemoryAdapter } from '../../src/database/adapters/inmemory';
import { SchemaKitError } from '../../src/errors';

describe('InstallManager', () => {
  let adapter: InMemoryAdapter;
  let installManager: InstallManager;

  beforeEach(() => {
    adapter = new InMemoryAdapter({});
    installManager = new InstallManager(adapter);
  });

  describe('Installation Detection', () => {
    test('should detect database as not installed initially', async () => {
      await adapter.connect();
      const isInstalled = await installManager.isInstalled();
      expect(isInstalled).toBe(false);
    });

    test('should handle errors gracefully when checking installation status', async () => {
      // Don't connect the adapter to simulate an error
      const isInstalled = await installManager.isInstalled();
      expect(isInstalled).toBe(false);
    });
  });

  describe('Schema Installation', () => {
    test('should install schema successfully and be detectable', async () => {
      await adapter.connect();

      // Before installation
      expect(await installManager.isInstalled()).toBe(false);

      // Install schema (uses real schema.sql file)
      await installManager.install();

      // After installation - should be detectable
      expect(await installManager.isInstalled()).toBe(true);
    });

    test('should create all required system tables', async () => {
      await adapter.connect();
      await installManager.install();

      // Verify all system tables exist and are queryable
      const systemTables = [
        'system_entities',
        'system_fields', 
        'system_permissions',
        'system_views',
        'system_workflows',
        'system_rls'
      ];

      for (const table of systemTables) {
        const result = await adapter.query(`SELECT * FROM ${table} LIMIT 1`);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }
    });

    test('should install seed data along with schema', async () => {
      await adapter.connect();
      await installManager.install();

      // Verify seed data was installed - check for system entities
      const entities = await adapter.query('SELECT * FROM system_entities');
      expect(entities.length).toBeGreaterThan(0);

      // Verify we have the expected system table entities
      const systemEntityNames = entities.map(e => e.entity_name);
      expect(systemEntityNames).toContain('system_entities');
      expect(systemEntityNames).toContain('system_fields');
    });

    test('should throw error when schema files are missing', async () => {
      await adapter.connect();

      // Create install manager with adapter in a directory without sql files
      const originalCwd = process.cwd();
      try {
        // Change to a directory that doesn't have sql/ folder
        process.chdir('/');
        
        await expect(installManager.install()).rejects.toThrow(SchemaKitError);
        await expect(installManager.install()).rejects.toThrow('schema.sql file not found');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('ensureReady', () => {
    test('should install database if not already installed', async () => {
      await adapter.connect();

      // Verify not installed initially
      expect(await installManager.isInstalled()).toBe(false);

      // Ensure ready should install
      await installManager.ensureReady();

      // Verify now installed
      expect(await installManager.isInstalled()).toBe(true);

      // Verify tables are queryable
      const entities = await adapter.query('SELECT * FROM system_entities LIMIT 1');
      expect(entities).toBeDefined();
    });

    test('should not reinstall if database is already installed', async () => {
      await adapter.connect();

      // First installation
      await installManager.install();
      expect(await installManager.isInstalled()).toBe(true);

      // Get initial entities
      const entitiesBefore = await adapter.query('SELECT entity_id FROM system_entities');
      const countBefore = entitiesBefore.length;

      // Ensure ready again - should not reinstall
      await installManager.ensureReady();

      // Should still be installed
      expect(await installManager.isInstalled()).toBe(true);

      // Entity count should be the same (no duplicate installation)
      const entitiesAfter = await adapter.query('SELECT entity_id FROM system_entities');
      const countAfter = entitiesAfter.length;
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Error Handling', () => {
    test('should provide meaningful error messages', async () => {
      await adapter.connect();

      const originalCwd = process.cwd();
      try {
        // Change to directory without sql files
        process.chdir('/');
        
        await expect(installManager.install()).rejects.toThrow(SchemaKitError);
        
        try {
          await installManager.install();
        } catch (error) {
          expect(error).toBeInstanceOf(SchemaKitError);
          expect((error as SchemaKitError).message).toContain('Failed to install database');
          expect((error as SchemaKitError).cause).toBeDefined();
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    test('should handle database connection errors gracefully', async () => {
      // Create a mock adapter that will fail
      const failingAdapter = {
        ...adapter,
        execute: jest.fn().mockRejectedValue(new Error('Connection failed')),
        tableExists: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };
      
      const failingInstallManager = new InstallManager(failingAdapter as any);
      
      await expect(failingInstallManager.install()).rejects.toThrow();
    });
  });

  describe('Cross-Database Compatibility', () => {
    test('should detect installation correctly across different database types', async () => {
      await adapter.connect();
      
      // Should work with InMemory adapter
      expect(await installManager.isInstalled()).toBe(false);
      
      await installManager.install();
      
      expect(await installManager.isInstalled()).toBe(true);
    });
  });

  describe('Schema Integrity', () => {
    test('should create tables with correct relationships', async () => {
      await adapter.connect();
      await installManager.install();

      // Insert test entity
      await adapter.execute(`
        INSERT INTO system_entities (
          entity_id, entity_name, entity_table_name, entity_display_name,
          entity_description, entity_is_active, entity_created_at, entity_updated_at
        ) VALUES (
          'test_entity', 'test', 'test_table', 'Test Entity',
          'Test description', 1, datetime('now'), datetime('now')
        )
      `);

      // Insert related field
      await adapter.execute(`
        INSERT INTO system_fields (
          field_id, field_entity_id, field_name, field_type, field_is_required,
          field_is_unique, field_display_name, field_order_index, field_is_active
        ) VALUES (
          'test_field', 'test_entity', 'name', 'string', 1,
          0, 'Name', 0, 1
        )
      `);

      // Verify the entity was created
      const entityResult = await adapter.query('SELECT * FROM system_entities');
      const testEntity = entityResult.find(e => e.entity_id === 'test_entity');
      expect(testEntity).toBeDefined();
      expect(testEntity.entity_name).toBe('test');

      // Verify the field was created and linked
      const fieldResult = await adapter.query('SELECT * FROM system_fields');
      const testField = fieldResult.find(f => f.field_entity_id === 'test_entity');
      expect(testField).toBeDefined();
      expect(testField.field_name).toBe('name');
    });
  });
});