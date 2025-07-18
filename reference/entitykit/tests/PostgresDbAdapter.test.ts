// Test file for PostgresDbAdapter
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PostgresDbAdapter } from '../adapters/db/PostgresDbAdapter';

describe('PostgresDbAdapter', () => {
  let adapter: PostgresDbAdapter;

  beforeEach(async () => {
    adapter = new PostgresDbAdapter('postgres://test:test@localhost:5432/testdb'); // Use test DB creds
    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('inserts and selects a record', async () => {
    const insertResult = await adapter.insert('test_table', { name: 'Test' });
    expect(insertResult.id).toBeDefined();

    const selectResult = await adapter.select('test_table', [{ field: 'id', value: insertResult.id, operator: 'eq' }], {});
    expect(selectResult.length).toBe(1);
    expect(selectResult[0].name).toBe('Test');
  });

  // Add more tests for update, delete, count, etc.
}); 