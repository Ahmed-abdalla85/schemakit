/**
 * Tests for UnifiedEntityHandler as an example usage pattern
 * 
 * This tests the UnifiedEntityHandler as an example of how to create
 * EntityKit-style entity handlers using SchemaKit's core managers.
 */
import { SchemaKit } from '../src/schemakit';
import { UnifiedEntityHandler } from '../examples/unified-entity-handler';

describe('UnifiedEntityHandler - Example Usage Pattern', () => {
  let schemaKit: SchemaKit;

  beforeEach(async () => {
    // Initialize SchemaKit with in-memory adapter for testing
    schemaKit = new SchemaKit({
      adapter: {
        type: 'inmemory',
        config: {}
      }
    });
    await schemaKit.init();
  });

  afterEach(async () => {
    // Clean up
    await schemaKit.disconnect();
  });

  describe('SchemaKit Static Methods', () => {
    it('should initialize default instance', async () => {
      const instance = await SchemaKit.initDefault({
        adapter: {
          type: 'inmemory',
          config: {}
        }
      });
      expect(instance).toBeDefined();
    });

    it('should create named instances', async () => {
      await SchemaKit.init('test-instance', {
        adapter: {
          type: 'inmemory',
          config: {}
        }
      });

      const instance = SchemaKit.getInstance('test-instance');
      expect(instance).toBeDefined();
    });

    it('should list all instances', () => {
      const instances = SchemaKit.listInstances();
      expect(Array.isArray(instances)).toBe(true);
    });

    it('should get cache stats', () => {
      const stats = SchemaKit.getCacheStats();
      expect(stats).toHaveProperty('entityCacheSize');
      expect(stats).toHaveProperty('instanceCacheSize');
      expect(stats).toHaveProperty('entities');
      expect(stats).toHaveProperty('instances');
    });
  });

  describe('UnifiedEntityHandler Creation', () => {
    let entityConfig: any;

    beforeEach(async () => {
      // Create a test entity configuration
      const adapter = (schemaKit as any).databaseAdapter;
      
      // Insert test entity
      await adapter.execute(`
        INSERT INTO system_entities (id, name, table_name, display_name, description, is_active, created_at, updated_at)
        VALUES ('test-entity-id', 'test_user', 'test_users', 'Test User', 'Test user entity', 1, datetime('now'), datetime('now'))
      `);

      // Insert test fields
      await adapter.execute(`
        INSERT INTO system_fields (id, entity_id, name, type, is_required, is_unique, display_name, order_index, is_active)
        VALUES 
        ('field-1', 'test-entity-id', 'name', 'string', 1, 0, 'Name', 1, 1),
        ('field-2', 'test-entity-id', 'email', 'string', 1, 1, 'Email', 2, 1)
      `);

      // Insert test permissions
      await adapter.execute(`
        INSERT INTO system_permissions (id, entity_id, role, action, is_allowed, created_at)
        VALUES 
        ('perm-1', 'test-entity-id', 'public', 'create', 1, datetime('now')),
        ('perm-2', 'test-entity-id', 'public', 'read', 1, datetime('now')),
        ('perm-3', 'test-entity-id', 'public', 'update', 1, datetime('now')),
        ('perm-4', 'test-entity-id', 'public', 'delete', 1, datetime('now'))
      `);

      // Create entity table
      await adapter.execute(`
        CREATE TABLE test_users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Load entity configuration
      entityConfig = await schemaKit.loadEntity('test_user');
    });

    it('should create UnifiedEntityHandler instance', async () => {
      const handler = new UnifiedEntityHandler(schemaKit, entityConfig, 'tenant1');
      
      expect(handler).toBeInstanceOf(UnifiedEntityHandler);
      expect(handler.entityName).toBe('test_user');
      expect(handler.displayName).toBe('Test User');
      expect(handler.tableName).toBe('test_users');
    });

    it('should provide entity info', () => {
      const handler = new UnifiedEntityHandler(schemaKit, entityConfig, 'tenant1');
      const info = handler.getEntityInfo();
      
      expect(info.entityName).toBe('test_user');
      expect(info.displayName).toBe('Test User');
      expect(info.tableName).toBe('test_users');
      expect(info.fieldCount).toBe(2);
    });
  });

  describe('UnifiedEntityHandler Operations', () => {
    let handler: UnifiedEntityHandler;
    let entityConfig: any;

    beforeEach(async () => {
      // Create test entity configuration
      const adapter = (schemaKit as any).databaseAdapter;
      
      // Insert test entity
      await adapter.execute(`
        INSERT INTO system_entities (id, name, table_name, display_name, description, is_active, created_at, updated_at)
        VALUES ('test-entity-id', 'test_user', 'test_users', 'Test User', 'Test user entity', 1, '2025-07-20T11:00:00.000Z', '2025-07-20T11:00:00.000Z')
      `);

      // Insert test fields
      await adapter.execute(`
        INSERT INTO system_fields (id, entity_id, name, type, is_required, is_unique, display_name, order_index, is_active)
        VALUES 
        ('field-1', 'test-entity-id', 'name', 'string', 1, 0, 'Name', 1, 1),
        ('field-2', 'test-entity-id', 'email', 'string', 1, 1, 'Email', 2, 1)
      `);

      // Insert test permissions
      await adapter.execute(`
        INSERT INTO system_permissions (id, entity_id, role, action, is_allowed, created_at)
        VALUES 
        ('perm-1', 'test-entity-id', 'public', 'create', 1, '2025-07-20T11:00:00.000Z'),
        ('perm-2', 'test-entity-id', 'public', 'read', 1, '2025-07-20T11:00:00.000Z'),
        ('perm-3', 'test-entity-id', 'public', 'update', 1, '2025-07-20T11:00:00.000Z'),
        ('perm-4', 'test-entity-id', 'public', 'delete', 1, '2025-07-20T11:00:00.000Z')
      `);

      // Create entity table
      await adapter.execute(`
        CREATE TABLE tenant1.test_users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Load entity configuration and create handler
      entityConfig = await schemaKit.loadEntity('test_user');
      handler = new UnifiedEntityHandler(schemaKit, entityConfig, 'tenant1');
    });

    it('should create entity record', async () => {
      const result = await handler.create({
        name: 'John Doe',
        email: 'john@example.com'
      }, 'user');

      if (!result.success) {
        console.log('Create failed:', result.message);
        console.log('Errors:', result.errors);
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toBe('Entity record created successfully');
    });

    it('should read entity records', async () => {
      // First create a record
      await handler.create({
        name: 'John Doe',
        email: 'john@example.com'
      }, 'user');

      // Then read records
      const readResult = await handler.read({}, 'user');

      expect(readResult.success).toBe(true);
      expect(readResult.data).toBeDefined();
      expect(Array.isArray(readResult.data)).toBe(true);
      expect(readResult.total).toBeGreaterThan(0);
    });

    it('should update entity record', async () => {
      // First create a record
      const createResult = await handler.create({
        name: 'John Doe',
        email: 'john@example.com'
      }, 'user');

      // Then update the record
      const result = await handler.update(createResult.data.id, {
        name: 'John Smith'
      }, 'user');

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('John Smith');
      expect(result.message).toBe('Entity record updated successfully');
    });

    it('should delete entity record', async () => {
      // First create a record
      const createResult = await handler.create({
        name: 'John Doe',
        email: 'john@example.com'
      }, 'user');

      // Then delete the record
      const result = await handler.delete(createResult.data.id, 'user');

      expect(result.success).toBe(true);
      expect(result.id).toBe(createResult.data.id);
      expect(result.message).toBe('Entity record deleted successfully');
    });

    it('should find entity by ID', async () => {
      // First create a record
      const createResult = await handler.create({
        name: 'John Doe',
        email: 'john@example.com'
      }, 'user');

      // Then find by ID
      const found = await handler.findById(createResult.data.id, 'user');

      expect(found).toBeDefined();
      expect(found).not.toBeNull();
      if (found) {
        expect(found.name).toBe('John Doe');
        expect(found.email).toBe('john@example.com');
      }
    });

    it('should generate JSON schema', () => {
      const schema = handler.generateJsonSchema();
      
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('name');
      expect(schema.properties).toHaveProperty('email');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('email');
    });

    it('should handle validation errors', async () => {
      const result = await handler.create({
        name: '', // Invalid: empty name
        email: 'invalid-email' // Invalid: bad email format
      }, 'user');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle permission denied', async () => {
      const result = await handler.create({
        name: 'John Doe',
        email: 'john@example.com'
      }, 'unauthorized-role');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Permission denied');
    });
  });

  describe('UnifiedEntityHandler as Example Pattern', () => {
    it('should demonstrate EntityKit-style usage', async () => {
      // This test demonstrates how UnifiedEntityHandler can be used
      // as an example pattern for creating EntityKit-style handlers
      
      const adapter = (schemaKit as any).databaseAdapter;
      
      // Setup test entity
      await adapter.execute(`
        INSERT INTO system_entities (id, name, table_name, display_name, description, is_active, created_at, updated_at)
        VALUES ('demo-entity-id', 'demo_user', 'demo_users', 'Demo User', 'Demo user entity', 1, '2025-07-20T11:00:00.000Z', '2025-07-20T11:00:00.000Z')
      `);

      await adapter.execute(`
        INSERT INTO system_fields (id, entity_id, name, type, is_required, is_unique, display_name, order_index, is_active)
        VALUES 
        ('demo-field-1', 'demo-entity-id', 'name', 'string', 1, 0, 'Name', 1, 1),
        ('demo-field-2', 'demo-entity-id', 'email', 'string', 1, 1, 'Email', 2, 1)
      `);

      await adapter.execute(`
        INSERT INTO system_permissions (id, entity_id, role, action, is_allowed, created_at)
        VALUES 
        ('demo-perm-1', 'demo-entity-id', 'public', 'create', 1, '2025-07-20T11:00:00.000Z'),
        ('demo-perm-2', 'demo-entity-id', 'public', 'read', 1, '2025-07-20T11:00:00.000Z')
      `);

      await adapter.execute(`
        CREATE TABLE tenant1.demo_users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Load entity configuration
      const entityConfig = await schemaKit.loadEntity('demo_user');
      
      // Create handler (EntityKit-style)
      const handler = new UnifiedEntityHandler(schemaKit, entityConfig, 'tenant1');
      
      // Use handler for CRUD operations
      const createResult = await handler.create({
        name: 'Demo User',
        email: 'demo@example.com'
      }, 'user');

      expect(createResult.success).toBe(true);
      expect(createResult.data.name).toBe('Demo User');

      // Read records
      const readResult = await handler.read({}, 'user');
      expect(readResult.success).toBe(true);
      expect(readResult.data?.length).toBeGreaterThan(0);

      // This demonstrates how UnifiedEntityHandler provides an EntityKit-style
      // interface while using SchemaKit's core managers underneath
    });
  });
});