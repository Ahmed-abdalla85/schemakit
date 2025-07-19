/**
 * Basic Usage Example - SchemaKit Simplified API
 * 
 * This example shows how to use the simplified SchemaKit API
 * with the entity() method for clean, focused CRUD operations.
 */

import { SchemaKit } from '../src/schemakit';

async function basicUsageExample() {
  // 1. Initialize SchemaKit
  const schemaKit = new SchemaKit({
    adapter: {
      type: 'inmemory',
      config: {}
    }
  });

  // 2. Initialize (this will install database if needed)
  await schemaKit.init();

  // 3. Get entity object for CRUD operations
  const users = schemaKit.entity('users');

  // 4. Create a user
  const newUser = await users.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  }, {
    user: { role: 'admin' },
    tenantId: 'tenant1'
  });

  console.log('Created user:', newUser);

  // 5. Read users with filters
  const userList = await users.read({
    page: 1,
    pageSize: 10,
    filters: { age: { $gte: 25 } }
  }, {
    user: { role: 'admin' },
    tenantId: 'tenant1'
  });

  console.log('User list:', userList);

  // 6. Update a user
  const updatedUser = await users.update(newUser.id, {
    age: 31,
    email: 'john.updated@example.com'
  }, {
    user: { role: 'admin' },
    tenantId: 'tenant1'
  });

  console.log('Updated user:', updatedUser);

  // 7. Find user by ID
  const foundUser = await users.findById(newUser.id, {
    user: { role: 'admin' },
    tenantId: 'tenant1'
  });

  console.log('Found user:', foundUser);

  // 8. Delete a user
  await users.delete(newUser.id, {
    user: { role: 'admin' },
    tenantId: 'tenant1'
  });

  console.log('User deleted');

  // 9. Access entity properties
  console.log('User fields:', await users.fields);
  console.log('User workflows:', await users.workflows);
  console.log('User schema:', await users.schema);
}

// Run the example
basicUsageExample().catch(console.error);