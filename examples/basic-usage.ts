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
        type: 'inmemory',
        config: {}
      }
    });

    await schemaKit.initialize();
    console.log('✅ SchemaKit initialized successfully\n');

    // ===== 2. Entity Operations =====
    console.log('2. Entity Operations:');
    
    // Get entity instance (now async with UnifiedEntityHandler)
    try {
      const userEntity = await schemaKit.entity('user');
      console.log('   ✅ Entity handler created');
      
      // Access entity properties directly (synchronous with new API)
      const entityInfo = userEntity.getEntityInfo();
      console.log('   ✅ Entity info accessed:', entityInfo);
      
      const schema = userEntity.getSchema();
      console.log('   ✅ Schema accessed:', schema);
    } catch (error) {
      console.log('   ❌ Expected error (no entity configured):', error instanceof Error ? error.message : error);
    }

    // ===== 3. Enhanced Entity API =====
    console.log('\n3. Enhanced UnifiedEntityHandler API:');
    console.log('   📋 Available Methods:');
    console.log('     • userHandler.create(data, userRole?)');
    console.log('     • userHandler.read(filters, userRole?)');
    console.log('     • userHandler.update(id, data, userRole?)');
    console.log('     • userHandler.delete(id, userRole?)');
    console.log('     • userHandler.findById(id, userRole?)');
    console.log('     • userHandler.getSchema() (synchronous)');
    console.log('     • userHandler.getFields() (synchronous)');
    console.log('     • userHandler.getPermissions() (synchronous)');
    console.log('     • userHandler.getWorkflows() (synchronous)');
    console.log('     • userHandler.getViews() (synchronous)');
    console.log('     • userHandler.validateData(data, isCreate?)');
    console.log('     • userHandler.checkPermission(role, action)');
    console.log('     • userHandler.getEntityInfo()');

    // ===== 4. Multi-tenant Operations =====
    console.log('\n4. Multi-tenant Operations:');
    
    // Get entities for different tenants (now async)
    try {
      const userEntityTenantA = await schemaKit.entity('user', 'tenant-a');
      const userEntityTenantB = await schemaKit.entity('user', 'tenant-b');
      
      console.log('   ✅ Created tenant-specific entity handlers');
      console.log('     • userEntityTenantA for tenant "tenant-a"');
      console.log('     • userEntityTenantB for tenant "tenant-b"');
    } catch (error) {
      console.log('   ❌ Expected error (no entity configured for tenants):', error instanceof Error ? error.message : error);
    }
    
    // Note: In a real scenario, you would first need to:
    // 1. Create the schema for each tenant (PostgreSQL) or ensure tables exist
    // 2. Set up entity configurations for each tenant
    console.log('   📋 Multi-tenant table naming:');
    console.log('     • PostgreSQL: "tenant-a.users", "tenant-b.users"');
    console.log('     • SQLite/InMemory: "tenant-a_users", "tenant-b_users"');

    // ===== 5. Improved Architecture =====
    console.log('\n5. Improved Architecture Benefits:');
    console.log('   ✅ UnifiedEntityHandler combines all entity operations');
    console.log('   ✅ Synchronous schema and metadata access');
    console.log('   ✅ Built-in validation and permission checking');
    console.log('   ✅ Role-based security (pass role instead of full context)');
    console.log('   ✅ Standardized result objects for all operations');
    console.log('   ✅ Better performance with Map-based configuration processing');

    // ===== 6. Cache Management =====
    console.log('\n6. Cache Management:');
    const cacheStats = schemaKit.getCacheStats();
    console.log('   📊 Cache Statistics:', cacheStats);
    
    // Clear cache for specific entity and tenant
    schemaKit.clearEntityCache('user', 'tenant-a');
    console.log('   ✅ Cleared cache for user entity in tenant-a');
    
    // Clear all cache for an entity across all tenants
    schemaKit.clearEntityCache('user');
    console.log('   ✅ Cleared cache for user entity across all tenants');

    // ===== 7. Error Handling =====
    console.log('\n7. Error Handling:');
    try {
      // Try to use entity without initialization
      const uninitializedKit = new SchemaKit();
      await uninitializedKit.entity('user');
    } catch (error) {
      console.log('   ✅ Proper error handling:', error instanceof Error ? error.message : error);
    }

    // ===== 8. Architecture Benefits =====
    console.log('\n8. Architecture Benefits:');
    console.log('   ✅ Clean separation of concerns');
    console.log('   ✅ InstallManager handles database setup');
    console.log('   ✅ UnifiedEntityHandler provides comprehensive entity API');
    console.log('   ✅ Simplified main SchemaKit class');
    console.log('   ✅ Type-safe adapter management');
    console.log('   ✅ Better error handling');
    console.log('   ✅ Enhanced cache management');
    console.log('   ✅ Single class instead of multiple managers');

    // ===== 9. Usage Patterns =====
    console.log('\n9. Common Usage Patterns:');
    console.log('   📝 Basic Setup:');
    console.log('     const schemaKit = new SchemaKit(options);');
    console.log('     await schemaKit.initialize();');
    console.log('');
    console.log('   📝 Entity Operations:');
    console.log('     const user = await schemaKit.entity("user");');
    console.log('     await user.create({ name: "John", email: "john@example.com" }, "admin");');
    console.log('     const users = await user.read({ filters: { status: "active" } }, "user");');
    console.log('     await user.update("1", { status: "inactive" }, "admin");');
    console.log('     await user.delete("1", "admin");');
    console.log('     const userData = await user.findById("1", "user");');
    console.log('');
    console.log('   📝 Schema Access (Synchronous):');
    console.log('     const schema = user.getSchema();');
    console.log('     const fields = user.getFields();');
    console.log('     const permissions = user.getPermissions();');
    console.log('     const entityInfo = user.getEntityInfo();');

    // ===== 10. Cleanup =====
    console.log('\n10. Cleanup:');
    await schemaKit.disconnect();
    console.log('   ✅ Database connection closed');

    console.log('\n🎉 Basic usage example completed successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   • Configure entity schemas in the database');
    console.log('   • Set up permissions and workflows');
    console.log('   • Implement custom validation rules');
    console.log('   • Add custom database adapters');

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
  }
}

// Export the main function
export { main as basicUsageExample };

// Run the example if this file is executed directly
main().catch(console.error);