/**
 * ViewManager Tests
 * Tests for view execution, RLS integration, and query building
 */

import { ViewManager } from '../../src/entities/views/view-manager';
import { DB } from '../../src/database/db';
import { ViewDefinition, ViewOptions, FieldDefinition } from '../../src/types';
import { RoleRestrictions } from '../../src/types/permissions';

// Mock DB class for testing
jest.mock('../../src/database/db');

describe('ViewManager', () => {
  let viewManager: ViewManager;
  let mockDb: jest.Mocked<DB>;
  let mockFields: FieldDefinition[];
  let mockViews: ViewDefinition[];

  beforeEach(() => {
    // Setup mock DB
    mockDb = new DB({
      adapter: 'inmemory',
      tenantId: 'test',
      config: {}
    }) as jest.Mocked<DB>;

    mockDb.select = jest.fn().mockReturnThis();
    mockDb.from = jest.fn().mockReturnThis();
    mockDb.where = jest.fn().mockReturnThis();
    mockDb.orderBy = jest.fn().mockReturnThis();
    mockDb.limit = jest.fn().mockReturnThis();
    mockDb.get = jest.fn().mockResolvedValue([
      { id: 1, name: 'Test Record 1' },
      { id: 2, name: 'Test Record 2' }
    ]);

    // Setup mock fields
    mockFields = [
      {
        field_id: 'field_1',
        field_entity_id: 'entity_1',
        field_name: 'id',
        field_type: 'integer',
        field_is_required: true,
        field_is_unique: true,
        field_display_name: 'ID',
        field_order_index: 0,
        field_is_active: true
      },
      {
        field_id: 'field_2',
        field_entity_id: 'entity_1',
        field_name: 'name',
        field_type: 'string',
        field_is_required: true,
        field_is_unique: false,
        field_display_name: 'Name',
        field_order_index: 1,
        field_is_active: true
      }
    ];

    // Setup mock views
    mockViews = [
      {
        view_id: 'view_1',
        view_entity_id: 'entity_1',
        view_name: 'active-records',
        view_query_config: {
          filters: { status: 'active' },
          sorting: [{ field: 'created_at', direction: 'desc' }]
        },
        view_fields: ['id', 'name'],
        view_is_default: false,
        view_is_public: true
      }
    ];

    viewManager = new ViewManager(
      mockDb,
      'test-entity',
      'test_table',
      mockFields,
      mockViews
    );
  });

  describe('View Execution', () => {
    test('should execute view successfully', async () => {
      const result = await viewManager.executeView('active-records');

      expect(result).toEqual({
        results: [
          { id: 1, name: 'Test Record 1' },
          { id: 2, name: 'Test Record 2' }
        ],
        total: 2,
        fields: mockFields,
        meta: {
          entityName: 'test-entity',
          viewName: 'active-records'
        }
      });
    });

    test('should throw error for non-existent view', async () => {
      await expect(
        viewManager.executeView('non-existent-view')
      ).rejects.toThrow("View 'non-existent-view' not found");
    });

    test('should apply view filters', async () => {
      await viewManager.executeView('active-records');

      expect(mockDb.where).toHaveBeenCalledWith({ status: 'active' });
    });

    test('should apply view sorting', async () => {
      await viewManager.executeView('active-records');

      expect(mockDb.orderBy).toHaveBeenCalledWith('created_at', 'DESC');
    });

    test('should apply pagination', async () => {
      const options: ViewOptions = {
        pagination: { page: 2, limit: 10 }
      };

      await viewManager.executeView('active-records', {}, options);

      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('Field Selection', () => {
    test('should select specific fields when specified in view', async () => {
      // View specifies fields: ['id', 'name']
      await viewManager.executeView('active-records');

      expect(mockDb.select).toHaveBeenCalledWith(['id', 'name']);
    });

    test('should select all fields when no fields specified', async () => {
      // Create view with no specific fields
      const viewWithAllFields: ViewDefinition = {
        view_id: 'view_all',
        view_entity_id: 'entity_1',
        view_name: 'all-fields',
        view_query_config: {},
        view_fields: [], // Empty fields array
        view_is_default: false,
        view_is_public: true
      };

      const vmWithAllFields = new ViewManager(
        mockDb,
        'test-entity',
        'test_table',
        mockFields,
        [viewWithAllFields]
      );

      await vmWithAllFields.executeView('all-fields');

      expect(mockDb.select).toHaveBeenCalledWith('*');
    });
  });

  describe('RLS Integration', () => {
    test('should set RLS restrictions', () => {
      const restrictions: RoleRestrictions = {
        'user': [{
          conditions: [{
            field: 'created_by',
            op: 'eq',
            value: 'currentUser.id',
            exposed: false
          }],
          combinator: 'AND'
        }]
      };

      expect(() => {
        viewManager.setRLSRestrictions(restrictions);
      }).not.toThrow();
    });

    test('should apply RLS restrictions to query', async () => {
      const restrictions: RoleRestrictions = {
        'user': [{
          conditions: [{
            field: 'created_by',
            op: 'eq',
            value: 'currentUser.id',
            exposed: false
          }],
          combinator: 'AND'
        }]
      };

      viewManager.setRLSRestrictions(restrictions);

      const context = {
        user: {
          id: 'user-123',
          roles: ['user']
        }
      };

      await viewManager.executeView('active-records', context);

      // Should apply basic RLS (created_by = user.id)
      expect(mockDb.where).toHaveBeenCalledWith({ created_by: 'user-123' });
    });

    test('should get exposed conditions', () => {
      const restrictions: RoleRestrictions = {
        'analyst': [{
          conditions: [{
            field: 'priority',
            op: 'eq',
            value: 'high',
            exposed: true
          }],
          combinator: 'AND'
        }]
      };

      viewManager.setRLSRestrictions(restrictions);

      const context = {
        user: {
          roles: ['analyst']
        }
      };

      const exposedConditions = viewManager.getExposedConditions(context);
      expect(exposedConditions).toHaveLength(1);
      expect(exposedConditions[0].field).toBe('priority');
      expect(exposedConditions[0].exposed).toBe(true);
    });
  });

  describe('User Filters', () => {
    test('should apply user-provided filters', async () => {
      const options: ViewOptions = {
        filters: {
          department: 'engineering',
          status: 'active'
        }
      };

      await viewManager.executeView('active-records', {}, options);

      expect(mockDb.where).toHaveBeenCalledWith({ department: 'engineering' });
      expect(mockDb.where).toHaveBeenCalledWith({ status: 'active' }); // From view config
    });
  });

  describe('Error Handling', () => {
    test('should handle query execution errors gracefully', async () => {
      mockDb.get.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        viewManager.executeView('active-records')
      ).rejects.toThrow('Database connection failed');
    });

    test('should handle RLS errors gracefully', async () => {
      const restrictions: RoleRestrictions = {
        'user': [{
          conditions: [{
            field: 'created_by',
            op: 'eq',
            value: 'currentUser.id',
            exposed: false
          }],
          combinator: 'AND'
        }]
      };

      viewManager.setRLSRestrictions(restrictions);

      // Test with invalid context
      const context = {
        user: undefined // Invalid user context
      };

      // Should not throw, but should not apply RLS either
      await expect(
        viewManager.executeView('active-records', context)
      ).resolves.toBeDefined();
    });
  });
});