/**
 * Tests for UnifiedEntityHandler
 */

import { UnifiedEntityHandler } from '../../../src/entities/unified/unified-entity-handler';
import { DbAdapter } from '../../../src/entities/unified/adapters/database-adapter-bridge';
import { EntityConfig } from '../../../src/entities/unified/types';

// Mock DbAdapter
const createMockDbAdapter = (): jest.Mocked<DbAdapter> => ({
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn()
});

// Test entity configuration
const testEntityConfig: EntityConfig = {
  entity: {
    entity_id: '1',
    entity_name: 'test_entity',
    entity_table_name: 'test_entities',
    entity_display_name: 'Test Entity'
  },
  fields: [
    {
      field_id: '1',
      field_name: 'id',
      field_type: 'uuid',
      field_is_required: true,
      field_is_unique: true,
      field_display_name: 'ID'
    },
    {
      field_id: '2',
      field_name: 'name',
      field_type: 'string',
      field_is_required: true,
      field_display_name: 'Name',
      field_validation_rules: {
        minLength: 3,
        maxLength: 50
      }
    },
    {
      field_id: '3',
      field_name: 'age',
      field_type: 'number',
      field_is_required: false,
      field_display_name: 'Age',
      field_validation_rules: {
        min: 0,
        max: 150
      }
    },
    {
      field_id: '4',
      field_name: 'email',
      field_type: 'email',
      field_is_required: true,
      field_display_name: 'Email'
    },
    {
      field_id: '5',
      field_name: 'is_active',
      field_type: 'boolean',
      field_is_required: false,
      field_default_value: true,
      field_display_name: 'Active'
    }
  ],
  permissions: [
    {
      permission_id: '1',
      permission_role_name: 'admin',
      permission_can_create: true,
      permission_can_read: true,
      permission_can_update: true,
      permission_can_delete: true
    },
    {
      permission_id: '2',
      permission_role_name: 'user',
      permission_can_create: false,
      permission_can_read: true,
      permission_can_update: false,
      permission_can_delete: false
    }
  ],
  workflow: [],
  views: []
};

