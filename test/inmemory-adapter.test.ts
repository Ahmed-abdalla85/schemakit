/**
 * Unit tests for InMemoryAdapter
 */
import { InMemoryAdapter } from '../src/database/adapters/inmemory';
import { QueryFilter, QueryOptions } from '../src/database/adapter';

describe('InMemoryAdapter', () => {
  let adapter: InMemoryAdapter;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe('connection management', () => {
    it('should connect and disconnect successfully', async () => {
      const newAdapter = new InMemoryAdapter();
      
      expect(newAdapter.isConnected()).toBe(false);
      
      await newAdapter.connect();
      expect(newAdapter.isConnected()).toBe(true);
      
      await newAdapter.disconnect();
      expect(newAdapter.isConnected()).toBe(false);
    });
  });

  describe('schema management', () => {
    it('should create and list schemas', async () => {
      await adapter.createSchema('tenant1');
      await adapter.createSchema('tenant2');
      
      const schemas = await adapter.listSchemas();
      expect(schemas).toContain('tenant1');
      expect(schemas).toContain('tenant2');
      expect(schemas).toHaveLength(2);
    });

    it('should drop schemas', async () => {
      await adapter.createSchema('tenant1');
      await adapter.createSchema('tenant2');
      
      await adapter.dropSchema('tenant1');
      
      const schemas = await adapter.listSchemas();
      expect(schemas).not.toContain('tenant1');
      expect(schemas).toContain('tenant2');
      expect(schemas).toHaveLength(1);
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      await adapter.createSchema('tenant1');
    });

    it('should insert and find records', async () => {
      const data = { name: 'John', email: 'john@example.com' };
      
      const inserted = await adapter.insert('users', data, 'tenant1');
      expect(inserted).toMatchObject(data);
      expect(inserted.id).toBeDefined();
      expect(inserted.created_at).toBeDefined();
      expect(inserted.updated_at).toBeDefined();
      
      const found = await adapter.findById('users', inserted.id, 'tenant1');
      expect(found).toMatchObject(inserted);
    });

    it('should update records', async () => {
      const data = { name: 'John', email: 'john@example.com' };
      const inserted = await adapter.insert('users', data, 'tenant1');
      
      const updateData = { name: 'Jane', email: 'jane@example.com' };
      const updated = await adapter.update('users', inserted.id, updateData, 'tenant1');
      
      expect(updated.name).toBe('Jane');
      expect(updated.email).toBe('jane@example.com');
      expect(updated.id).toBe(inserted.id);
      expect(updated.updated_at).not.toBe(inserted.updated_at);
    });

    it('should delete records', async () => {
      const data = { name: 'John', email: 'john@example.com' };
      const inserted = await adapter.insert('users', data, 'tenant1');
      
      await adapter.delete('users', inserted.id, 'tenant1');
      
      const found = await adapter.findById('users', inserted.id, 'tenant1');
      expect(found).toBeNull();
    });

    it('should select records with filters', async () => {
      // Insert test data
      await adapter.insert('users', { name: 'John', age: 25, status: 'active' }, 'tenant1');
      await adapter.insert('users', { name: 'Jane', age: 30, status: 'active' }, 'tenant1');
      await adapter.insert('users', { name: 'Bob', age: 35, status: 'inactive' }, 'tenant1');
      
      // Test basic filter
      const filters: QueryFilter[] = [
        { field: 'status', value: 'active', operator: 'eq' }
      ];
      
      const results = await adapter.select('users', filters, {}, 'tenant1');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'active')).toBe(true);
    });

    it('should select records with complex filters', async () => {
      // Insert test data
      await adapter.insert('users', { name: 'John', age: 25 }, 'tenant1');
      await adapter.insert('users', { name: 'Jane', age: 30 }, 'tenant1');
      await adapter.insert('users', { name: 'Bob', age: 35 }, 'tenant1');
      
      // Test range filter
      const filters: QueryFilter[] = [
        { field: 'age', value: 30, operator: 'gte' }
      ];
      
      const results = await adapter.select('users', filters, {}, 'tenant1');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.age >= 30)).toBe(true);
    });

    it('should select records with text search filters', async () => {
      // Insert test data
      await adapter.insert('users', { name: 'John Doe', email: 'john@example.com' }, 'tenant1');
      await adapter.insert('users', { name: 'Jane Smith', email: 'jane@test.com' }, 'tenant1');
      await adapter.insert('users', { name: 'Bob Johnson', email: 'bob@example.com' }, 'tenant1');
      
      // Test contains filter
      const filters: QueryFilter[] = [
        { field: 'email', value: 'example', operator: 'contains' }
      ];
      
      const results = await adapter.select('users', filters, {}, 'tenant1');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.email.includes('example'))).toBe(true);
    });

    it('should select records with sorting', async () => {
      // Insert test data
      await adapter.insert('users', { name: 'Charlie', age: 25 }, 'tenant1');
      await adapter.insert('users', { name: 'Alice', age: 30 }, 'tenant1');
      await adapter.insert('users', { name: 'Bob', age: 35 }, 'tenant1');
      
      const options: QueryOptions = {
        orderBy: [{ field: 'name', direction: 'ASC' }]
      };
      
      const results = await adapter.select('users', [], options, 'tenant1');
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('Alice');
      expect(results[1].name).toBe('Bob');
      expect(results[2].name).toBe('Charlie');
    });

    it('should select records with pagination', async () => {
      // Insert test data with zero-padded numbers for proper alphabetical sorting
      for (let i = 1; i <= 10; i++) {
        const paddedNum = i.toString().padStart(2, '0');
        await adapter.insert('users', { name: `User${paddedNum}`, age: 20 + i }, 'tenant1');
      }
      
      const options: QueryOptions = {
        limit: 3,
        offset: 2,
        orderBy: [{ field: 'name', direction: 'ASC' }]
      };
      
      const results = await adapter.select('users', [], options, 'tenant1');
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('User03');
      expect(results[1].name).toBe('User04');
      expect(results[2].name).toBe('User05');
    });

    it('should count records', async () => {
      // Insert test data
      await adapter.insert('users', { name: 'John', status: 'active' }, 'tenant1');
      await adapter.insert('users', { name: 'Jane', status: 'active' }, 'tenant1');
      await adapter.insert('users', { name: 'Bob', status: 'inactive' }, 'tenant1');
      
      const totalCount = await adapter.count('users', [], 'tenant1');
      expect(totalCount).toBe(3);
      
      const activeCount = await adapter.count('users', [
        { field: 'status', value: 'active', operator: 'eq' }
      ], 'tenant1');
      expect(activeCount).toBe(2);
    });
  });

  describe('tenant isolation', () => {
    it('should isolate data between tenants', async () => {
      await adapter.createSchema('tenant1');
      await adapter.createSchema('tenant2');
      
      // Insert data for different tenants
      await adapter.insert('users', { name: 'John' }, 'tenant1');
      await adapter.insert('users', { name: 'Jane' }, 'tenant2');
      
      // Verify isolation
      const tenant1Users = await adapter.select('users', [], {}, 'tenant1');
      const tenant2Users = await adapter.select('users', [], {}, 'tenant2');
      
      expect(tenant1Users).toHaveLength(1);
      expect(tenant1Users[0].name).toBe('John');
      
      expect(tenant2Users).toHaveLength(1);
      expect(tenant2Users[0].name).toBe('Jane');
    });

    it('should not find records from other tenants', async () => {
      await adapter.createSchema('tenant1');
      await adapter.createSchema('tenant2');
      
      const inserted = await adapter.insert('users', { name: 'John' }, 'tenant1');
      
      // Try to find the record in a different tenant
      const found = await adapter.findById('users', inserted.id, 'tenant2');
      expect(found).toBeNull();
    });
  });

  describe('test utilities', () => {
    it('should clear all data', async () => {
      await adapter.createSchema('tenant1');
      await adapter.insert('users', { name: 'John' }, 'tenant1');
      
      adapter.clearAllData();
      
      const schemas = await adapter.listSchemas();
      expect(schemas).toHaveLength(0);
      
      const users = await adapter.select('users', [], {}, 'tenant1');
      expect(users).toHaveLength(0);
    });

    it('should seed test data', async () => {
      await adapter.createSchema('tenant1');
      
      const testData = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 }
      ];
      
      adapter.seedData('tenant1', 'users', testData);
      
      const users = await adapter.select('users', [], {}, 'tenant1');
      expect(users).toHaveLength(2);
      expect(users.some(u => u.name === 'John')).toBe(true);
      expect(users.some(u => u.name === 'Jane')).toBe(true);
    });

    it('should provide access to all data for debugging', async () => {
      await adapter.createSchema('tenant1');
      await adapter.insert('users', { name: 'John' }, 'tenant1');
      
      const allData = adapter.getAllData();
      expect(allData.has('tenant1')).toBe(true);
      expect(allData.get('tenant1')?.has('users')).toBe(true);
    });
  });
});