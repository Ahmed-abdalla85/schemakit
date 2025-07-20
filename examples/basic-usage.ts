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
    
    // Get entity instance
    const userEntity = schemaKit.entity('user');
    console.log('   ✅ Entity instance created');
    
    // Try to access entity properties (will fail without entity configuration)
    try {
      const schema = await userEntity.schema;
      console.log('   ✅ Schema accessed:', schema);
    } catch (error) {
      console.log('   ❌ Expected error (no entity configured):', error instanceof Error ? error.message : error);
    }

    // ===== 3. Enhanced Entity API =====
    console.log('\n3. Enhanced Entity API Features:');
    console.log('   📋 Available Methods:');
    console.log('     • userEntity.create(data, context)');
    console.log('     • userEntity.read(filters, context)');
    console.log('     • userEntity.update(id, data, context)');
    console.log('     • userEntity.delete(id, context)');
    console.log('     • userEntity.findById(id, context)');
    console.log('     • userEntity.schema');
    console.log('     • userEntity.fields');
    console.log('     • userEntity.permissions');
    console.log('     • userEntity.workflows');
    console.log('     • userEntity.views');
    console.log('     • userEntity.clearCache()');
    console.log('     • userEntity.reload()');

    // ===== 4. Cache Management =====
    console.log('\n4. Cache Management:');
    const cacheStats = schemaKit.getCacheStats();
    console.log('   📊 Cache Statistics:', cacheStats);
    
    // Clear specific entity cache
    schemaKit.clearEntityCache('user');
    console.log('   ✅ User entity cache cleared');
    
    // Clear all cache
    schemaKit.clearEntityCache();
    console.log('   ✅ All entity cache cleared');

    // ===== 5. Error Handling =====
    console.log('\n5. Error Handling:');
    try {
      // Try to use entity without initialization
      const uninitializedKit = new SchemaKit();
      uninitializedKit.entity('user');
    } catch (error) {
      console.log('   ✅ Proper error handling:', error instanceof Error ? error.message : error);
    }

    // ===== 6. Architecture Benefits =====
    console.log('\n6. Architecture Benefits:');
    console.log('   ✅ Clean separation of concerns');
    console.log('   ✅ InstallManager handles database setup');
    console.log('   ✅ EntityBuilder provides rich entity API');
    console.log('   ✅ Simplified main SchemaKit class');
    console.log('   ✅ Type-safe adapter management');
    console.log('   ✅ Better error handling');
    console.log('   ✅ Enhanced cache management');

    // ===== 7. Usage Patterns =====
    console.log('\n7. Common Usage Patterns:');
    console.log('   📝 Basic Setup:');
    console.log('     const schemaKit = new SchemaKit(options);');
    console.log('     await schemaKit.initialize();');
    console.log('');
    console.log('   📝 Entity Operations:');
    console.log('     const user = schemaKit.entity("user");');
    console.log('     await user.create({ name: "John", email: "john@example.com" });');
    console.log('     const users = await user.read({ status: "active" });');
    console.log('     await user.update(1, { status: "inactive" });');
    console.log('     await user.delete(1);');
    console.log('     const userData = await user.findById(1);');
    console.log('');
    console.log('   📝 Schema Access:');
    console.log('     const schema = await user.schema;');
    console.log('     const fields = await user.fields;');
    console.log('     const permissions = await user.permissions;');

    // ===== 8. Cleanup =====
    console.log('\n8. Cleanup:');
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