/**
 * UnifiedEntityHandler Working Example
 * 
 * This example demonstrates the new UnifiedEntityHandler with actual CRUD operations
 * using the user entity that gets seeded by default during SchemaKit initialization.
 */

import { SchemaKit } from '../src/schemakit';

async function workingExample() {
  console.log('🚀 UnifiedEntityHandler Working Example\n');

  try {
    // Initialize SchemaKit with in-memory database
    console.log('1. Initializing SchemaKit...');
    const schemaKit = new SchemaKit({
      adapter: {
        type: 'inmemory',
        config: {}
      }
    });

    await schemaKit.initialize();
    console.log('✅ SchemaKit initialized with seeded user entity\n');

    // Get the user entity handler (uses the seeded user entity)
    console.log('2. Creating user entity handler...');
    const userHandler = await schemaKit.entity('user');
    console.log('✅ User entity handler created\n');

    // Display entity information
    console.log('3. Entity Information:');
    const entityInfo = userHandler.getEntityInfo();
    console.log('   📊 Entity Info:', entityInfo);
    
    const schema = userHandler.getSchema();
    console.log('   📋 JSON Schema:', JSON.stringify(schema, null, 2));
    
    const fields = userHandler.getFields();
    console.log('   🏗️  Fields:', Array.from(fields.entries()).map(([name, field]) => ({
      name,
      type: field.type,
      required: field.required,
      validation: field.validation
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
    console.log('4. Permission Testing:');
    console.log('   Admin can create:', userHandler.checkPermission('admin', 'create'));
    console.log('   Admin can delete:', userHandler.checkPermission('admin', 'delete'));
    console.log('   User can create:', userHandler.checkPermission('user', 'create'));
    console.log('   User can read:', userHandler.checkPermission('user', 'read'));
    console.log('   Unknown role can read:', userHandler.checkPermission('unknown', 'read'));
    console.log('');

    // Test validation
    console.log('5. Validation Testing:');
    const validData = {
      name: 'John Doe',
      email: 'john.doe@example.com'
    };
    const validationResult = userHandler.validateData(validData, true);
    console.log('   ✅ Valid data validation:', validationResult);

    const invalidData = {
      name: 'J', // Too short (min 2 chars)
      email: 'invalid-email'
    };
    const invalidValidationResult = userHandler.validateData(invalidData, true);
    console.log('   ❌ Invalid data validation:', invalidValidationResult);
    console.log('');

    // CRUD Operations
    console.log('6. CRUD Operations:');

    // CREATE
    console.log('   📝 Creating users...');
    const user1 = await userHandler.create({
      name: 'Alice Johnson',
      email: 'alice@example.com'
    }, 'admin');
    console.log('   ✅ User 1 created:', user1.success ? user1.data : user1.message);

    const user2 = await userHandler.create({
      name: 'Bob Smith',
      email: 'bob@example.com'
    }, 'admin');
    console.log('   ✅ User 2 created:', user2.success ? user2.data : user2.message);

    // Try creating with invalid data
    const invalidUser = await userHandler.create({
      name: 'X', // Too short
      email: 'not-an-email'
    }, 'admin');
    console.log('   ❌ Invalid user creation:', invalidUser.success ? 'Unexpected success' : invalidUser.message);

    // Try creating without permission
    const unauthorizedUser = await userHandler.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com'
    }, 'user'); // Users don't have create permission
    console.log('   🚫 Unauthorized creation:', unauthorizedUser.success ? 'Unexpected success' : unauthorizedUser.message);

    // READ
    console.log('\n   📖 Reading users...');
    const allUsers = await userHandler.read({}, 'admin');
    console.log('   ✅ All users:', allUsers.success ? `Found ${allUsers.data?.length} users` : allUsers.message);
    if (allUsers.success && allUsers.data) {
      allUsers.data.forEach((user: any, index: number) => {
        console.log(`      ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
      });
    }

    // Read with filters
    const filteredUsers = await userHandler.read({
      filters: { name: 'Alice Johnson' }
    }, 'admin');
    console.log('   🔍 Filtered users:', filteredUsers.success ? `Found ${filteredUsers.data?.length} users` : filteredUsers.message);

    // Read with pagination
    const paginatedUsers = await userHandler.read({
      page: 1,
      pageSize: 1,
      sortBy: 'name',
      sortOrder: 'ASC'
    }, 'admin');
    console.log('   📄 Paginated users:', paginatedUsers.success ? `Page 1: ${paginatedUsers.data?.length} users` : paginatedUsers.message);

    // UPDATE
    if (user1.success && user1.data) {
      console.log('\n   ✏️  Updating user...');
      const updatedUser = await userHandler.update(user1.data.id, {
        name: 'Alice Johnson-Smith' // Married name
      }, 'admin');
      console.log('   ✅ User updated:', updatedUser.success ? updatedUser.data : updatedUser.message);

      // Try updating without permission
      const unauthorizedUpdate = await userHandler.update(user1.data.id, {
        name: 'Should not work'
      }, 'user'); // Users don't have general update permission
      console.log('   🚫 Unauthorized update:', unauthorizedUpdate.success ? 'Unexpected success' : unauthorizedUpdate.message);
    }

    // FIND BY ID
    if (user2.success && user2.data) {
      console.log('\n   🔍 Finding user by ID...');
      const foundUser = await userHandler.findById(user2.data.id, 'admin');
      console.log('   ✅ Found user:', foundUser ? foundUser.name : 'Not found');

      // Try finding with user role (should work for read)
      const userRoleFind = await userHandler.findById(user2.data.id, 'user');
      console.log('   👤 User role find:', userRoleFind ? userRoleFind.name : 'Not found');
    }

    // DELETE
    if (user2.success && user2.data) {
      console.log('\n   🗑️  Deleting user...');
      const deletedUser = await userHandler.delete(user2.data.id, 'admin');
      console.log('   ✅ User deleted:', deletedUser.success ? `Deleted ID: ${deletedUser.id}` : deletedUser.message);

      // Try deleting without permission
      if (user1.success && user1.data) {
        const unauthorizedDelete = await userHandler.delete(user1.data.id, 'user');
        console.log('   🚫 Unauthorized delete:', unauthorizedDelete.success ? 'Unexpected success' : unauthorizedDelete.message);
      }
    }

    // Final read to show remaining users
    console.log('\n   📊 Final user count:');
    const finalUsers = await userHandler.read({}, 'admin');
    console.log('   ✅ Remaining users:', finalUsers.success ? finalUsers.data?.length : 'Error reading users');

    // Cache statistics
    console.log('\n7. Cache Statistics:');
    const cacheStats = schemaKit.getCacheStats();
    console.log('   📊 Cache Stats:', cacheStats);

    // Cleanup
    console.log('\n8. Cleanup:');
    await schemaKit.disconnect();
    console.log('   ✅ Database connection closed');

    console.log('\n🎉 UnifiedEntityHandler example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Export the function
export { workingExample as unifiedEntityExample };

// Run the example if this file is executed directly
if (require.main === module) {
  workingExample().catch(console.error);
}