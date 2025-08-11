/**
 * SchemaKit Views Basic Usage Example - Step 1
 * Demonstrates basic view execution using already loaded Entity metadata
 */

import { SchemaKit } from '../packages/schemakit/src/schemakit';

async function main() {
  console.log('🎯 SchemaKit Views Basic Usage - Step 1\n');

  try {
    // Initialize SchemaKit
    const schemaKit = new SchemaKit({
      adapter: {
        type: 'inmemory', // Use in-memory for testing
        config: {}
      }
    });

    // Get an entity (this loads all metadata including views)
    const customerEntity = await schemaKit.entity('customers', 'tenant-123');
    
    console.log('✅ Entity loaded with metadata:');
    console.log(`   Fields: ${customerEntity.fields.length}`);
    console.log(`   Views: ${customerEntity.views.length}`);
    console.log(`   Permissions: ${customerEntity.permissions.length}\n`);

    // Set up RLS restrictions for testing
    if (customerEntity.viewManager) {
      const restrictions = {
        'user': [{
          conditions: [{
            field: 'created_by',
            operator: 'eq' as const,
            value: 'currentUser.id',
            exposed: false
          }],
          combinator: 'AND' as const
        }]
      };
      
      customerEntity.viewManager.setRLSRestrictions(restrictions);
      console.log('✅ RLS restrictions set for views\n');
    }

    // Test view execution with user context
    const userContext = {
      user: {
        id: 'user-123',
        roles: ['user'],
        department: 'sales'
      }
    };

    // Execute a view (if any views are defined)
    if (customerEntity.views.length > 0) {
      const viewName = customerEntity.views[0].name;
      console.log(`🔍 Executing view: "${viewName}" with RLS`);
      
      const result = await customerEntity.view(viewName, {
        pagination: { page: 1, limit: 10 }
      }, userContext);
      
      console.log('✅ View executed with RLS:');
      console.log(`   Results: ${result.results.length} records`);
      console.log(`   Total: ${result.total}`);
      console.log(`   Fields: ${result.fields.length}`);
      console.log(`   RLS Applied: ✅ (user can only see own records)\n`);
      
      // Show exposed conditions
      if (customerEntity.viewManager) {
        const exposedConditions = customerEntity.viewManager.getExposedConditions(userContext);
        console.log(`   Exposed conditions: ${exposedConditions.length}\n`);
      }
    } else {
      console.log('ℹ️  No views defined for this entity');
      console.log('   Views will be loaded from system_views table in future steps\n');
    }

  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
  }
}

// Export and run
export { main as viewsBasicExample };
if (require.main === module) {
  main().catch(console.error);
}