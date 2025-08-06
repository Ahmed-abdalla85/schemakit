/**
 * Database Adapter Compliance Tests
 * 
 * These tests ensure all database adapters implement the interface correctly
 * and maintain consistent behavior across different database systems.
 */
import { DatabaseAdapter } from '../../src/database/adapter';
import { DrizzleAdapter } from '../../src/database/adapters/drizzle';
import { InMemoryAdapter } from '../../src/database/adapters/inmemory';
import { v4 as uuidv4 } from 'uuid';

// Test configuration for different adapters
const testAdapters = [
  {
    name: 'InMemoryAdapter',
    create: () => new InMemoryAdapter(),
    skipSchemaTests: true // InMemory doesn't support schemas
  },
  {
    name: 'DrizzleAdapter (SQLite)',
    create: () => new DrizzleAdapter({ 
      type: 'sqlite', 
      filename: ':memory:' 
    }),
    skipSchemaTests: true // SQLite doesn't support schemas
  },
  // PostgreSQL and MySQL tests can be enabled when test databases are available
  // {
  //   name: 'DrizzleAdapter (PostgreSQL)',
  //   create: () => new DrizzleAdapter({ 
  //     type: 'postgres',
  //     host: 'localhost',
  //     port: 5432,
  //     database: 'schemakit_test',
  //     user: 'test',
  //     password: 'test'
  //   }),
  //   skipSchemaTests: false
  // },
];

