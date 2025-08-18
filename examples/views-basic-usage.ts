/**
 * SchemaKit Views Basic Usage Example - Step 1
 * Demonstrates basic view execution using already loaded Entity metadata
 */

import { SchemaKit } from '../packages/schemakit/src/schemakit';

async function run() {
  const schemaKit = new SchemaKit({
    adapter: {
      type: 'sqlite', // Use sqlite for testing/local
      config: {}
    }
  } as any);

  const entity = await schemaKit.entity('users', 'tenant-1');
  await entity.insert({ name: 'Alice' });
  const results = await entity.get();
  console.log(results);
}

run().catch(console.error);