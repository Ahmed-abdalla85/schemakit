// tests/CrudHandler.test.ts

import { CrudHandler } from '../core/CrudHandler';
import { InMemoryDbAdapter } from '../adapters/db/InMemoryDbAdapter';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('CrudHandler', () => {
  let handler: CrudHandler;
  let db: InMemoryDbAdapter;

  beforeEach(async () => {
    db = new InMemoryDbAdapter();
    await db.connect();
    handler = new CrudHandler(db, 'test_table');
  });

  afterEach(async () => {
    await db.disconnect();
  });

  it('creates and reads a record', async () => {
    const createResult = await handler.create({ name: 'Test' });
    expect(createResult.success).toBe(true);
    expect(createResult.data.id).toBeDefined();

    const readResult = await handler.read({});
    expect(readResult.success).toBe(true);
    expect(readResult.data?.length).toBe(1);
  });

  // Add tests for update, delete, etc.
}); 