describe('UnifiedEntityHandler', () => {
  let mockDb: jest.Mocked<DbAdapter>;
  let handler: UnifiedEntityHandler;

  beforeEach(() => {
    mockDb = createMockDbAdapter();
    handler = new UnifiedEntityHandler(mockDb, testEntityConfig, 'test-tenant');
  });

  describe('Configuration Processing', () => {
    test('should process entity configuration correctly', () => {
      const info = handler.getEntityInfo();
      expect(info.entityName).toBe('test_entity');
      expect(info.displayName).toBe('Test Entity');
      expect(info.tableName).toBe('test_entities');
      expect(info.tenantId).toBe('test-tenant');
      expect(info.fieldCount).toBe(5);
      expect(info.permissionCount).toBe(2);
    });

    test('should generate correct JSON schema', () => {
      const schema = handler.getSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('name');
      expect(schema.properties.name).toEqual({
        type: 'string',
        minLength: 3,
        maxLength: 50
      });
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('email');
    });
  });

  describe('Validation', () => {
    test('should validate required fields', () => {
      const result = handler.validateData({
        name: 'John'
        // Missing required 'email' field
      }, true);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[0].message).toContain('required');
    });

    test('should validate field types', () => {
      const result = handler.validateData({
        name: 'John',
        email: 'invalid-email',
        age: 'not-a-number'
      }, true);

      expect(result.valid).toBe(false);
      const emailError = result.errors.find((e: any) => e.field === 'email');
      const ageError = result.errors.find((e: any) => e.field === 'age');
      expect(emailError?.message).toContain('valid email');
      expect(ageError?.message).toContain('number');
    });

    test('should validate field rules', () => {
      const result = handler.validateData({
        name: 'Jo', // Too short
        email: 'john@example.com',
        age: 200 // Too high
      }, true);

      expect(result.valid).toBe(false);
      const nameError = result.errors.find((e: any) => e.field === 'name');
      const ageError = result.errors.find((e: any) => e.field === 'age');
      expect(nameError?.message).toContain('at least 3 characters');
      expect(ageError?.message).toContain('no more than 150');
    });
  });

  describe('Permissions', () => {
    test('should check permissions correctly', () => {
      expect(handler.checkPermission('admin', 'create')).toBe(true);
      expect(handler.checkPermission('admin', 'delete')).toBe(true);
      expect(handler.checkPermission('user', 'create')).toBe(false);
      expect(handler.checkPermission('user', 'read')).toBe(true);
      expect(handler.checkPermission('unknown', 'read')).toBe(false);
    });
  });

  describe('CRUD Operations', () => {
    describe('Create', () => {
      test('should create record successfully', async () => {
        const mockId = 'test-id-123';
        const createData = {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        };

        mockDb.insert.mockResolvedValue({ 
          changes: 1, 
          lastInsertId: mockId 
        });
        mockDb.findById.mockResolvedValue({
          id: mockId,
          ...createData,
          is_active: true,
          created_at: expect.any(String),
          updated_at: expect.any(String)
        });

        const result = await handler.create(createData, 'admin');

        if (!result.success) {
          console.log('Create failed:', result.message, result.errors);
        }

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          id: mockId,
          ...createData,
          is_active: true
        });
        expect(mockDb.insert).toHaveBeenCalledWith(
          'test_entities',
          expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            is_active: true
          }),
          'test-tenant'
        );
      });

      test('should deny creation without permission', async () => {
        const result = await handler.create({
          name: 'John',
          email: 'john@example.com'
        }, 'user');

        expect(result.success).toBe(false);
        expect(result.message).toContain('Permission denied');
        expect(mockDb.insert).not.toHaveBeenCalled();
      });

      test('should fail validation on create', async () => {
        const result = await handler.create({
          name: 'Jo', // Too short
          email: 'invalid'
        }, 'admin');

        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(mockDb.insert).not.toHaveBeenCalled();
      });
    });

    describe('Read', () => {
      test('should read records successfully', async () => {
        const mockRecords = [
          { id: '1', name: 'John', email: 'john@example.com' },
          { id: '2', name: 'Jane', email: 'jane@example.com' }
        ];

        mockDb.select.mockResolvedValue(mockRecords);

        const result = await handler.read({
          page: 1,
          pageSize: 10
        }, 'user');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockRecords);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(mockDb.select).toHaveBeenCalledWith(
          'test_entities',
          [],
          { limit: 10, offset: 0, orderBy: [] },
          'test-tenant'
        );
      });

      test('should apply filters correctly', async () => {
        mockDb.select.mockResolvedValue([]);

        await handler.read({
          filters: { name: 'John' },
          sortBy: 'name',
          sortOrder: 'DESC'
        }, 'admin');

        expect(mockDb.select).toHaveBeenCalledWith(
          'test_entities',
          [{ field: 'name', value: 'John', operator: 'eq' }],
          expect.objectContaining({
            orderBy: [{ field: 'name', direction: 'DESC' }]
          }),
          'test-tenant'
        );
      });
    });

    describe('Update', () => {
      test('should update record successfully', async () => {
        const mockId = 'test-id-123';
        const existingRecord = {
          id: mockId,
          name: 'John Doe',
          email: 'john@example.com'
        };
        const updateData = { name: 'John Smith' };

        mockDb.findById.mockResolvedValueOnce(existingRecord);
        mockDb.update.mockResolvedValue({ changes: 1 });
        mockDb.findById.mockResolvedValueOnce({
          ...existingRecord,
          ...updateData
        });

        const result = await handler.update(mockId, updateData, 'admin');

        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('John Smith');
        expect(mockDb.update).toHaveBeenCalledWith(
          'test_entities',
          mockId,
          expect.objectContaining({
            name: 'John Smith',
            updated_at: expect.any(String)
          }),
          'test-tenant'
        );
      });

      test('should fail if record not found', async () => {
        mockDb.findById.mockResolvedValue(null);

        const result = await handler.update('non-existent', { name: 'Test' }, 'admin');

        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
        expect(mockDb.update).not.toHaveBeenCalled();
      });
    });

    describe('Delete', () => {
      test('should delete record successfully', async () => {
        const mockId = 'test-id-123';
        mockDb.findById.mockResolvedValue({ id: mockId });

        const result = await handler.delete(mockId, 'admin');

        expect(result.success).toBe(true);
        expect(result.id).toBe(mockId);
        expect(mockDb.delete).toHaveBeenCalledWith(
          'test_entities',
          mockId,
          'test-tenant'
        );
      });

      test('should deny deletion without permission', async () => {
        const result = await handler.delete('test-id', 'user');

        expect(result.success).toBe(false);
        expect(result.message).toContain('Permission denied');
        expect(mockDb.delete).not.toHaveBeenCalled();
      });
    });
  });
});