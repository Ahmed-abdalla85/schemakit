/**
 * Database Adapter Tests
 * Tests for database adapter initialization and basic functionality
 */

import { InMemoryAdapter } from '../../src/database/adapters/inmemory';
import { PostgresAdapter } from '../../src/database/adapters/postgres';
import { SQLiteAdapter } from '../../src/database/adapters/sqlite';

describe('Database Adapters', () => {
  describe('InMemoryAdapter', () => {
    let adapter: InMemoryAdapter;

    beforeEach(() => {
      adapter = new InMemoryAdapter({});
    });

    test('should initialize with empty storage', () => {
      expect(adapter).toBeInstanceOf(InMemoryAdapter);
    });

    test('should insert and retrieve data', async () => {
      const testData = { name: 'John', email: 'john@example.com' };
      
      const insertResult = await adapter.insert('users', testData, 'test-tenant');
      expect(insertResult).toMatchObject(testData);

      const selectResult = await adapter.select('users', [], {}, 'test-tenant');
      expect(selectResult).toHaveLength(1);
      expect(selectResult[0]).toMatchObject(testData);
    });

    test('should update existing records', async () => {
      // Insert initial data
      const insertData = { name: 'John', email: 'john@example.com' };
      const inserted = await adapter.insert('users', insertData, 'test-tenant');

      // Update the record
      const updateData = { name: 'John Updated' };
      const updateResult = await adapter.update('users', inserted.id, updateData, 'test-tenant');

      expect(updateResult.name).toBe('John Updated');

      // Verify update persisted
      const selectResult = await adapter.select('users', [], {}, 'test-tenant');
      expect(selectResult[0].name).toBe('John Updated');
    });

    test('should delete records', async () => {
      // Insert test data
      const testData = { name: 'John', email: 'john@example.com' };
      const inserted = await adapter.insert('users', testData, 'test-tenant');

      // Delete the record
      await adapter.delete('users', inserted.id, 'test-tenant');

      // Verify deletion
      const selectResult = await adapter.select('users', [], {}, 'test-tenant');
      expect(selectResult).toHaveLength(0);
    });

    test('should handle filtering', async () => {
      // Insert multiple records
      await adapter.insert('users', { name: 'John', status: 'active' }, 'test-tenant');
      await adapter.insert('users', { name: 'Jane', status: 'inactive' }, 'test-tenant');
      await adapter.insert('users', { name: 'Bob', status: 'active' }, 'test-tenant');

      // Filter by status
      const activeUsers = await adapter.select('users', [
        { field: 'status', operator: 'eq', value: 'active' }
      ], {}, 'test-tenant');

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(user => user.status === 'active')).toBe(true);
    });

    test('should handle sorting and pagination', async () => {
      // Insert test data
      await adapter.insert('users', { name: 'Charlie', age: 30 }, 'test-tenant');
      await adapter.insert('users', { name: 'Alice', age: 25 }, 'test-tenant');
      await adapter.insert('users', { name: 'Bob', age: 35 }, 'test-tenant');

      // Test sorting
      const sortedUsers = await adapter.select('users', [], {
        orderBy: [{ field: 'name', direction: 'ASC' }]
      }, 'test-tenant');

      expect(sortedUsers.map(u => u.name)).toEqual(['Alice', 'Bob', 'Charlie']);

      // Test pagination
      const pagedUsers = await adapter.select('users', [], {
        limit: 2,
        offset: 1
      }, 'test-tenant');

      expect(pagedUsers).toHaveLength(2);
    });

    test('should handle different data types', async () => {
      const complexData = {
        string_field: 'text',
        number_field: 42,
        boolean_field: true,
        date_field: new Date('2024-01-01'),
        null_field: null,
        array_field: [1, 2, 3],
        object_field: { nested: 'value' }
      };

      const inserted = await adapter.insert('test_table', complexData, 'test-tenant');
      
      expect(inserted.string_field).toBe('text');
      expect(inserted.number_field).toBe(42);
      expect(inserted.boolean_field).toBe(true);
      expect(inserted.null_field).toBeNull();
      expect(inserted.array_field).toEqual([1, 2, 3]);
      expect(inserted.object_field).toEqual({ nested: 'value' });
    });
  });

  describe('PostgresAdapter', () => {
    let adapter: PostgresAdapter;

    beforeEach(() => {
      // Use test configuration - won't actually connect for unit tests
      adapter = new PostgresAdapter({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test'
      });
    });

    test('should initialize with config', () => {
      expect(adapter).toBeInstanceOf(PostgresAdapter);
    });

    test('should implement required adapter interface', () => {
      expect(typeof adapter.select).toBe('function');
      expect(typeof adapter.insert).toBe('function');
      expect(typeof adapter.update).toBe('function');
      expect(typeof adapter.delete).toBe('function');
    });
  });

  describe('SQLiteAdapter', () => {
    let adapter: SQLiteAdapter;

    beforeEach(() => {
      adapter = new SQLiteAdapter({ database: ':memory:' });
    });

    test('should initialize with config', () => {
      expect(adapter).toBeInstanceOf(SQLiteAdapter);
    });

    test('should implement required adapter interface', () => {
      expect(typeof adapter.select).toBe('function');
      expect(typeof adapter.insert).toBe('function');
      expect(typeof adapter.update).toBe('function');
      expect(typeof adapter.delete).toBe('function');
    });
  });

  describe('Adapter Interface Compliance', () => {
    const adapters = [
      { name: 'InMemory', instance: new InMemoryAdapter({}) },
      { name: 'Postgres', instance: new PostgresAdapter({ host: 'test' }) },
      { name: 'SQLite', instance: new SQLiteAdapter({ database: ':memory:' }) }
    ];

    adapters.forEach(({ name, instance }) => {
      describe(`${name} Interface`, () => {
        test('should implement required methods', () => {
          expect(typeof instance.select).toBe('function');
          expect(typeof instance.insert).toBe('function');
          expect(typeof instance.update).toBe('function');
          expect(typeof instance.delete).toBe('function');
        });
      });
    });
  });

  describe('InMemory Query Building Edge Cases', () => {
    let adapter: InMemoryAdapter;

    beforeEach(() => {
      adapter = new InMemoryAdapter({});
    });

    test('should handle empty filters', async () => {
      await adapter.insert('users', { name: 'John' }, 'test-tenant');
      const result = await adapter.select('users', [], {}, 'test-tenant'); // No filters
      expect(result).toHaveLength(1);
    });

    test('should handle multiple operators', async () => {
      await adapter.insert('users', { name: 'John', age: 25 }, 'test-tenant');
      await adapter.insert('users', { name: 'Jane', age: 30 }, 'test-tenant');
      await adapter.insert('users', { name: 'Bob', age: 35 }, 'test-tenant');

      const result = await adapter.select('users', [
        { field: 'age', operator: 'gte', value: 25 },
        { field: 'age', operator: 'lte', value: 30 }
      ], {}, 'test-tenant');

      expect(result).toHaveLength(2);
    });

    test('should handle IN operator', async () => {
      await adapter.insert('users', { name: 'John', status: 'active' }, 'test-tenant');
      await adapter.insert('users', { name: 'Jane', status: 'inactive' }, 'test-tenant');
      await adapter.insert('users', { name: 'Bob', status: 'pending' }, 'test-tenant');

      const result = await adapter.select('users', [
        { field: 'status', operator: 'in', value: ['active', 'pending'] }
      ], {}, 'test-tenant');

      expect(result).toHaveLength(2);
    });
  });
});