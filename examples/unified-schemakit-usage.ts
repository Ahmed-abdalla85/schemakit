/**
 * Example: Using Unified SchemaKit with EntityKit-style Static Factory Methods
 * 
 * This example demonstrates the new unified SchemaKit API that combines:
 * - Static factory methods for easy instance management
 * - EntityKit-style UnifiedEntityHandler for CRUD operations
 * - Multi-tenant support with schema-based isolation
 * - Standardized response formats
 */

const { SchemaKit } = require('../dist/index');

async function demonstrateUnifiedSchemaKit() {
  console.log('=== Unified SchemaKit Demo ===\n');

  // 1. Initialize SchemaKit with static factory method
  console.log('1. Initializing SchemaKit...');
  await SchemaKit.initDefault({
    adapter: {
      type: 'inmemory', // Use in-memory for demo
      config: {}
    }
  });

  // 2. Create multiple named instances for different databases
  console.log('2. Creating named instances...');
  await SchemaKit.init('analytics', {
    adapter: {
      type: 'inmemory',
      config: {}
    }
  });

  // 3. List all instances
  console.log('3. Available instances:', SchemaKit.listInstances());

  // 4. Get cache statistics
  console.log('4. Cache stats:', SchemaKit.getCacheStats());

  // 5. Set up a sample entity (in a real app, this would be done through admin interface)
  console.log('\n5. Setting up sample entity...');
  const defaultInstance = SchemaKit.getDefault();
  const adapter = defaultInstance.databaseAdapter;

  // Create sample entity configuration
  await adapter.execute(`
    INSERT INTO system_entities (id, name, table_name, display_name, description, is_active, created_at, updated_at)
    VALUES ('user-entity', 'user', 'users', 'User', 'User management entity', 1, datetime('now'), datetime('now'))
  `);

  await adapter.execute(`
    INSERT INTO system_fields (id, entity_id, name, type, is_required, is_unique, display_name, order_index, is_active)
    VALUES 
    ('field-name', 'user-entity', 'name', 'string', 1, 0, 'Full Name', 1, 1),
    ('field-email', 'user-entity', 'email', 'string', 1, 1, 'Email Address', 2, 1),
    ('field-role', 'user-entity', 'role', 'string', 0, 0, 'User Role', 3, 1)
  `);

  await adapter.execute(`
    INSERT INTO system_permissions (id, entity_id, role, action, is_allowed, created_at)
    VALUES 
    ('perm-admin-create', 'user-entity', 'admin', 'create', 1, datetime('now')),
    ('perm-admin-read', 'user-entity', 'admin', 'read', 1, datetime('now')),
    ('perm-admin-update', 'user-entity', 'admin', 'update', 1, datetime('now')),
    ('perm-admin-delete', 'user-entity', 'admin', 'delete', 1, datetime('now')),
    ('perm-user-read', 'user-entity', 'user', 'read', 1, datetime('now'))
  `);

  // Create the entity table
  await adapter.execute(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // 6. Get entity handler using static method
  console.log('\n6. Getting entity handler...');
  const userHandler = await SchemaKit.getEntity('user', 'tenant-acme');

  // 7. Display entity information
  console.log('7. Entity info:', userHandler.getEntityInfo());

  // 8. Generate JSON schema
  console.log('8. JSON Schema:', JSON.stringify(userHandler.getSchema(), null, 2));

  // 9. Validate data
  console.log('\n9. Data validation...');
  const validData = { name: 'John Doe', email: 'john@acme.com', role: 'admin' };
  const invalidData = { name: '', email: 'invalid-email' };

  console.log('Valid data result:', userHandler.validateData(validData, true));
  console.log('Invalid data result:', userHandler.validateData(invalidData, true));

  // 10. Check permissions
  console.log('\n10. Permission checking...');
  console.log('Admin can create:', userHandler.checkPermission('admin', 'create'));
  console.log('User can create:', userHandler.checkPermission('user', 'create'));
  console.log('User can read:', userHandler.checkPermission('user', 'read'));

  // 11. CRUD operations with standardized responses
  console.log('\n11. CRUD Operations...');

  // Create user
  const createResult = await userHandler.create(validData, 'admin');
  console.log('Create result:', createResult);

  if (createResult.success && createResult.data) {
    const userId = createResult.data.id;

    // Read users
    const readResult = await userHandler.read({ page: 1, pageSize: 10 }, 'admin');
    console.log('Read result:', readResult);

    // Update user
    const updateResult = await userHandler.update(userId, { role: 'manager' }, 'admin');
    console.log('Update result:', updateResult);

    // Find by ID
    const findResult = await userHandler.findById(userId, 'admin');
    console.log('Find by ID result:', findResult);

    // Delete user
    const deleteResult = await userHandler.delete(userId, 'admin');
    console.log('Delete result:', deleteResult);
  }

  // 12. Multi-tenant demonstration
  console.log('\n12. Multi-tenant operations...');
  const acmeHandler = await SchemaKit.getEntity('user', 'tenant-acme');
  const globexHandler = await SchemaKit.getEntity('user', 'tenant-globex');

  console.log('ACME tenant handler:', acmeHandler.getEntityInfo());
  console.log('Globex tenant handler:', globexHandler.getEntityInfo());

  // 13. Cache management
  console.log('\n13. Cache management...');
  console.log('Before clear - Cache stats:', SchemaKit.getCacheStats());
  SchemaKit.clearEntityCache('user', 'tenant-acme');
  console.log('After clear - Cache stats:', SchemaKit.getCacheStats());

  // 14. Cleanup
  console.log('\n14. Shutting down...');
  await SchemaKit.shutdownAll();
  console.log('All instances shut down.');

  console.log('\n=== Demo Complete ===');
}

// Run the demo
if (require.main === module) {
  demonstrateUnifiedSchemaKit().catch(console.error);
}

module.exports = { demonstrateUnifiedSchemaKit };