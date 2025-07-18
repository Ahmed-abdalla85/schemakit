/**
 * Basic SchemaKit Usage Example
 * 
 * This example demonstrates how to use SchemaKit with the new SQL-based installation system.
 */

import { SchemaKit } from '../src/schemakit-new';

async function basicExample() {
    console.log('🚀 SchemaKit Basic Usage Example');
    console.log('================================');

    // Initialize SchemaKit
    const schemaKit = new SchemaKit({
        adapter: {
            type: 'sqlite',
            config: { filename: 'example.db' }
        }
    });

    // Initialize (this will automatically install SchemaKit if not already installed)
    await schemaKit.init();
    console.log('✅ SchemaKit initialized');

    // Check installation status
    const isInstalled = await schemaKit.isInstalled();
    const version = await schemaKit.getVersion();
    console.log(`📦 Installation Status: ${isInstalled ? 'Installed' : 'Not Installed'}`);
    console.log(`📋 Version: ${version}`);

    // Create a user entity (using the default user entity from seed data)
    console.log('\n👤 Creating a user...');
    const user = await schemaKit.create('user', {
        name: 'John Doe',
        email: 'john@example.com'
    });
    console.log('✅ User created:', user);

    // Find the user by ID
    console.log('\n🔍 Finding user by ID...');
    const foundUser = await schemaKit.findById('user', user.id);
    console.log('✅ User found:', foundUser);

    // Update the user
    console.log('\n✏️ Updating user...');
    const updatedUser = await schemaKit.update('user', user.id, {
        name: 'John Smith'
    });
    console.log('✅ User updated:', updatedUser);

    // Check permissions
    console.log('\n🔐 Checking permissions...');
    const adminContext = {
        user: {
            id: 'admin-1',
            roles: ['admin']
        }
    };
    
    const canCreate = await schemaKit.checkPermission('user', 'create', adminContext);
    const permissions = await schemaKit.getEntityPermissions('user', adminContext);
    console.log('✅ Admin can create users:', canCreate);
    console.log('✅ Admin permissions:', permissions);

    // Delete the user
    console.log('\n🗑️ Deleting user...');
    const deleted = await schemaKit.delete('user', user.id);
    console.log('✅ User deleted:', deleted);

    console.log('\n🎉 Example completed successfully!');
}

// Run the example
if (require.main === module) {
    basicExample().catch(console.error);
}

export { basicExample };