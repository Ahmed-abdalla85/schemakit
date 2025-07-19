/**
 * Tests for QueryManager (replacing QueryBuilderService)
 */
import { QueryManager } from '../src/core/query-manager';
import { DatabaseAdapter } from '../src/database/adapter';
import { EntityConfiguration, Context } from '../src/types';

// Mock database adapter
const mockDatabaseAdapter = {
  query: jest.fn(),
  execute: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
  transaction: jest.fn()
} as unknown as DatabaseAdapter;

describe('QueryManager', () => {
  let queryManager: QueryManager;
  let mockEntityConfig: EntityConfiguration;

  beforeEach(() => {
    queryManager = new QueryManager(mockDatabaseAdapter);
    
    // Reset mocks
    jest.clearAllMocks();

    // Mock entity configuration
    mockEntityConfig = {
      entity: {
        id: 'test-entity',
        name: 'test_user',
        table_name: 'test_users',
        display_name: 'Test User',
        description: 'Test user entity',
        is_active: true,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        metadata: {}
      },
      fields: [
        {
          id: 'field-1',
          entity_id: 'test-entity',
          name: 'name',
          type: 'string',
          is_required: true,
          is_unique: false,
          default_value: undefined,
          validation_rules: {},
          display_name: 'Name',
          description: 'User name',
          order_index: 0,
          is_active: true,
          reference_entity: undefined,
          metadata: {}
        },
        {
          id: 'field-2',
          entity_id: 'test-entity',
          name: 'email',
          type: 'string',
          is_required: true,
          is_unique: true,
          default_value: undefined,
          validation_rules: {},
          display_name: 'Email',
          description: 'User email',
          order_index: 1,
          is_active: true,
          reference_entity: undefined,
          metadata: {}
        }
      ],
      permissions: [],
      views: [],
      workflows: [],
      rls: []
    };
  });

  describe('executePaginatedQuery', () => {
    it('should execute paginated query with basic parameters', async () => {
      const mockData = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' }
      ];

      (mockDatabaseAdapter.query as jest.Mock)
        .mockResolvedValueOnce(mockData) // Main query
        .mockResolvedValueOnce([{ total: 2 }]); // Count query

      const result = await queryManager.executePaginatedQuery(
        mockEntityConfig,
        [],
        { page: 1, pageSize: 10 },
        {}
      );

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should handle empty results', async () => {
      (mockDatabaseAdapter.query as jest.Mock)
        .mockResolvedValueOnce([]) // Main query
        .mockResolvedValueOnce([{ total: 0 }]); // Count query

      const result = await queryManager.executePaginatedQuery(
        mockEntityConfig,
        [],
        { page: 1, pageSize: 10 },
        {}
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply sorting', async () => {
      const mockData = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' }
      ];

      (mockDatabaseAdapter.query as jest.Mock)
        .mockResolvedValueOnce(mockData)
        .mockResolvedValueOnce([{ total: 2 }]);

      await queryManager.executePaginatedQuery(
        mockEntityConfig,
        [],
        {
          page: 1,
          pageSize: 10,
          sort: [{ field: 'name', direction: 'ASC' }]
        },
        {}
      );

      // Verify that the query was called with sorting
      expect(mockDatabaseAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        expect.any(Array)
      );
    });

    it('should apply conditions', async () => {
      const mockData = [{ id: '1', name: 'John', email: 'john@example.com' }];

      (mockDatabaseAdapter.query as jest.Mock)
        .mockResolvedValueOnce(mockData)
        .mockResolvedValueOnce([{ total: 1 }]);

      const conditions = [
        { field: 'name', operator: 'eq' as const, value: 'John' }
      ];

      await queryManager.executePaginatedQuery(
        mockEntityConfig,
        conditions,
        { page: 1, pageSize: 10 },
        {}
      );

      // Verify that the query was called with conditions
      expect(mockDatabaseAdapter.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['John'])
      );
    });
  });

  describe('executeView', () => {
    it('should execute view query', async () => {
      const mockViewConfig = {
        id: 'view-1',
        entity_id: 'test-entity',
        name: 'default',
        query_config: {
          filters: {},
          sorting: [{ field: 'name', direction: 'asc' }]
        },
        fields: ['id', 'name', 'email'],
        is_default: true,
        created_by: null,
        is_public: true,
        metadata: {}
      };

      const mockData = [
        { id: '1', name: 'John', email: 'john@example.com' }
      ];

      (mockDatabaseAdapter.query as jest.Mock).mockResolvedValue(mockData);

      const result = await queryManager.executeView(
        mockEntityConfig,
        'default',
        { status: 'active' },
        {}
      );

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockData);
    });
  });

  describe('executeCustomQuery', () => {
    it('should execute custom query with query builder', async () => {
      const mockData = [
        { id: '1', name: 'John', email: 'john@example.com' }
      ];

      (mockDatabaseAdapter.query as jest.Mock).mockResolvedValue(mockData);

      const result = await queryManager.executeCustomQuery(
        mockEntityConfig,
        (query) => query
          .select(['id', 'name'])
          .where([{ field: 'name', operator: 'eq' as const, value: 'John' }])
          .orderBy('name', 'ASC')
          .limit(10),
        {}
      );

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockData);
    });
  });

  describe('executeAggregationQuery', () => {
    it('should execute aggregation query', async () => {
      const mockData = [
        { count: 5, avg_age: 30 }
      ];

      (mockDatabaseAdapter.query as jest.Mock).mockResolvedValue(mockData);

      const result = await queryManager.executeAggregationQuery(
        mockEntityConfig,
        [
          { function: 'COUNT', field: 'id', alias: 'count' },
          { function: 'AVG', field: 'age', alias: 'avg_age' }
        ],
        [],
        [],
        {}
      );

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('executeRawQuery', () => {
    it('should execute raw SQL query', async () => {
      const mockData = [
        { id: '1', name: 'John' }
      ];

      (mockDatabaseAdapter.query as jest.Mock).mockResolvedValue(mockData);

      const result = await queryManager.executeRawQuery(
        'SELECT id, name FROM test_users WHERE active = ?',
        [true],
        {}
      );

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('Multi-tenant Query Building', () => {
    it('should build select query with tenant schema', () => {
      const result = queryManager.buildSelectQuery(
        'test_users',
        'tenant1',
        [
          { field: 'name', value: 'John', operator: 'eq' }
        ],
        {
          orderBy: [{ field: 'name', direction: 'ASC' }],
          limit: 10,
          offset: 0
        }
      );

      expect(result.sql).toContain('tenant1.test_users');
      expect(result.params).toContain('John');
    });

    it('should build insert query with tenant schema', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const result = queryManager.buildInsertQuery(
        'test_users',
        'tenant1',
        data
      );

      expect(result.sql).toContain('tenant1.test_users');
      expect(result.sql).toContain('INSERT INTO');
      expect(result.params).toEqual(['John Doe', 'john@example.com']);
    });

    it('should build update query with tenant schema', () => {
      const data = {
        name: 'John Smith'
      };

      const result = queryManager.buildUpdateQuery(
        'test_users',
        'tenant1',
        'user-123',
        data
      );

      expect(result.sql).toContain('tenant1.test_users');
      expect(result.sql).toContain('UPDATE');
      expect(result.sql).toContain('WHERE id =');
      expect(result.params).toEqual(['John Smith', 'user-123']);
    });

    it('should build delete query with tenant schema', () => {
      const result = queryManager.buildDeleteQuery(
        'test_users',
        'tenant1',
        'user-123'
      );

      expect(result.sql).toContain('tenant1.test_users');
      expect(result.sql).toContain('DELETE FROM');
      expect(result.params).toEqual(['user-123']);
    });

    it('should build count query with tenant schema', () => {
      const result = queryManager.buildCountQuery(
        'test_users',
        'tenant1',
        [
          { field: 'active', value: true, operator: 'eq' }
        ]
      );

      expect(result.sql).toContain('tenant1.test_users');
      expect(result.sql).toContain('COUNT(*)');
      expect(result.params).toEqual([true]);
    });

    it('should build find by ID query with tenant schema', () => {
      const result = queryManager.buildFindByIdQuery(
        'test_users',
        'tenant1',
        'user-123'
      );

      expect(result.sql).toContain('tenant1.test_users');
      expect(result.sql).toContain('WHERE id =');
      expect(result.params).toEqual(['user-123']);
    });
  });

  describe('Schema Management', () => {
    it('should build create schema query', () => {
      const result = queryManager.buildCreateSchemaQuery('tenant1');
      expect(result.sql).toContain('CREATE SCHEMA');
      expect(result.sql).toContain('tenant1');
    });

    it('should build drop schema query', () => {
      const result = queryManager.buildDropSchemaQuery('tenant1');
      expect(result.sql).toContain('DROP SCHEMA');
      expect(result.sql).toContain('tenant1');
    });

    it('should build list schemas query', () => {
      const result = queryManager.buildListSchemasQuery();
      expect(result.sql).toContain('SELECT schema_name');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockDatabaseAdapter.query as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        queryManager.executePaginatedQuery(
          mockEntityConfig,
          [],
          { page: 1, pageSize: 10 },
          {}
        )
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid entity configuration', async () => {
      const invalidConfig = {
        ...mockEntityConfig,
        entity: { ...mockEntityConfig.entity, name: '' }
      };

      await expect(
        queryManager.executePaginatedQuery(
          invalidConfig,
          [],
          { page: 1, pageSize: 10 },
          {}
        )
      ).rejects.toThrow();
    });
  });
});