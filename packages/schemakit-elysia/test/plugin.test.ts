import { describe, test, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { SchemaKit } from '@mobtakronio/schemakit';
import { schemaKitElysia } from '../src/plugin';

// Mock SchemaKit for testing
class MockEntity {
  constructor(private name: string) {}

  async insert(data: Record<string, any>) {
    return { id: '1', ...data, created_at: new Date().toISOString() };
  }

  async get(filters: Record<string, any> = {}) {
    return [
      { id: '1', name: 'Test Item 1', ...filters },
      { id: '2', name: 'Test Item 2', ...filters },
    ];
  }

  async getById(id: string | number) {
    if (id === '1') {
      return { id: '1', name: 'Test Item 1' };
    }
    return null;
  }

  async update(id: string | number, data: Record<string, any>) {
    return { id, ...data, updated_at: new Date().toISOString() };
  }

  async delete(id: string | number) {
    return id === '1';
  }
}

class MockSchemaKit {
  async entity(name: string) {
    return new MockEntity(name);
  }
}

describe('SchemaKit Elysia Plugin', () => {
  let app: Elysia;
  let mockSchemaKit: MockSchemaKit;

  beforeEach(() => {
    mockSchemaKit = new MockSchemaKit();
    app = new Elysia().use(
      schemaKitElysia(mockSchemaKit as any, {
        enableDocs: false, // Disable docs for testing
      })
    );
  });

  test('should create CRUD routes for entities', async () => {
    // Test POST - Create
    const createResponse = await app
      .handle(
        new Request('http://localhost/api/entity/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' }),
        })
      );

    expect(createResponse.status).toBe(200);
    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    expect(createData.data.name).toBe('John Doe');

    // Test GET - List
    const listResponse = await app
      .handle(new Request('http://localhost/api/entity/users'));

    expect(listResponse.status).toBe(200);
    const listData = await listResponse.json();
    expect(listData.success).toBe(true);
    expect(Array.isArray(listData.data)).toBe(true);
    expect(listData.meta).toBeDefined();

    // Test GET by ID
    const getResponse = await app
      .handle(new Request('http://localhost/api/entity/users/1'));

    expect(getResponse.status).toBe(200);
    const getData = await getResponse.json();
    expect(getData.success).toBe(true);
    expect(getData.data.id).toBe('1');

    // Test PUT - Update
    const updateResponse = await app
      .handle(
        new Request('http://localhost/api/entity/users/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Jane Doe' }),
        })
      );

    expect(updateResponse.status).toBe(200);
    const updateData = await updateResponse.json();
    expect(updateData.success).toBe(true);
    expect(updateData.data.name).toBe('Jane Doe');

    // Test DELETE
    const deleteResponse = await app
      .handle(
        new Request('http://localhost/api/entity/users/1', {
          method: 'DELETE',
        })
      );

    expect(deleteResponse.status).toBe(200);
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);
    expect(deleteData.data.deleted).toBe(true);
  });

  test('should handle pagination in list requests', async () => {
    const response = await app
      .handle(new Request('http://localhost/api/entity/users?page=1&limit=5'));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.meta.page).toBe(1);
    expect(data.meta.limit).toBe(5);
    expect(data.meta.total).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    const response = await app
      .handle(new Request('http://localhost/api/entity/users/999'));

    expect(response.status).toBe(200); // Elysia returns 200 but with error in body
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test('should handle entity filtering', async () => {
    const appWithFiltering = new Elysia().use(
      schemaKitElysia(mockSchemaKit as any, {
        enableDocs: false,
        includeEntities: ['users'],
        excludeEntities: ['admin'],
      })
    );

    // Should work for included entity
    const userResponse = await appWithFiltering
      .handle(new Request('http://localhost/api/entity/users'));
    expect(userResponse.status).toBe(200);

    // Should be denied for excluded entity (though admin is not in include list anyway)
    const adminResponse = await appWithFiltering
      .handle(new Request('http://localhost/api/entity/admin'));
    expect(adminResponse.status).toBe(200);
    const adminData = await adminResponse.json();
    expect(adminData.success).toBe(false);
  });

  test('should provide entities list endpoint', async () => {
    const response = await app
      .handle(new Request('http://localhost/api/entities'));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});