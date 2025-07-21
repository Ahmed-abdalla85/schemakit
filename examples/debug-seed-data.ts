/**
 * Debug Script - Check Seeded Data
 * 
 * This script checks what data is actually seeded in the database
 */

import { SchemaKit } from '../src/schemakit';

async function debugSeedData() {
  console.log('🔍 Debug: Checking Seeded Data\n');

  try {
    // Initialize SchemaKit
    const schemaKit = new SchemaKit({
      adapter: {
        type: 'inmemory',
        config: {}
      }
    });

    await schemaKit.initialize();
    console.log('✅ SchemaKit initialized\n');

    // Get the database adapter directly
    const dbAdapter = schemaKit.getDatabase().getAdapter();

    // Check entities
    console.log('1. Checking system_entities...');
    const entities = await dbAdapter.query('SELECT * FROM system_entities');
    console.log('   Entities found:', entities.length);
    entities.forEach((entity: any) => {
      console.log(`   - ${entity.name} (ID: ${entity.id}, Active: ${entity.is_active})`);
    });

    // Check fields for user entity
    console.log('\n2. Checking system_fields for user entity...');
    const userEntity = entities.find((e: any) => e.name === 'user');
    if (userEntity) {
      const fields = await dbAdapter.query('SELECT * FROM system_fields WHERE entity_id = ?', [userEntity.id]);
      console.log('   Fields found:', fields.length);
      fields.forEach((field: any) => {
        console.log(`   - ${field.name} (Type: ${field.type}, Required: ${field.is_required}, Active: ${field.is_active})`);
      });
    } else {
      console.log('   ❌ User entity not found!');
    }

    // Check permissions for user entity
    console.log('\n3. Checking system_permissions for user entity...');
    if (userEntity) {
      const permissions = await dbAdapter.query('SELECT * FROM system_permissions WHERE entity_id = ?', [userEntity.id]);
      console.log('   Permissions found:', permissions.length);
      permissions.forEach((perm: any) => {
        console.log(`   - ${perm.role}:${perm.action} (Allowed: ${perm.is_allowed}, Active: ${perm.is_active || 'NULL'})`);
      });
    }

    // Check workflows
    console.log('\n4. Checking system_workflows for user entity...');
    if (userEntity) {
      const workflows = await dbAdapter.query('SELECT * FROM system_workflows WHERE entity_id = ?', [userEntity.id]);
      console.log('   Workflows found:', workflows.length);
    }

    // Check views
    console.log('\n5. Checking system_views for user entity...');
    if (userEntity) {
      const views = await dbAdapter.query('SELECT * FROM system_views WHERE entity_id = ?', [userEntity.id]);
      console.log('   Views found:', views.length);
      views.forEach((view: any) => {
        console.log(`   - ${view.name} (Default: ${view.is_default})`);
      });
    }

    await schemaKit.disconnect();

  } catch (error) {
    console.error('❌ Debug failed:', error instanceof Error ? error.message : error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Run the debug script
if (require.main === module) {
  debugSeedData().catch(console.error);
}