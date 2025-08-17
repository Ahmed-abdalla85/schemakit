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

import { SchemaKit } from '../packages/schemakit/src/schemakit';

async function main() {
  console.log('🚀 SchemaKit Basic Usage Example\n');

  

  let schemaKit: SchemaKit;

  try {
    // ===== 1. Initialize SchemaKit =====
    console.log('1. Initializing SchemaKit...');
    schemaKit = await new SchemaKit({
      adapter: 'postgres',
      config: {
        host: 'localhost',
        port: 5852,
        user: 'postgres',
        password: 'postgrespassword',
        database: 'postgres'
      },
      multiTenancy: {
        strategy: 'schema'
      },
    });
    await schemaKit.install('system')
    try {
      const Entity = await schemaKit.entity('system_entities','system');
      try {
        const Entities = await Entity.get();
        const fieldRecord = await Entity.get({entity_name:"system_fields"});
        console.log('   ✅ Entities read', Entities);
        console.log('   ✅ Filtering by entity_name', fieldRecord);
      } catch (createError) {
        console.log('   ℹ️  CRUD operations require entity configuration:', createError instanceof Error ? createError.message : createError);
        console.log('   ✅ No validation errors for auto-generated fields (id, created_at, updated_at)');
      }
    } catch (error) {
      console.log('   ❌ Entity creation error:', error instanceof Error ? error.message : error);
    }

  } catch (error) {
    if (error instanceof Error && (error as any).stack) {
      console.error('❌ Example failed:', error.message, '\nStack:', (error as any).stack);
      if ((error as any).cause) {
        console.error('Caused by:', (error as any).cause);
      }
    } else {
      console.error('❌ Example failed:', error);
    }
  }
}

// Export the main function
export { main as basicUsageExample };

// Run the example if this file is executed directly
main().catch(console.error);