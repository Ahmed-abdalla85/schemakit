/**
 * Example Usage of UnifiedEntityHandler
 * 
 * This file demonstrates how to use the new unified entity module
 */

import { DatabaseAdapter } from '../../database/adapter';
import { UnifiedEntityFactory } from './unified-entity-factory';
import { EntityConfig } from './types';
import { createDbAdapter } from './adapters/database-adapter-bridge';

// Example 1: Using UnifiedEntityFactory (Recommended)
async function exampleWithFactory() {
  // Assume you have a database adapter
  const dbAdapter = await DatabaseAdapter.create('sqlite', { filename: 'test.db' });
  
  // Create factory
  const factory = new UnifiedEntityFactory(dbAdapter, {
    cacheEnabled: true,
    tenantId: 'default'
  });

  // Create handler for 'user' entity
  const userHandler = await factory.createHandler('user');

  // CRUD Operations
  // Create
  const createResult = await userHandler.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  }, 'admin'); // Pass user role

  console.log('Create result:', createResult);

  // Read with filters
  const readResult = await userHandler.read({
    page: 1,
    pageSize: 10,
    filters: { age: 30 },
    sortBy: 'name',
    sortOrder: 'ASC'
  }, 'admin');

  console.log('Read result:', readResult);

  // Update
  if (createResult.success && createResult.data) {
    const updateResult = await userHandler.update(
      createResult.data.id,
      { name: 'John Smith' },
      'admin'
    );
    console.log('Update result:', updateResult);
  }

  // Find by ID
  if (createResult.success && createResult.data) {
    const record = await userHandler.findById(createResult.data.id, 'admin');
    console.log('Found record:', record);
  }

  // Delete
  if (createResult.success && createResult.data) {
    const deleteResult = await userHandler.delete(createResult.data.id, 'admin');
    console.log('Delete result:', deleteResult);
  }

  // Get entity information
  const entityInfo = userHandler.getEntityInfo();
  console.log('Entity info:', entityInfo);

  // Get JSON Schema
  const schema = userHandler.getSchema();
  console.log('JSON Schema:', schema);

  // Get fields
  const fields = userHandler.getFields();
  console.log('Fields:', Array.from(fields.entries()));

  // Check permissions
  const canCreate = userHandler.checkPermission('admin', 'create');
  console.log('Admin can create:', canCreate);
}

// Example 2: Direct UnifiedEntityHandler usage (when you have EntityConfig)
async function exampleDirectUsage() {
  // Assume you have a database adapter
  const dbAdapter = await DatabaseAdapter.create('sqlite', { filename: 'test.db' });
  
  // Create DbAdapter
  const db = createDbAdapter(dbAdapter);

  // Example entity configuration
  const entityConfig: EntityConfig = {
    entity: {
      entity_id: '1',
      entity_name: 'product',
      entity_table_name: 'products',
      entity_display_name: 'Product',
      entity_description: 'Product entity'
    },
    fields: [
      {
        field_id: '1',
        field_name: 'id',
        field_type: 'uuid',
        field_is_required: true,
        field_is_unique: true,
        field_display_name: 'ID'
      },
      {
        field_id: '2',
        field_name: 'name',
        field_type: 'string',
        field_is_required: true,
        field_display_name: 'Product Name',
        field_validation_rules: {
          minLength: 3,
          maxLength: 100
        }
      },
      {
        field_id: '3',
        field_name: 'price',
        field_type: 'number',
        field_is_required: true,
        field_display_name: 'Price',
        field_validation_rules: {
          min: 0
        }
      },
      {
        field_id: '4',
        field_name: 'description',
        field_type: 'text',
        field_is_required: false,
        field_display_name: 'Description'
      },
      {
        field_id: '5',
        field_name: 'is_active',
        field_type: 'boolean',
        field_is_required: false,
        field_default_value: true,
        field_display_name: 'Active'
      }
    ],
    permissions: [
      {
        permission_id: '1',
        permission_role_name: 'admin',
        permission_can_create: true,
        permission_can_read: true,
        permission_can_update: true,
        permission_can_delete: true
      },
      {
        permission_id: '2',
        permission_role_name: 'user',
        permission_can_create: false,
        permission_can_read: true,
        permission_can_update: false,
        permission_can_delete: false
      }
    ],
    workflow: [],
    views: []
  };

  // Create handler directly
  const { UnifiedEntityHandler } = await import('./unified-entity-handler');
  const productHandler = new UnifiedEntityHandler(db, entityConfig, 'default');

  // Use the handler
  const result = await productHandler.create({
    name: 'Laptop',
    price: 999.99,
    description: 'High-performance laptop'
  }, 'admin');

  console.log('Product created:', result);

  // Validate data
  const validation = productHandler.validateData({
    name: 'A', // Too short
    price: -10 // Negative price
  });

  console.log('Validation result:', validation);
}

// Example 3: Migration from old EntityAPI to UnifiedEntityHandler
async function migrationExample() {
  // Old way (EntityAPI)
  // const entityAPI = new EntityAPI('user', entityManager, dataManager, validationManager, permissionManager, workflowManager);
  // const result = await entityAPI.create(data, context);

  // New way (UnifiedEntityHandler)
  const dbAdapter = await DatabaseAdapter.create('sqlite', { filename: 'test.db' });
  const factory = new UnifiedEntityFactory(dbAdapter);
  const userHandler = await factory.createHandler('user');
  
  // Same operations, cleaner API
  const result = await userHandler.create(
    { name: 'John', email: 'john@example.com' },
    'admin' // Just pass the role instead of full context
  );

  console.log('Migration result:', result);
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('=== Example with Factory ===');
    await exampleWithFactory();
    
    console.log('\n=== Example Direct Usage ===');
    await exampleDirectUsage();
    
    console.log('\n=== Migration Example ===');
    await migrationExample();
  })().catch(console.error);
}