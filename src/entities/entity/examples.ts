/**
 * Entity System Usage Examples
 * 
 * This file demonstrates how to use the new streamlined Entity system.
 */
import { EntityFactory, Entity } from './index';
import { DatabaseManager } from '../../database/database-manager';
import { Context } from '../../types';

// Example: Basic entity operations
export async function basicEntityExample() {
  // Setup
  const databaseManager = new DatabaseManager(/* your database config */);
  const entityFactory = new EntityFactory(databaseManager);

  // Create entity (auto-initializes)
  const userEntity = await entityFactory.entity('user');

  // Synchronous access to configuration (no more promises!)
  console.log('Entity fields:', userEntity.fields);
  console.log('Entity permissions:', userEntity.permissions);
  console.log('JSON Schema:', userEntity.schema);
  console.log('Table name:', userEntity.tableName);

  // CRUD operations
  const newUser = await userEntity.create({
    name: 'John Doe',
    email: 'john@example.com',
    department: 'engineering'
  });
  console.log('Created user:', newUser);

  // Read with filters
  const engineers = await userEntity.read({ department: 'engineering' });
  console.log('Engineers:', engineers);

  // Find by ID
  const user = await userEntity.findById(newUser.id);
  console.log('Found user:', user);

  // Update
  const updatedUser = await userEntity.update(newUser.id, {
    name: 'Jane Doe'
  });
  console.log('Updated user:', updatedUser);

  // Delete
  const deleted = await userEntity.delete(newUser.id);
  console.log('Deleted:', deleted);
}

// Example: Advanced querying
export async function advancedQueryExample() {
  const databaseManager = new DatabaseManager(/* config */);
  const entityFactory = new EntityFactory(databaseManager);
  const userEntity = await entityFactory.entity('user');

  // Advanced read with options
  const users = await userEntity.read(
    { active: true, department: 'engineering' },  // filters
    {                                              // options
      fields: ['id', 'name', 'email', 'salary'],
      sort: [
        { field: 'salary', direction: 'DESC' },
        { field: 'name', direction: 'ASC' }
      ],
      limit: 10,
      offset: 0
    }
  );
  console.log('Top 10 engineers by salary:', users);

  // Direct database access for complex queries
  const complexQuery = userEntity.db()
    .where('salary', '>', 50000)
    .where('department', 'in', ['engineering', 'product'])
    .where('created_at', '>', '2023-01-01')
    .orderBy('performance_score', 'DESC')
    .limit(5);

  const topPerformers = await complexQuery.get();
  console.log('Top performers:', topPerformers);
}

// Example: Multi-tenant usage
export async function multiTenantExample() {
  const databaseManager = new DatabaseManager(/* config */);
  const entityFactory = new EntityFactory(databaseManager);

  // Different tenant contexts
  const tenant1UserEntity = await entityFactory.entity('user', 'tenant1');
  const tenant2UserEntity = await entityFactory.entity('user', 'tenant2');

  // Create users in different tenants
  const tenant1User = await tenant1UserEntity.create({
    name: 'Tenant 1 User',
    email: 'user@tenant1.com'
  });

  const tenant2User = await tenant2UserEntity.create({
    name: 'Tenant 2 User', 
    email: 'user@tenant2.com'
  });

  console.log('Tenant 1 users:', await tenant1UserEntity.read());
  console.log('Tenant 2 users:', await tenant2UserEntity.read());
}

// Example: Entity with permissions and context
export async function permissionExample() {
  const databaseManager = new DatabaseManager(/* config */);
  const entityFactory = new EntityFactory(databaseManager);

  // Admin context
  const adminContext: Context = {
    user: { id: 'admin1', roles: ['admin'] },
    tenantId: 'default'
  };

  // User context
  const userContext: Context = {
    user: { id: 'user1', roles: ['user'] },
    tenantId: 'default'
  };

  // Initialize entity with admin context
  const userEntity = await entityFactory.entity('user', 'default', true, adminContext);

  // Admin can create users
  const newUser = await userEntity.create({
    name: 'New User',
    email: 'new@example.com'
  }, adminContext);

  try {
    // Regular user might not be able to create (depending on permissions)
    await userEntity.create({
      name: 'Unauthorized User',
      email: 'unauthorized@example.com'
    }, userContext);
  } catch (error) {
    console.log('Permission denied for user context:', error.message);
  }

  // Both can read (if permissions allow)
  const users = await userEntity.read({}, {}, userContext);
  console.log('Users visible to regular user:', users);
}

// Example: Manual entity initialization
export async function manualInitializationExample() {
  const databaseManager = new DatabaseManager(/* config */);
  const entityFactory = new EntityFactory(databaseManager);

  // Create entity without auto-initialization
  const entity = await entityFactory.entity('user', 'default', false);

  console.log('Is initialized?', entity.isInitialized); // false

  // Initialize manually when needed
  await entity.initialize({
    user: { id: 'admin', roles: ['admin'] }
  });

  console.log('Is initialized?', entity.isInitialized); // true
  console.log('Fields:', entity.fields);

  // Reload configuration if needed
  await entity.reload();
}

// Example: Cache management
export async function cacheManagementExample() {
  const databaseManager = new DatabaseManager(/* config */);
  const entityFactory = new EntityFactory(databaseManager);

  // Create several entities
  await entityFactory.entity('user');
  await entityFactory.entity('product');
  await entityFactory.entity('order');

  // Check cache stats
  const stats = entityFactory.getCacheStats();
  console.log('Cache stats:', stats);

  // Clear specific entity cache
  entityFactory.clearCache('user', 'default');

  // Clear all user entities across tenants
  entityFactory.clearCache('user');

  // Clear all cache
  entityFactory.clearCache();

  console.log('Cache cleared');
}

// Example: Error handling
export async function errorHandlingExample() {
  const databaseManager = new DatabaseManager(/* config */);
  const entityFactory = new EntityFactory(databaseManager);

  try {
    // Try to load non-existent entity
    const entity = await entityFactory.entity('nonexistent');
  } catch (error) {
    console.error('Entity not found:', error.message);
  }

  try {
    // Try to use uninitialized entity
    const entity = new Entity('user', databaseManager);
    const fields = entity.fields; // This will throw
  } catch (error) {
    console.error('Entity not initialized:', error.message);
  }

  try {
    // Validation error
    const userEntity = await entityFactory.entity('user');
    await userEntity.create({
      // missing required fields
      email: 'invalid-email' // invalid format
    });
  } catch (error) {
    console.error('Validation failed:', error.message);
  }
}

// Example: Direct entity creation (without factory)
export async function directEntityExample() {
  const databaseManager = new DatabaseManager(/* config */);

  // Create entity directly
  const userEntity = new Entity('user', databaseManager, 'default');
  
  // Initialize
  await userEntity.initialize();

  // Use entity
  const users = await userEntity.read();
  console.log('All users:', users);

  // Create new instance for different tenant
  const tenant2Entity = new Entity('user', databaseManager, 'tenant2');
  await tenant2Entity.initialize();

  const tenant2Users = await tenant2Entity.read();
  console.log('Tenant 2 users:', tenant2Users);
}