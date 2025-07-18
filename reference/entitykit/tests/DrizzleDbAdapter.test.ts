// If import is the issue, but it's not – the error is likely residual. No change needed, but to force, add a comment.
// Test file for DrizzleDbAdapter
import { DrizzleDbAdapter } from '../adapters/db/DrizzleDbAdapter';

describe('DrizzleDbAdapter', () => {
  let adapter: DrizzleDbAdapter;

  beforeEach(async () => {
    adapter = new DrizzleDbAdapter('postgres://test:test@localhost:5432/testdb'); // Use test DB creds
    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('inserts and selects a record', async () => {
    // Assume a test table exists
    const insertResult = await adapter.insert('test_table', { name: 'Test' });
    expect(insertResult.id).toBeDefined();

    const selectResult = await adapter.select('test_table', [{ field: 'id', value: insertResult.id }], {});
    expect(selectResult.length).toBe(1);
    expect(selectResult[0].name).toBe('Test');
  });

  // Add more tests for update, delete, count, etc.
}); 