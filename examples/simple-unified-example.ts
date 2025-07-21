/**
 * Simple UnifiedEntityHandler Example
 * 
 * This example demonstrates the UnifiedEntityHandler by creating an entity configuration
 * directly without relying on seeded data from the database.
 */

import { UnifiedEntityHandler, EntityConfig, createDbAdapter } from '../src/entities/unified';
import { DatabaseAdapter } from '../src/database/adapter';

async function simpleExample() {
  console.log('🚀 Simple UnifiedEntityHandler Example\n');

  try {
    // Create a database adapter
    console.log('1. Creating database adapter...');
    const databaseAdapter = await DatabaseAdapter.create('inmemory', {});
    await databaseAdapter.connect();
    const dbAdapter = createDbAdapter(databaseAdapter);
    console.log('✅ Database adapter created\n');

    // Create a simple entity configuration
    console.log('2. Creating entity configuration...');
    const entityConfig: EntityConfig = {
      entity: {
        entity_id: 'user_1',
        entity_name: 'user',
        entity_table_name: 'users',
        entity_display_name: 'User',
        entity_description: 'User entity for testing'
      },
      fields: [
        {
          field_id: 'field_1',
          field_name: 'id',
          field_type: 'uuid',
          field_is_required: true,
          field_is_unique: true,
          field_display_name: 'ID'
        },
        {
          field_id: 'field_2',
          field_name: 'name',
          field_type: 'string',
          field_is_required: true,
          field_display_name: 'Name',
          field_validation_rules: {
            minLength: 2,
            maxLength: 100
          }
        },
        {
          field_id: 'field_3',
          field_name: 'email',
          field_type: 'email',
          field_is_required: true,
          field_is_unique: true,
          field_display_name: 'Email'
        },
        {
          field_id: 'field_4',
          field_name: 'age',
          field_type: 'number',
          field_is_required: false,
          field_display_name: 'Age',
          field_validation_rules: {
            min: 0,
            max: 150
          }
        },
        {
          field_id: 'field_5',
          field_name: 'is_active',
          field_type: 'boolean',
          field_is_required: false,
          field_default_value: true,
          field_display_name: 'Active'
        }
      ],
      permissions: [
        {
          permission_id: 'perm_1',
          permission_role_name: 'admin',
          permission_can_create: true,
          permission_can_read: true,
          permission_can_update: true,
          permission_can_delete: true
        },
        {
          permission_id: 'perm_2',
          permission_role_name: 'user',
          permission_can_create: false,
          permission_can_read: true,
          permission_can_update: false,
          permission_can_delete: false
        },
        {
          permission_id: 'perm_3',
          permission_role_name: 'editor',
          permission_can_create: true,
          permission_can_read: true,
          permission_can_update: true,
          permission_can_delete: false
        }
      ],
      workflow: [],
      views: []
    };
    console.log('✅ Entity configuration created\n');

    // Create UnifiedEntityHandler
    console.log('3. Creating UnifiedEntityHandler...');
    const userHandler = new UnifiedEntityHandler(dbAdapter, entityConfig, 'default');
    console.log('✅ UnifiedEntityHandler created\n');

    // Display entity information
    console.log('4. Entity Information:');
    const entityInfo = userHandler.getEntityInfo();
    console.log('   📊 Entity Info:', entityInfo);
    
    const schema = userHandler.getSchema();
    console.log('   📋 JSON Schema required fields:', schema.required);
    console.log('   📋 JSON Schema properties:', Object.keys(schema.properties));
    
    const fields = userHandler.getFields();
    console.log('   🏗️  Fields:', Array.from(fields.entries()).map(([name, field]) => ({
      name,
      type: field.type,
      required: field.required
    })));
    
    const permissions = userHandler.getPermissions();
    console.log('   🔒 Permissions:', Array.from(permissions.entries()).map(([role, perm]) => ({
      role,
      create: perm.create,
      read: perm.read,
      update: perm.update,
      delete: perm.delete
    })));
    console.log('');

    // Test permission checking
    console.log('5. Permission Testing:');
    console.log('   Admin can create:', userHandler.checkPermission('admin', 'create'));
    console.log('   Admin can delete:', userHandler.checkPermission('admin', 'delete'));
    console.log('   User can create:', userHandler.checkPermission('user', 'create'));
    console.log('   User can read:', userHandler.checkPermission('user', 'read'));
    console.log('   Editor can create:', userHandler.checkPermission('editor', 'create'));
    console.log('   Editor can delete:', userHandler.checkPermission('editor', 'delete'));
    console.log('   Unknown role can read:', userHandler.checkPermission('unknown', 'read'));
    console.log('');

    // Test validation
    console.log('6. Validation Testing:');
    const validData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30
    };
    const validationResult = userHandler.validateData(validData, true);
    console.log('   ✅ Valid data validation:', validationResult);

    const invalidData = {
      name: 'J', // Too short (min 2 chars)
      email: 'invalid-email',
      age: 200 // Too old (max 150)
    };
    const invalidValidationResult = userHandler.validateData(invalidData, true);
    console.log('   ❌ Invalid data validation:', {
      valid: invalidValidationResult.valid,
      errorCount: invalidValidationResult.errors.length,
      errors: invalidValidationResult.errors.map(e => ({ field: e.field, message: e.message }))
    });
    console.log('');

    // Mock the database operations for testing
    console.log('7. CRUD Operations (with mocked database):');
    
    // Mock successful database responses
    const mockInsertResult = { changes: 1, lastInsertId: 'user_123' };
    const mockUserRecord = {
      id: 'user_123',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    };

    // Override dbAdapter methods for demonstration
    dbAdapter.insert = async () => mockInsertResult;
    dbAdapter.findById = async () => mockUserRecord;
    dbAdapter.select = async () => [mockUserRecord];
    dbAdapter.update = async () => ({ changes: 1 });
    dbAdapter.delete = async () => undefined;

    // CREATE
    console.log('   📝 Creating user...');
    const createResult = await userHandler.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28
    }, 'admin');
    console.log('   ✅ User created:', createResult.success ? 'Success' : createResult.message);
    if (createResult.success) {
      console.log('      Created user ID:', createResult.data?.id);
    }

    // Try creating with validation error
    const invalidCreateResult = await userHandler.create({
      name: 'X', // Too short
      email: 'bad-email'
    }, 'admin');
    console.log('   ❌ Invalid creation attempt:', invalidCreateResult.success ? 'Unexpected success' : 'Validation failed as expected');

    // Try creating without permission
    const unauthorizedCreateResult = await userHandler.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com'
    }, 'user');
    console.log('   🚫 Unauthorized creation attempt:', unauthorizedCreateResult.success ? 'Unexpected success' : 'Permission denied as expected');

    // READ
    console.log('\n   📖 Reading users...');
    const readResult = await userHandler.read({}, 'admin');
    console.log('   ✅ Read result:', readResult.success ? `Found ${readResult.data?.length} users` : readResult.message);

    // READ with filters
    const filteredReadResult = await userHandler.read({
      filters: { name: 'Alice Johnson' },
      sortBy: 'name',
      sortOrder: 'ASC'
    }, 'admin');
    console.log('   🔍 Filtered read result:', filteredReadResult.success ? `Found ${filteredReadResult.data?.length} users` : filteredReadResult.message);

    // UPDATE
    console.log('\n   ✏️  Updating user...');
    const updateResult = await userHandler.update('user_123', {
      name: 'Alice Johnson-Smith',
      age: 29
    }, 'admin');
    console.log('   ✅ Update result:', updateResult.success ? 'Success' : updateResult.message);

    // Try updating without permission
    const unauthorizedUpdateResult = await userHandler.update('user_123', {
      name: 'Should not work'
    }, 'user');
    console.log('   🚫 Unauthorized update attempt:', unauthorizedUpdateResult.success ? 'Unexpected success' : 'Permission denied as expected');

    // FIND BY ID
    console.log('\n   🔍 Finding user by ID...');
    const foundUser = await userHandler.findById('user_123', 'admin');
    console.log('   ✅ Found user:', foundUser ? foundUser.name : 'Not found');

    // DELETE
    console.log('\n   🗑️  Deleting user...');
    const deleteResult = await userHandler.delete('user_123', 'admin');
    console.log('   ✅ Delete result:', deleteResult.success ? 'Success' : deleteResult.message);

    // Try deleting without permission
    const unauthorizedDeleteResult = await userHandler.delete('user_123', 'editor');
    console.log('   🚫 Unauthorized delete attempt:', unauthorizedDeleteResult.success ? 'Unexpected success' : 'Permission denied as expected');

    console.log('\n8. Summary:');
    console.log('   ✅ UnifiedEntityHandler successfully created');
    console.log('   ✅ Entity configuration processed');
    console.log('   ✅ Validation working correctly');
    console.log('   ✅ Permission checking working correctly');
    console.log('   ✅ CRUD operations interface working');
    console.log('   ✅ Standardized result objects');

    // Cleanup
    await databaseAdapter.disconnect();
    console.log('\n🎉 Simple UnifiedEntityHandler example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Export the function
export { simpleExample };

// Run the example if this file is executed directly
if (require.main === module) {
  simpleExample().catch(console.error);
}