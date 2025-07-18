// tests/SchemaBuilder.test.ts

import { SchemaBuilder } from '../core/SchemaBuilder';
import { EntityConfig } from '../types';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('SchemaBuilder', () => {
  const mockConfig: EntityConfig = {
    entity: { entity_id: '1', entity_name: 'test', entity_display_name: 'Test', entity_table_name: 'test_table' },
    fields: [
      { name: 'name', type: 'string', required: true },
      { name: 'age', type: 'number', validation: { min: 18 } }
    ],
    permissions: [],
    workflow: [],
    views: []
  };

  let builder: SchemaBuilder;

  beforeEach(() => {
    builder = new SchemaBuilder(mockConfig);
  });

  it('generates JSON schema', () => {
    const schema = builder.getSchema();
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.minimum).toBe(18);
    expect(schema.required).toContain('name');
  });

  it('validates data', () => {
    const result = builder.validate({ name: 'John', age: 20 });
    expect(result.valid).toBe(true);

    const invalid = builder.validate({ age: 17 });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.some(e => e.message.includes('required'))).toBe(true);
  });
}); 