describe('DatabaseAdapter Compliance Tests', () => {
  testAdapters.forEach(({ name, create, skipSchemaTests }) => {
    describe(name, () => {
      let adapter: DatabaseAdapter;
      const testTenantId = 'test_tenant';
      const testTableName = 'test_users';

      beforeEach(async () => {
        adapter = create();
        await adapter.connect();
        
        // Create test table
        await adapter.createTable(testTableName, [
          { name: 'id', type: 'string', primaryKey: true },
          { name: 'name', type: 'string', notNull: true },
          { name: 'email', type: 'string', unique: true },
          { name: 'age', type: 'integer' },
          { name: 'active', type: 'boolean', default: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' }
        ]);
      });

      afterEach(async () => {
        if (adapter && adapter.isConnected()) {
          await adapter.disconnect();
        }
      });

      describe('Connection Management', () => {
        test('should connect successfully', () => {
          expect(adapter.isConnected()).toBe(true);
        });

        test('should disconnect successfully', async () => {
          await adapter.disconnect();
          expect(adapter.isConnected()).toBe(false);
        });

        test('should handle multiple connect calls', async () => {
          await adapter.connect();
          await adapter.connect();
          expect(adapter.isConnected()).toBe(true);
        });
      });

      describe('Table Management', () => {
        test('should check if table exists', async () => {
          const exists = await adapter.tableExists(testTableName);
          expect(exists).toBe(true);
          
          const notExists = await adapter.tableExists('non_existent_table');
          expect(notExists).toBe(false);
        });

        test('should get table columns', async () => {
          const columns = await adapter.getTableColumns(testTableName);
          expect(columns).toHaveLength(6);
          
          const idColumn = columns.find(col => col.name === 'id');
          expect(idColumn).toBeDefined();
          expect(idColumn?.primaryKey).toBe(true);
          
          const nameColumn = columns.find(col => col.name === 'name');
          expect(nameColumn).toBeDefined();
          expect(nameColumn?.notNull).toBe(true);
        });
      });

      describe('CRUD Operations', () => {
        const testData = {
          id: uuidv4(),
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          active: true
        };

        test('should insert a record', async () => {
          const result = await adapter.insert(testTableName, testData, testTenantId);
          expect(result).toMatchObject(testData);
        });

        test('should select records', async () => {
          await adapter.insert(testTableName, testData, testTenantId);
          
          const results = await adapter.select(
            testTableName,
            [],
            {},
            testTenantId
          );
          
          expect(results).toHaveLength(1);
          expect(results[0]).toMatchObject(testData);
        });

        test('should select with filters', async () => {
          await adapter.insert(testTableName, testData, testTenantId);
          await adapter.insert(testTableName, {
            ...testData,
            id: uuidv4(),
            name: 'Jane Doe',
            email: 'jane@example.com'
          }, testTenantId);
          
          const results = await adapter.select(
            testTableName,
            [{ field: 'name', value: 'John Doe', operator: 'eq' }],
            {},
            testTenantId
          );
          
          expect(results).toHaveLength(1);
          expect(results[0].name).toBe('John Doe');
        });

        test('should select with options', async () => {
          // Insert multiple records
          for (let i = 0; i < 5; i++) {
            await adapter.insert(testTableName, {
              id: uuidv4(),
              name: `User ${i}`,
              email: `user${i}@example.com`,
              age: 20 + i,
              active: true
            }, testTenantId);
          }
          
          // Test ordering
          const orderedResults = await adapter.select(
            testTableName,
            [],
            { orderBy: [{ field: 'age', direction: 'DESC' }] },
            testTenantId
          );
          
          expect(orderedResults[0].age).toBe(24);
          expect(orderedResults[4].age).toBe(20);
          
          // Test limit
          const limitedResults = await adapter.select(
            testTableName,
            [],
            { limit: 2 },
            testTenantId
          );
          
          expect(limitedResults).toHaveLength(2);
        });

        test('should update a record', async () => {
          await adapter.insert(testTableName, testData, testTenantId);
          
          const updateData = { name: 'John Updated' };
          const result = await adapter.update(
            testTableName,
            testData.id,
            updateData,
            testTenantId
          );
          
          expect(result).toMatchObject({
            id: testData.id,
            ...updateData
          });
          
          // Verify update
          const updated = await adapter.findById(testTableName, testData.id, testTenantId);
          expect(updated?.name).toBe('John Updated');
        });

        test('should delete a record', async () => {
          await adapter.insert(testTableName, testData, testTenantId);
          
          await adapter.delete(testTableName, testData.id, testTenantId);
          
          const deleted = await adapter.findById(testTableName, testData.id, testTenantId);
          expect(deleted).toBeNull();
        });

        test('should count records', async () => {
          // Insert multiple records
          for (let i = 0; i < 3; i++) {
            await adapter.insert(testTableName, {
              id: uuidv4(),
              name: `User ${i}`,
              email: `user${i}@example.com`,
              age: 20 + i,
              active: i % 2 === 0
            }, testTenantId);
          }
          
          const totalCount = await adapter.count(testTableName, [], testTenantId);
          expect(totalCount).toBe(3);
          
          const activeCount = await adapter.count(
            testTableName,
            [{ field: 'active', value: true, operator: 'eq' }],
            testTenantId
          );
          expect(activeCount).toBe(2);
        });

        test('should find by ID', async () => {
          await adapter.insert(testTableName, testData, testTenantId);
          
          const found = await adapter.findById(testTableName, testData.id, testTenantId);
          expect(found).toMatchObject(testData);
          
          const notFound = await adapter.findById(testTableName, 'non_existent_id', testTenantId);
          expect(notFound).toBeNull();
        });
      });

      describe('Raw Query Execution', () => {
        test('should execute raw queries', async () => {
          await adapter.insert(testTableName, {
            id: uuidv4(),
            name: 'Test User',
            email: 'test@example.com',
            age: 25,
            active: true
          }, testTenantId);
          
          const results = await adapter.query(
            `SELECT * FROM ${testTableName} WHERE age > ?`,
            [20]
          );
          
          expect(results).toHaveLength(1);
          expect(results[0].name).toBe('Test User');
        });

        test('should execute non-query statements', async () => {
          const testId = uuidv4();
          const result = await adapter.execute(
            `INSERT INTO ${testTableName} (id, name, email) VALUES (?, ?, ?)`,
            [testId, 'Raw Insert', 'raw@example.com']
          );
          
          expect(result.changes).toBe(1);
          
          // Verify insertion
          const inserted = await adapter.findById(testTableName, testId, testTenantId);
          expect(inserted).toBeTruthy();
          expect(inserted?.name).toBe('Raw Insert');
        });
      });

      describe('Transaction Support', () => {
        test('should commit transaction', async () => {
          const id1 = uuidv4();
          const id2 = uuidv4();
          
          await adapter.transaction(async (tx) => {
            await tx.insert(testTableName, {
              id: id1,
              name: 'Transaction User 1',
              email: 'tx1@example.com'
            }, testTenantId);
            
            await tx.insert(testTableName, {
              id: id2,
              name: 'Transaction User 2',
              email: 'tx2@example.com'
            }, testTenantId);
          });
          
          // Verify both records were inserted
          const user1 = await adapter.findById(testTableName, id1, testTenantId);
          const user2 = await adapter.findById(testTableName, id2, testTenantId);
          
          expect(user1).toBeTruthy();
          expect(user2).toBeTruthy();
        });

        test('should rollback transaction on error', async () => {
          const id1 = uuidv4();
          const id2 = uuidv4();
          
          try {
            await adapter.transaction(async (tx) => {
              await tx.insert(testTableName, {
                id: id1,
                name: 'Transaction User 1',
                email: 'tx1@example.com'
              }, testTenantId);
              
              // This should fail due to duplicate email
              await tx.insert(testTableName, {
                id: id2,
                name: 'Transaction User 2',
                email: 'tx1@example.com' // Duplicate email
              }, testTenantId);
            });
          } catch (error) {
            // Expected error
          }
          
          // Verify no records were inserted
          const user1 = await adapter.findById(testTableName, id1, testTenantId);
          const user2 = await adapter.findById(testTableName, id2, testTenantId);
          
          expect(user1).toBeNull();
          expect(user2).toBeNull();
        });
      });

      if (!skipSchemaTests) {
        describe('Schema Management', () => {
          const testSchema = 'test_schema_' + Date.now();

          afterEach(async () => {
            // Clean up test schema
            try {
              await adapter.dropSchema(testSchema);
            } catch (error) {
              // Ignore errors
            }
          });

          test('should create schema', async () => {
            await adapter.createSchema(testSchema);
            
            const schemas = await adapter.listSchemas();
            expect(schemas).toContain(testSchema);
          });

          test('should drop schema', async () => {
            await adapter.createSchema(testSchema);
            await adapter.dropSchema(testSchema);
            
            const schemas = await adapter.listSchemas();
            expect(schemas).not.toContain(testSchema);
          });

          test('should list schemas', async () => {
            await adapter.createSchema(testSchema);
            
            const schemas = await adapter.listSchemas();
            expect(Array.isArray(schemas)).toBe(true);
            expect(schemas.length).toBeGreaterThan(0);
            expect(schemas).toContain(testSchema);
          });
        });
      }

      describe('Multi-Tenancy', () => {
        test('should isolate data by tenant', async () => {
          const tenant1 = 'tenant_1';
          const tenant2 = 'tenant_2';
          
          const data1 = {
            id: uuidv4(),
            name: 'Tenant 1 User',
            email: 'user@tenant1.com'
          };
          
          const data2 = {
            id: uuidv4(),
            name: 'Tenant 2 User',
            email: 'user@tenant2.com'
          };
          
          // Insert data for different tenants
          await adapter.insert(testTableName, data1, tenant1);
          await adapter.insert(testTableName, data2, tenant2);
          
          // Query data for tenant 1
          const tenant1Results = await adapter.select(
            testTableName,
            [],
            {},
            tenant1
          );
          
          expect(tenant1Results).toHaveLength(1);
          expect(tenant1Results[0].name).toBe('Tenant 1 User');
          
          // Query data for tenant 2
          const tenant2Results = await adapter.select(
            testTableName,
            [],
            {},
            tenant2
          );
          
          expect(tenant2Results).toHaveLength(1);
          expect(tenant2Results[0].name).toBe('Tenant 2 User');
        });
      });

      describe('Error Handling', () => {
        test('should handle connection errors gracefully', async () => {
          await adapter.disconnect();
          
          // Should auto-reconnect
          const result = await adapter.query('SELECT 1');
          expect(result).toBeDefined();
        });

        test('should handle invalid queries', async () => {
          await expect(
            adapter.query('SELECT * FROM non_existent_table')
          ).rejects.toThrow();
        });

        test('should handle constraint violations', async () => {
          const data = {
            id: uuidv4(),
            name: 'Test User',
            email: 'unique@example.com'
          };
          
          await adapter.insert(testTableName, data, testTenantId);
          
          // Try to insert duplicate email
          await expect(
            adapter.insert(testTableName, {
              ...data,
              id: uuidv4()
            }, testTenantId)
          ).rejects.toThrow();
        });
      });
    });
  });
});

describe('DrizzleAdapter Escape Hatch', () => {
  test('should provide access to Drizzle instance with warning', async () => {
    const adapter = new DrizzleAdapter({ 
      type: 'sqlite', 
      filename: ':memory:' 
    });
    
    await adapter.connect();
    
    // Mock console.warn
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const drizzle = adapter.drizzleInstance;
    
    expect(drizzle).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Direct Drizzle access bypasses SchemaKit features')
    );
    
    warnSpy.mockRestore();
    await adapter.disconnect();
  });
});