/**
 * SchemaKit SQLite Usage Example
 * 
 * This example demonstrates how to use SchemaKit with SQLite database:
 * - SQLite adapter configuration
 * - Entity CRUD operations with SQLite
 * - Persistent storage
 * - Transaction support
 * 
 * Prerequisites:
 * npm install better-sqlite3
 */

import { SchemaKit } from '../src/schemakit';
import { DatabaseAdapter } from '../src/database/adapter';
import * as path from 'path';

async function main() {
  console.log('🚀 SchemaKit SQLite Usage Example\n');

  let schemaKit: SchemaKit;

  try {
    // ===== 1. Initialize SchemaKit with SQLite =====
    console.log('1. Initializing SchemaKit with SQLite...');
    
    // Note: This example requires better-sqlite3 to be installed
    // Run: npm install better-sqlite3
    
    schemaKit = new SchemaKit({
      adapter: {
        type: 'sqlite',
        config: {
          // Use a file-based database (remove for in-memory)
          filename: path.join(__dirname, 'example.db')
        }
      }
    });

    await schemaKit.initialize();
    console.log('✅ SchemaKit initialized with SQLite\n');

    // ===== 2. Create Entity Schema =====
    console.log('2. Creating entity schema...');
    
    const userEntity = await schemaKit.createEntity({
      name: 'user',
      displayName: 'User',
      fields: [
        {
          name: 'id',
          type: 'integer',
          required: true,
          primaryKey: true,
          autoIncrement: true
        },
        {
          name: 'email',
          type: 'string',
          required: true,
          unique: true,
          validation: {
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            message: 'Invalid email format'
          }
        },
        {
          name: 'name',
          type: 'string',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 100
          }
        },
        {
          name: 'age',
          type: 'integer',
          validation: {
            min: 0,
            max: 150
          }
        },
        {
          name: 'isActive',
          type: 'boolean',
          default: true
        },
        {
          name: 'createdAt',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP'
        }
      ]
    });
    
    console.log('✅ Entity schema created\n');

    // ===== 3. CRUD Operations =====
    console.log('3. Performing CRUD operations...');

    // Create
    const newUser = await userEntity.create({
      email: 'john.doe@example.com',
      name: 'John Doe',
      age: 30
    });
    console.log('✅ Created user:', newUser);

    // Read
    const user = await userEntity.findById(newUser.id);
    console.log('✅ Found user:', user);

    // Update
    const updatedUser = await userEntity.update(newUser.id, {
      age: 31,
      isActive: false
    });
    console.log('✅ Updated user:', updatedUser);

    // List with filters
    const users = await userEntity.find({
      filters: [
        { field: 'age', operator: 'gte', value: 25 }
      ],
      orderBy: [{ field: 'name', direction: 'ASC' }],
      limit: 10
    });
    console.log('✅ Found users:', users);

    // ===== 4. Transaction Example =====
    console.log('\n4. Transaction example...');
    
    const db = schemaKit.getDatabase();
    const adapter = db.getAdapter();
    
    try {
      await adapter.transaction(async (tx) => {
        // Create multiple users in a transaction
        await userEntity.create({
          email: 'jane.doe@example.com',
          name: 'Jane Doe',
          age: 28
        });
        
        await userEntity.create({
          email: 'bob.smith@example.com',
          name: 'Bob Smith',
          age: 35
        });
        
        console.log('✅ Transaction completed successfully');
      });
    } catch (error) {
      console.error('❌ Transaction failed:', error);
    }

    // ===== 5. Direct SQL Queries =====
    console.log('\n5. Direct SQL queries...');
    
    const results = await adapter.query(
      'SELECT COUNT(*) as count FROM user WHERE age > ?',
      [25]
    );
    console.log('✅ User count (age > 25):', results[0].count);

    // ===== 6. Table Information =====
    console.log('\n6. Table information...');
    
    const columns = await adapter.getTableColumns('user');
    console.log('✅ Table columns:', columns);

    // Delete (cleanup)
    await userEntity.delete(newUser.id);
    console.log('✅ Deleted user');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    if (schemaKit) {
      const db = schemaKit.getDatabase();
      const adapter = db.getAdapter();
      await adapter.disconnect();
      console.log('\n✅ Disconnected from SQLite database');
    }
  }
}

// Run the example
main().catch(console.error);
