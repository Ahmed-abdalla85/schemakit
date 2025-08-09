/**
 * Database Adapter Tests
 * Tests for database adapter initialization and basic functionality
 */

import { InMemoryAdapter } from '../../src/database/adapters/inmemory';

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
      
      const insertResult = await adapter.insert('users', testData);
      expect(insertResult).toMatchObject(testData);

      const selectResult = await adapter.select('users', [], {});
      expect(selectResult).toHaveLength(1);
      expect(selectResult[0]).toMatchObject(testData);
    });

    test('should update existing records', async () => {
      // Insert initial data
      const insertData = { name: 'John', email: 'john@example.com' };
      const inserted = await adapter.insert('users', insertData);

      // Update the record
      const updateData = { name: 'John Updated' };
      const updateResult = await adapter.update('users', inserted.id, updateData);

      expect(updateResult.name).toBe('John Updated');

      // Verify update persisted
      const selectResult = await adapter.select('users', [], {});
      expect(selectResult[0].name).toBe('John Updated');
    });

    test('should delete records', async () => {
      // Insert test data
      const testData = { name: 'John', email: 'john@example.com' };
      const inserted = await adapter.insert('users', testData);

      // Delete the record
      await adapter.delete('users', inserted.id);

      // Verify deletion
      const selectResult = await adapter.select('users', [], {});
      expect(selectResult).toHaveLength(0);
    });

    test('should handle filtering', async () => {
      // Insert multiple records
      await adapter.insert('users', { name: 'John', status: 'active' });
      await adapter.insert('users', { name: 'Jane', status: 'inactive' });
      await adapter.insert('users', { name: 'Bob', status: 'active' });

      // Filter by status
      const activeUsers = await adapter.select('users', [
        { field: 'status', operator: 'eq', value: 'active' }
      ], {});

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(user => user.status === 'active')).toBe(true);
    });

    test('should handle sorting and pagination', async () => {
      // Insert test data
      await adapter.insert('users', { name: 'Charlie', age: 30 });
      await adapter.insert('users', { name: 'Alice', age: 25 });
      await adapter.insert('users', { name: 'Bob', age: 35 });

      // Test sorting
      const sortedUsers = await adapter.select('users', [], {
        orderBy: [{ field: 'name', direction: 'ASC' }]
      });

      expect(sortedUsers.map(u => u.name)).toEqual(['Alice', 'Bob', 'Charlie']);

      // Test pagination
      const pagedUsers = await adapter.select('users', [], {
        limit: 2,
        offset: 1
      });

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

      const inserted = await adapter.insert('test_table', complexData);
      
      expect(inserted.string_field).toBe('text');
      expect(inserted.number_field).toBe(42);
      expect(inserted.boolean_field).toBe(true);
      expect(inserted.null_field).toBeNull();
      expect(inserted.array_field).toEqual([1, 2, 3]);
      expect(inserted.object_field).toEqual({ nested: 'value' });
    });
  });

  describe('Adapter Interface Compliance', () => {
    const adapters = [
      { name: 'InMemory', instance: new InMemoryAdapter({}) },
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
      await adapter.insert('users', { name: 'John' });
      const result = await adapter.select('users', [], {}); // No filters
      expect(result).toHaveLength(1);
    });

    test('should handle multiple operators', async () => {
      await adapter.insert('users', { name: 'John', age: 25 });
      await adapter.insert('users', { name: 'Jane', age: 30 });
      await adapter.insert('users', { name: 'Bob', age: 35 });

      const result = await adapter.select('users', [
        { field: 'age', operator: 'gte', value: 25 },
        { field: 'age', operator: 'lte', value: 30 }
      ], {});

      expect(result).toHaveLength(2);
    });

    test('should handle IN operator', async () => {
      await adapter.insert('users', { name: 'John', status: 'active' });
      await adapter.insert('users', { name: 'Jane', status: 'inactive' });
      await adapter.insert('users', { name: 'Bob', status: 'pending' });

      const result = await adapter.select('users', [
        { field: 'status', operator: 'in', value: ['active', 'pending'] }
      ], {});

      expect(result).toHaveLength(2);
    });
  });
});