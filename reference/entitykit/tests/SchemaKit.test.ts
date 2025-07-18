// tests/SchemaKit.test.ts

import { SchemaKit } from '../index';
import { InMemoryDbAdapter } from '../adapters/db/InMemoryDbAdapter';
import { JsonFileConfigSource } from '../adapters/config/JsonFileConfigSource';
import { describe, it, beforeEach } from '@jest/globals';

describe('SchemaKit Integration', () => {
  let kit: SchemaKit;

  beforeEach(() => {
    kit = new SchemaKit({
      dbAdapter: new InMemoryDbAdapter(),
      configSource: new JsonFileConfigSource('/mock/path') // Assume mocked
    });
  });

  it('gets entity and performs CRUD', async () => {
    // Mock config loading if needed
    const entity = await kit.getEntity('test');
    // Test CRUD through entity
  });
}); 