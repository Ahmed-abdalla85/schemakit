/**
 * SchemaKit Basic Usage Example
 * 
 * This example demonstrates the core functionality of SchemaKit:
 * - Initialization and setup
 * - Entity CRUD operations
 * - Schema and configuration access
 * - Cache management
 * - Error handling
 */

import { SchemaKit } from '../src/schemakit';

async function main() {
  console.log('🚀 SchemaKit Basic Usage Example\n');

  let schemaKit: SchemaKit;

  try {
    // ===== 1. Initialize SchemaKit =====
    console.log('1. Initializing SchemaKit...');


    schemaKit = new SchemaKit({
        adapter: {
          type: 'postgres',
          config: {
            host: 'localhost',
            port: 5852,
            database: 'processkit',
            user: 'postgres',
            password: 'postgrespassword'
          }
        }
      });

    await schemaKit.initialize();
    console.log('✅ SchemaKit initialized successfully\n');

    // ===== 2. Entity Operations =====
    console.log('2. Entity Operations:');
    
    // Get entity instance
    const userEntity = await schemaKit.entity('entities','system');
    console.log('   ✅ Entity instance created' , userEntity);
    
    // Try to access entity properties (will fail without entity configuration)
    // try {
    //   const schema = await userEntity.schema;
    //   console.log('   ✅ Schema accessed:', schema);
    // } catch (error) {
    //   console.log('   ❌ Expected error (no entity configured):', error instanceof Error ? error.message : error);
    // }

    // // ===== 3. Enhanced Entity API =====
    // console.log('\n3. Enhanced Entity API Features:');
    // console.log('   📋 Available Methods:');
    // console.log('     • userEntity.create(data, context)');
    // console.log('     • userEntity.read(filters, context)');
    // console.log('     • userEntity.update(id, data, context)');
    // console.log('     • userEntity.delete(id, context)');
    // console.log('     • userEntity.findById(id, context)');
    // console.log('     • userEntity.schema');
    // console.log('     • userEntity.fields');
    // console.log('     • userEntity.permissions');
    // console.log('     • userEntity.workflows');
    // console.log('     • userEntity.views');
    // console.log('     • userEntity.clearCache()');
    // console.log('     • userEntity.reload()');

    // // ===== 4. Multi-tenant Operations =====
    // console.log('\n4. Multi-tenant Operations:');
    
    // // Get entities for different tenants
    // const userEntityTenantA = schemaKit.entity('user', 'tenant-a');
    // const userEntityTenantB = schemaKit.entity('user', 'tenant-b');
    
    // console.log('   ✅ Created tenant-specific entity instances');
    // console.log('     • userEntityTenantA for tenant "tenant-a"');
    // console.log('     • userEntityTenantB for tenant "tenant-b"');
    
    // // Note: In a real scenario, you would first need to:
    // // 1. Create the schema for each tenant (PostgreSQL) or ensure tables exist
    // // 2. Set up entity configurations for each tenant
    // console.log('   📋 Multi-tenant table naming:');
    // console.log('     • PostgreSQL: "tenant-a.users", "tenant-b.users"');
    // console.log('     • SQLite/InMemory: "tenant-a_users", "tenant-b_users"');

    // // ===== 5. Enhanced Entity API =====
    // console.log('\n5. Enhanced Entity API Features:');
    // console.log('   📋 Available Methods:');
    // console.log('     • userEntity.create(data, context)');
    // console.log('     • userEntity.read(filters, context)');
    // console.log('     • userEntity.update(id, data, context)');
    // console.log('     • userEntity.delete(id, context)');
    // console.log('     • userEntity.findById(id, context)');
    // console.log('     • userEntity.schema');
    // console.log('     • userEntity.fields');
    // console.log('     • userEntity.permissions');
    // console.log('     • userEntity.workflows');
    // console.log('     • userEntity.views');
    // console.log('     • userEntity.clearCache()');

    // // ===== 6. Cache Management =====
    // console.log('\n6. Cache Management:');
    // const cacheStats = schemaKit.getCacheStats();
    // console.log('   📊 Cache Statistics:', cacheStats);
    
    // // Clear cache for specific entity and tenant
    // schemaKit.clearEntityCache('user', 'tenant-a');
    // console.log('   ✅ Cleared cache for user entity in tenant-a');
    
    // // Clear all cache for an entity across all tenants
    // schemaKit.clearEntityCache('user');
    // console.log('   ✅ Cleared cache for user entity across all tenants');

    // // ===== 7. Error Handling =====
    // console.log('\n7. Error Handling:');
    // try {
    //   // Try to use entity without initialization
    //   const uninitializedKit = new SchemaKit();
    //   uninitializedKit.entity('user');
    // } catch (error) {
    //   console.log('   ✅ Proper error handling:', error instanceof Error ? error.message : error);
    // }

    // // ===== 8. Architecture Benefits =====
    // console.log('\n8. Architecture Benefits:');
    // console.log('   ✅ Clean separation of concerns');
    // console.log('   ✅ InstallManager handles database setup');
    // console.log('   ✅ EntityBuilder provides rich entity API');
    // console.log('   ✅ Simplified main SchemaKit class');
    // console.log('   ✅ Type-safe adapter management');
    // console.log('   ✅ Better error handling');
    // console.log('   ✅ Enhanced cache management');

    // // ===== 9. Usage Patterns =====
    // console.log('\n9. Common Usage Patterns:');
    // console.log('   📝 Basic Setup:');
    // console.log('     const schemaKit = new SchemaKit(options);');
    // console.log('     await schemaKit.initialize();');
    // console.log('');
    // console.log('   📝 Entity Operations:');
    // console.log('     const user = schemaKit.entity("user");');
    // console.log('     await user.create({ name: "John", email: "john@example.com" });');
    // console.log('     const users = await user.read({ status: "active" });');
    // console.log('     await user.update(1, { status: "inactive" });');
    // console.log('     await user.delete(1);');
    // console.log('     const userData = await user.findById(1);');
    // console.log('');
    // console.log('   📝 Schema Access:');
    // console.log('     const schema = await user.schema;');
    // console.log('     const fields = await user.fields;');
    // console.log('     const permissions = await user.permissions;');

    // // ===== 10. Cleanup =====
    // console.log('\n10. Cleanup:');
    // await schemaKit.disconnect();
    // console.log('   ✅ Database connection closed');

    // console.log('\n🎉 Basic usage example completed successfully!');
    // console.log('\n💡 Next Steps:');
    // console.log('   • Configure entity schemas in the database');
    // console.log('   • Set up permissions and workflows');
    // console.log('   • Implement custom validation rules');
    // console.log('   • Add custom database adapters');

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
  }
}

// Export the main function
export { main as basicUsageExample };

// Run the example if this file is executed directly
main().catch(console.error);