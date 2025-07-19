/**
 * Example: Using SchemaKit with EntityKit-style static factory methods
 */
import { SchemaKit } from '../src/schemakit';

async function main() {
  console.log('🚀 SchemaKit Static Factory Pattern Example\n');

  // ===== 1. Initialize Default Instance =====
  console.log('1. Initializing default SchemaKit instance...');
  await SchemaKit.initDefault({
    adapter: {
      type: 'inmemory',
      config: {}
    }
  });
  console.log('✅ Default instance initialized\n');

  // ===== 2. Initialize Named Instances =====
  console.log('2. Initializing named instances...');
  await SchemaKit.init('primary', {
    adapter: { type: 'sqlite', config: { filename: ':memory:' } }
  });
  
  await SchemaKit.init('analytics', {
    adapter: { type: 'inmemory', config: {} }
  });
  console.log('✅ Named instances initialized\n');

  // ===== 3. List All Instances =====
  console.log('3. Listing all instances:');
  const instances = SchemaKit.listInstances();
  instances.forEach(instance => console.log(`   - ${instance}`));
  console.log();

  // ===== 4. Get Cache Statistics =====
  console.log('4. Cache statistics:');
  const stats = SchemaKit.getCacheStats();
  console.log(`   - Entity cache size: ${stats.entityCacheSize}`);
  console.log(`   - Instance cache size: ${stats.instanceCacheSize}`);
  console.log(`   - Instances: ${stats.instances.join(', ')}`);
  console.log();

  // ===== 5. Try to Get Entity (will fail - no entities configured) =====
  console.log('5. Attempting to get entity handler...');
  try {
    const users = await SchemaKit.getEntity('users', 'tenant1');
    console.log('✅ Entity handler retrieved');
  } catch (error) {
    console.log(`❌ Expected error: ${error instanceof Error ? error.message : error}`);
  }
  console.log();

  // ===== 6. Use Specific Instance =====
  console.log('6. Using specific instance...');
  try {
    const primaryUsers = await SchemaKit.getEntity('users', 'tenant1', 'primary');
    console.log('✅ Primary instance entity handler retrieved');
  } catch (error) {
    console.log(`❌ Expected error: ${error instanceof Error ? error.message : error}`);
  }
  console.log();

  // ===== 7. Cache Management =====
  console.log('7. Cache management...');
  SchemaKit.clearEntityCache('users', 'tenant1');
  console.log('✅ Cleared specific entity cache');
  
  SchemaKit.clearAllCache();
  console.log('✅ Cleared all caches');
  console.log();

  // ===== 8. Instance Lifecycle =====
  console.log('8. Instance lifecycle management...');
  
  // Shutdown specific instance
  await SchemaKit.shutdown('analytics');
  console.log('✅ Analytics instance shut down');
  
  // List remaining instances
  const remainingInstances = SchemaKit.listInstances();
  console.log(`   - Remaining instances: ${remainingInstances.join(', ')}`);
  console.log();

  // ===== 9. Shutdown All =====
  console.log('9. Shutting down all instances...');
  await SchemaKit.shutdownAll();
  console.log('✅ All instances shut down');
  
  const finalInstances = SchemaKit.listInstances();
  console.log(`   - Final instance count: ${finalInstances.length}`);
  console.log();

  console.log('🎉 Example completed successfully!');
}

// ===== Comparison: Old vs New API =====
async function apiComparison() {
  console.log('\n📊 API Comparison: Old vs New\n');

  console.log('OLD API (Instance-based):');
  console.log('```typescript');
  console.log('const schemaKit = new SchemaKit(options);');
  console.log('await schemaKit.init();');
  console.log('const config = await schemaKit.loadEntity("users");');
  console.log('const result = await schemaKit.create("users", data);');
  console.log('```\n');

  console.log('NEW API (EntityKit-style):');
  console.log('```typescript');
  console.log('await SchemaKit.initDefault(options);');
  console.log('const users = await SchemaKit.getEntity("users", "tenant1");');
  console.log('const result = await users.create(data);');
  console.log('```\n');

  console.log('✨ Benefits of the new API:');
  console.log('   - Static factory methods for convenience');
  console.log('   - Automatic instance management');
  console.log('   - Multi-tenant support built-in');
  console.log('   - EntityKit-compatible interface');
  console.log('   - Unified entity handlers');
  console.log('   - Better caching and lifecycle management');
}

// Run the examples
if (require.main === module) {
  main()
    .then(() => apiComparison())
    .catch(console.error);
}

export { main, apiComparison };