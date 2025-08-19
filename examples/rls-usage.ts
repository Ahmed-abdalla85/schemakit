/**
 * RLS (Row Level Security) Usage Example
 * Demonstrates how to use the new RLS system in SchemaKit
 */

import { RLSPermissionManager, RoleRestrictions } from '../packages/schemakit/src/entities/permission';
import { SchemaKit } from '../packages/schemakit/src/schemakit';

async function demonstrateRLS() {
  const kit = new SchemaKit({ adapter: 'sqlite' });
  // Create permission manager with RLS capabilities
  const permissionManager = new RLSPermissionManager(kit.adapter);

  // Define role-based restrictions
  const restrictions: RoleRestrictions = {
    // Admin role - can see everything in their department
    'admin': [{
      conditions: [{
        field: 'department',
        operator: 'eq',
        value: 'currentUser.department', // Dynamic value from user context
        exposed: false
      }],
      combinator: 'AND'
    }],

    // Manager role - can see their department + active records
    'manager': [{
      conditions: [
        {
          field: 'department',
          operator: 'eq',
          value: 'currentUser.department',
          exposed: false
        },
        {
          field: 'status',
          operator: 'in',
          value: ['active', 'pending'],
          exposed: false
        }
      ],
      combinator: 'AND'
    }],

    // User role - can only see their own records
    'user': [{
      conditions: [{
        field: 'created_by',
        operator: 'eq',
        value: 'currentUser.id',
        exposed: false
      }],
      combinator: 'AND'
    }],

    // Analyst role - has exposed conditions for filtering
    'analyst': [{
      conditions: [
        {
          field: 'priority',
          operator: 'eq',
          value: 'high',
          exposed: true, // User can modify this filter
          metadata: {
            type: 'string',
            options: ['low', 'medium', 'high', 'urgent']
          }
        },
        {
          field: 'created_at',
          operator: 'gte',
          value: '2024-01-01',
          exposed: false
        }
      ],
      combinator: 'AND'
    }]
  };

  // Set the restrictions
  permissionManager.setRoleRestrictions(restrictions);

  // Example users with different roles
  const adminUser = {
    id: '123',
    roles: ['admin'],
    department: 'HR'
  };

  const managerUser = {
    id: '456', 
    roles: ['manager'],
    department: 'IT'
  };

  const regularUser = {
    id: '789',
    roles: ['user'],
    department: 'Sales'
  };

  const analystUser = {
    id: '101',
    roles: ['analyst'],
    department: 'Analytics'
  };

  // Base query that we want to secure
  const baseQuery = 'SELECT * FROM tasks';

  console.log('=== RLS Demonstration ===\n');

  // Test different users
  console.log('1. Admin User (HR department):');
  const adminQuery = permissionManager.applyRLSToQuery(
    baseQuery, 
    'tasks', 
    { user: adminUser }
  );
  console.log(`   ${adminQuery}\n`);

  console.log('2. Manager User (IT department):');
  const managerQuery = permissionManager.applyRLSToQuery(
    baseQuery, 
    'tasks', 
    { user: managerUser }
  );
  console.log(`   ${managerQuery}\n`);

  console.log('3. Regular User:');
  const userQuery = permissionManager.applyRLSToQuery(
    baseQuery, 
    'tasks', 
    { user: regularUser }
  );
  console.log(`   ${userQuery}\n`);

  console.log('4. Analyst User:');
  const analystQuery = permissionManager.applyRLSToQuery(
    baseQuery, 
    'tasks', 
    { user: analystUser }
  );
  console.log(`   ${analystQuery}\n`);

  // Demonstrate exposed conditions
  console.log('5. Exposed conditions for analyst role:');
  const exposedConditions = permissionManager.getExposedConditions({
    user: analystUser
  });
  console.log('   Available filters for user:', exposedConditions);

  console.log('\n=== Role Hierarchy Demonstration ===');
  
  // User with multiple roles - should use highest priority
  const multiRoleUser = {
    id: '999',
    roles: ['user', 'admin'], // Has both user and admin roles
    department: 'Finance'
  };

  console.log('6. User with multiple roles (user + admin):');
  const multiRoleQuery = permissionManager.applyRLSToQuery(
    baseQuery,
    'tasks',
    { user: multiRoleUser }
  );
  console.log(`   ${multiRoleQuery}`);
  console.log('   ^ Uses admin role (higher priority), not user role\n');
}

// Run the demonstration
if (require.main === module) {
  demonstrateRLS().catch(console.error);
}

export { demonstrateRLS };