/**
 * Unit tests for query helper utilities
 */
import {
  buildWhereClause,
  buildOrderClause,
  buildLimitClause,
  escapeIdentifier,
  buildSelectQuery,
  buildJoinClause,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
  buildCountQuery,
  buildQualifiedTableName,
  parseSortDirection,
  filtersToConditions,
  buildSearchConditions,
  buildOrConditions,
  isValidIdentifier,
  buildCreateTableQuery,
  QueryCondition,
  SortOption,
  PaginationOptions,
  JoinClause
} from '../../../src/utils/query-helpers';

describe('Query Helper Utilities', () => {
  describe('buildWhereClause', () => {
    it('should build simple equality conditions', () => {
      const conditions: QueryCondition[] = [
        { field: 'name', operator: 'eq', value: 'John' },
        { field: 'age', operator: 'gt', value: 18 }
      ];

      const result = buildWhereClause(conditions);
      expect(result.sql).toBe('"name" = $1 AND "age" > $2');
      expect(result.params).toEqual(['John', 18]);
    });

    it('should handle IN operator', () => {
      const conditions: QueryCondition[] = [
        { field: 'status', operator: 'in', value: ['active', 'pending'] }
      ];

      const result = buildWhereClause(conditions);
      expect(result.sql).toBe('"status" IN ($1, $2)');
      expect(result.params).toEqual(['active', 'pending']);
    });

    it('should handle LIKE operators', () => {
      const conditions: QueryCondition[] = [
        { field: 'name', operator: 'contains', value: 'John' },
        { field: 'email', operator: 'startswith', value: 'admin' },
        { field: 'phone', operator: 'endswith', value: '1234' }
      ];

      const result = buildWhereClause(conditions);
      expect(result.sql).toBe('"name" ILIKE $1 AND "email" ILIKE $2 AND "phone" ILIKE $3');
      expect(result.params).toEqual(['%John%', 'admin%', '%1234']);
    });

    it('should handle NULL operators', () => {
      const conditions: QueryCondition[] = [
        { field: 'deleted_at', operator: 'isnull', value: null },
        { field: 'created_at', operator: 'isnotnull', value: null }
      ];

      const result = buildWhereClause(conditions);
      expect(result.sql).toBe('"deleted_at" IS NULL AND "created_at" IS NOT NULL');
      expect(result.params).toEqual([]);
    });

    it('should return empty for no conditions', () => {
      const result = buildWhereClause([]);
      expect(result.sql).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should handle empty IN array', () => {
      const conditions: QueryCondition[] = [
        { field: 'status', operator: 'in', value: [] }
      ];

      const result = buildWhereClause(conditions);
      expect(result.sql).toBe('1=0'); // Always false
      expect(result.params).toEqual([]);
    });

    it('should handle custom parameter index', () => {
      const conditions: QueryCondition[] = [
        { field: 'name', operator: 'eq', value: 'John' }
      ];

      const result = buildWhereClause(conditions, 5);
      expect(result.sql).toBe('"name" = $5');
      expect(result.params).toEqual(['John']);
    });
  });

  describe('buildOrderClause', () => {
    it('should build ORDER BY clause', () => {
      const sorting: SortOption[] = [
        { field: 'name', direction: 'ASC' },
        { field: 'created_at', direction: 'DESC' }
      ];

      const result = buildOrderClause(sorting);
      expect(result).toBe('ORDER BY "name" ASC, "created_at" DESC');
    });

    it('should handle single sort option', () => {
      const sorting: SortOption[] = [
        { field: 'name', direction: 'ASC' }
      ];

      const result = buildOrderClause(sorting);
      expect(result).toBe('ORDER BY "name" ASC');
    });

    it('should return empty for no sorting', () => {
      const result = buildOrderClause([]);
      expect(result).toBe('');
    });

    it('should normalize direction case', () => {
      const sorting: SortOption[] = [
        { field: 'name', direction: 'desc' as 'DESC' }
      ];

      const result = buildOrderClause(sorting);
      expect(result).toBe('ORDER BY "name" DESC');
    });
  });

  describe('buildLimitClause', () => {
    it('should build LIMIT and OFFSET', () => {
      const pagination: PaginationOptions = { limit: 10, offset: 20 };
      const result = buildLimitClause(pagination);
      expect(result).toBe('LIMIT 10 OFFSET 20');
    });

    it('should build LIMIT only', () => {
      const pagination: PaginationOptions = { limit: 10, offset: 0 };
      const result = buildLimitClause(pagination);
      expect(result).toBe('LIMIT 10');
    });

    it('should build OFFSET only', () => {
      const pagination: PaginationOptions = { limit: 0, offset: 20 };
      const result = buildLimitClause(pagination);
      expect(result).toBe('OFFSET 20');
    });

    it('should return empty for no pagination', () => {
      const pagination: PaginationOptions = { limit: 0, offset: 0 };
      const result = buildLimitClause(pagination);
      expect(result).toBe('');
    });
  });

  describe('escapeIdentifier', () => {
    it('should escape simple identifiers', () => {
      expect(escapeIdentifier('name')).toBe('"name"');
      expect(escapeIdentifier('user_id')).toBe('"user_id"');
    });

    it('should escape identifiers with quotes', () => {
      expect(escapeIdentifier('user"name')).toBe('"user""name"');
    });

    it('should handle empty string', () => {
      expect(escapeIdentifier('')).toBe('""');
    });
  });

  describe('buildJoinClause', () => {
    it('should build JOIN clauses', () => {
      const joins: JoinClause[] = [
        { type: 'INNER', table: 'profiles', on: 'users.id = profiles.user_id' },
        { type: 'LEFT', table: 'departments', on: 'users.dept_id = departments.id', alias: 'd' }
      ];

      const result = buildJoinClause(joins);
      expect(result).toBe('INNER JOIN "profiles" ON users.id = profiles.user_id LEFT JOIN "departments" AS "d" ON users.dept_id = departments.id');
    });

    it('should handle single join', () => {
      const joins: JoinClause[] = [
        { type: 'LEFT', table: 'profiles', on: 'users.id = profiles.user_id' }
      ];

      const result = buildJoinClause(joins);
      expect(result).toBe('LEFT JOIN "profiles" ON users.id = profiles.user_id');
    });
  });

  describe('buildSelectQuery', () => {
    it('should build complete SELECT query', () => {
      const result = buildSelectQuery({
        table: 'users',
        fields: ['id', 'name', 'email'],
        conditions: [
          { field: 'active', operator: 'eq', value: true },
          { field: 'age', operator: 'gte', value: 18 }
        ],
        sorting: [
          { field: 'name', direction: 'ASC' }
        ],
        pagination: { limit: 10, offset: 0 }
      });

      expect(result.sql).toBe('SELECT "id", "name", "email" FROM "users" WHERE "active" = $1 AND "age" >= $2 ORDER BY "name" ASC LIMIT 10');
      expect(result.params).toEqual([true, 18]);
    });

    it('should build simple SELECT query', () => {
      const result = buildSelectQuery({
        table: 'users'
      });

      expect(result.sql).toBe('SELECT * FROM "users"');
      expect(result.params).toEqual([]);
    });

    it('should include JOINs', () => {
      const result = buildSelectQuery({
        table: 'users',
        joins: [
          { type: 'LEFT', table: 'profiles', on: 'users.id = profiles.user_id' }
        ]
      });

      expect(result.sql).toBe('SELECT * FROM "users" LEFT JOIN "profiles" ON users.id = profiles.user_id');
    });
  });

  describe('buildInsertQuery', () => {
    it('should build INSERT query', () => {
      const data = { name: 'John', email: 'john@example.com', age: 30 };
      const result = buildInsertQuery('users', data);

      expect(result.sql).toBe('INSERT INTO "users" ("name", "email", "age") VALUES ($1, $2, $3)');
      expect(result.params).toEqual(['John', 'john@example.com', 30]);
    });

    it('should build INSERT query with RETURNING', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const result = buildInsertQuery('users', data, ['id', 'created_at']);

      expect(result.sql).toBe('INSERT INTO "users" ("name", "email") VALUES ($1, $2) RETURNING "id", "created_at"');
      expect(result.params).toEqual(['John', 'john@example.com']);
    });

    it('should throw error for empty data', () => {
      expect(() => buildInsertQuery('users', {})).toThrow('No data provided for INSERT query');
    });
  });

  describe('buildUpdateQuery', () => {
    it('should build UPDATE query', () => {
      const data = { name: 'Jane', email: 'jane@example.com' };
      const conditions: QueryCondition[] = [
        { field: 'id', operator: 'eq', value: 1 }
      ];

      const result = buildUpdateQuery('users', data, conditions);

      expect(result.sql).toBe('UPDATE "users" SET "name" = $1, "email" = $2 WHERE "id" = $3');
      expect(result.params).toEqual(['Jane', 'jane@example.com', 1]);
    });

    it('should build UPDATE query with RETURNING', () => {
      const data = { name: 'Jane' };
      const conditions: QueryCondition[] = [
        { field: 'id', operator: 'eq', value: 1 }
      ];

      const result = buildUpdateQuery('users', data, conditions, ['updated_at']);

      expect(result.sql).toBe('UPDATE "users" SET "name" = $1 WHERE "id" = $2 RETURNING "updated_at"');
      expect(result.params).toEqual(['Jane', 1]);
    });

    it('should throw error for empty data', () => {
      expect(() => buildUpdateQuery('users', {}, [])).toThrow('No data provided for UPDATE query');
    });
  });

  describe('buildDeleteQuery', () => {
    it('should build DELETE query', () => {
      const conditions: QueryCondition[] = [
        { field: 'id', operator: 'eq', value: 1 }
      ];

      const result = buildDeleteQuery('users', conditions);

      expect(result.sql).toBe('DELETE FROM "users" WHERE "id" = $1');
      expect(result.params).toEqual([1]);
    });

    it('should build DELETE query with RETURNING', () => {
      const conditions: QueryCondition[] = [
        { field: 'id', operator: 'eq', value: 1 }
      ];

      const result = buildDeleteQuery('users', conditions, ['id']);

      expect(result.sql).toBe('DELETE FROM "users" WHERE "id" = $1 RETURNING "id"');
      expect(result.params).toEqual([1]);
    });
  });

  describe('buildCountQuery', () => {
    it('should build COUNT query', () => {
      const conditions: QueryCondition[] = [
        { field: 'active', operator: 'eq', value: true }
      ];

      const result = buildCountQuery('users', conditions);

      expect(result.sql).toBe('SELECT COUNT(*) as count FROM "users" WHERE "active" = $1');
      expect(result.params).toEqual([true]);
    });

    it('should build COUNT query with JOINs', () => {
      const conditions: QueryCondition[] = [
        { field: 'active', operator: 'eq', value: true }
      ];
      const joins: JoinClause[] = [
        { type: 'LEFT', table: 'profiles', on: 'users.id = profiles.user_id' }
      ];

      const result = buildCountQuery('users', conditions, joins);

      expect(result.sql).toBe('SELECT COUNT(*) as count FROM "users" LEFT JOIN "profiles" ON users.id = profiles.user_id WHERE "active" = $1');
      expect(result.params).toEqual([true]);
    });
  });

  describe('buildQualifiedTableName', () => {
    it('should build schema-qualified table name', () => {
      const result = buildQualifiedTableName('tenant1', 'users');
      expect(result).toBe('"tenant1"."users"');
    });

    it('should handle special characters', () => {
      const result = buildQualifiedTableName('tenant-1', 'user_profiles');
      expect(result).toBe('"tenant-1"."user_profiles"');
    });
  });

  describe('parseSortDirection', () => {
    it('should parse valid directions', () => {
      expect(parseSortDirection('ASC')).toBe('ASC');
      expect(parseSortDirection('DESC')).toBe('DESC');
      expect(parseSortDirection('asc')).toBe('ASC');
      expect(parseSortDirection('desc')).toBe('DESC');
    });

    it('should default to ASC for invalid directions', () => {
      expect(parseSortDirection('invalid')).toBe('ASC');
      expect(parseSortDirection('')).toBe('ASC');
    });
  });

  describe('filtersToConditions', () => {
    it('should convert simple filters', () => {
      const filters = {
        name: 'John',
        age: 30,
        active: true
      };

      const result = filtersToConditions(filters);

      expect(result).toEqual([
        { field: 'name', operator: 'eq', value: 'John' },
        { field: 'age', operator: 'eq', value: 30 },
        { field: 'active', operator: 'eq', value: true }
      ]);
    });

    it('should convert complex filters', () => {
      const filters = {
        age: { gte: 18, lt: 65 },
        name: { contains: 'John' },
        status: { in: ['active', 'pending'] }
      };

      const result = filtersToConditions(filters);

      expect(result).toEqual([
        { field: 'age', operator: 'gte', value: 18 },
        { field: 'age', operator: 'lt', value: 65 },
        { field: 'name', operator: 'contains', value: 'John' },
        { field: 'status', operator: 'in', value: ['active', 'pending'] }
      ]);
    });

    it('should skip null and undefined values', () => {
      const filters = {
        name: 'John',
        age: null,
        email: undefined
      };

      const result = filtersToConditions(filters);

      expect(result).toEqual([
        { field: 'name', operator: 'eq', value: 'John' }
      ]);
    });
  });

  describe('buildSearchConditions', () => {
    it('should build search conditions', () => {
      const result = buildSearchConditions('John', ['name', 'email'], 'contains');

      expect(result).toEqual([
        { field: 'name', operator: 'contains', value: 'John' },
        { field: 'email', operator: 'contains', value: 'John' }
      ]);
    });

    it('should handle different operators', () => {
      const result = buildSearchConditions('admin', ['email'], 'startswith');

      expect(result).toEqual([
        { field: 'email', operator: 'startswith', value: 'admin' }
      ]);
    });

    it('should return empty for empty search term', () => {
      const result = buildSearchConditions('', ['name']);
      expect(result).toEqual([]);
    });

    it('should return empty for empty fields', () => {
      const result = buildSearchConditions('John', []);
      expect(result).toEqual([]);
    });

    it('should trim search term', () => {
      const result = buildSearchConditions('  John  ', ['name']);
      expect(result).toEqual([
        { field: 'name', operator: 'contains', value: 'John' }
      ]);
    });
  });

  describe('buildOrConditions', () => {
    it('should combine condition groups with OR', () => {
      const groups: QueryCondition[][] = [
        [{ field: 'name', operator: 'eq', value: 'John' }],
        [{ field: 'email', operator: 'contains', value: 'admin' }],
        [
          { field: 'age', operator: 'gte', value: 18 },
          { field: 'active', operator: 'eq', value: true }
        ]
      ];

      const result = buildOrConditions(groups);

      expect(result.sql).toBe('("name" = $1) OR ("email" ILIKE $2) OR ("age" >= $3 AND "active" = $4)');
      expect(result.params).toEqual(['John', '%admin%', 18, true]);
    });

    it('should handle empty groups', () => {
      const result = buildOrConditions([]);
      expect(result.sql).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should skip empty condition groups', () => {
      const groups: QueryCondition[][] = [
        [{ field: 'name', operator: 'eq', value: 'John' }],
        [],
        [{ field: 'active', operator: 'eq', value: true }]
      ];

      const result = buildOrConditions(groups);

      expect(result.sql).toBe('("name" = $1) OR ("active" = $2)');
      expect(result.params).toEqual(['John', true]);
    });
  });

  describe('isValidIdentifier', () => {
    it('should validate safe identifiers', () => {
      const validNames = [
        'users',
        'user_profiles',
        'UserProfiles',
        'table123',
        'a'
      ];

      validNames.forEach(name => {
        expect(isValidIdentifier(name)).toBe(true);
      });
    });

    it('should reject dangerous identifiers', () => {
      const dangerousNames = [
        'users; DROP TABLE users;',
        'users--',
        'users/*comment*/',
        'DROP TABLE users',
        'DELETE FROM users',
        'users UNION SELECT',
        '',
        123 as any,
        null as any
      ];

      dangerousNames.forEach(name => {
        expect(isValidIdentifier(name)).toBe(false);
      });
    });
  });

  describe('buildCreateTableQuery', () => {
    it('should build CREATE TABLE query', () => {
      const columns = [
        { name: 'id', type: 'SERIAL', primaryKey: true },
        { name: 'name', type: 'VARCHAR(255)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', unique: true },
        { name: 'age', type: 'INTEGER', defaultValue: 0 },
        { name: 'bio', type: 'TEXT', nullable: true }
      ];

      const result = buildCreateTableQuery('users', columns);

      expect(result).toBe('CREATE TABLE "users" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(255) NOT NULL, "email" VARCHAR(255) UNIQUE, "age" INTEGER DEFAULT 0, "bio" TEXT)');
    });

    it('should handle string default values', () => {
      const columns = [
        { name: 'status', type: 'VARCHAR(50)', defaultValue: 'active' }
      ];

      const result = buildCreateTableQuery('users', columns);

      expect(result).toBe('CREATE TABLE "users" ("status" VARCHAR(50) DEFAULT \'active\')');
    });
  });

  describe('Integration tests', () => {
    it('should work together for complex queries', () => {
      // Build a complex query with multiple features
      const filters = {
        age: { gte: 18, lt: 65 },
        status: { in: ['active', 'pending'] }
      };

      const conditions = filtersToConditions(filters);
      const searchConditions = buildSearchConditions('John', ['name', 'email']);
      const allConditionGroups = [conditions, searchConditions];
      const combinedConditions = buildOrConditions(allConditionGroups);

      const sorting: SortOption[] = [
        { field: 'name', direction: 'ASC' },
        { field: 'created_at', direction: 'DESC' }
      ];

      const pagination: PaginationOptions = { limit: 20, offset: 40 };

      // This would be used in a real query
      expect(combinedConditions.sql).toContain('OR');
      expect(buildOrderClause(sorting)).toContain('ORDER BY');
      expect(buildLimitClause(pagination)).toContain('LIMIT 20 OFFSET 40');
    });

    it('should build complete CRUD operations', () => {
      const tableName = 'users';

      // INSERT
      const insertData = { name: 'John', email: 'john@example.com' };
      const insertQuery = buildInsertQuery(tableName, insertData, ['id']);
      expect(insertQuery.sql).toContain('INSERT INTO');
      expect(insertQuery.sql).toContain('RETURNING');

      // SELECT
      const selectQuery = buildSelectQuery({
        table: tableName,
        conditions: [{ field: 'active', operator: 'eq', value: true }],
        sorting: [{ field: 'name', direction: 'ASC' }],
        pagination: { limit: 10, offset: 0 }
      });
      expect(selectQuery.sql).toContain('SELECT');
      expect(selectQuery.sql).toContain('WHERE');
      expect(selectQuery.sql).toContain('ORDER BY');
      expect(selectQuery.sql).toContain('LIMIT');

      // UPDATE
      const updateData = { name: 'Jane' };
      const updateConditions: QueryCondition[] = [{ field: 'id', operator: 'eq', value: 1 }];
      const updateQuery = buildUpdateQuery(tableName, updateData, updateConditions);
      expect(updateQuery.sql).toContain('UPDATE');
      expect(updateQuery.sql).toContain('SET');
      expect(updateQuery.sql).toContain('WHERE');

      // DELETE
      const deleteConditions: QueryCondition[] = [{ field: 'id', operator: 'eq', value: 1 }];
      const deleteQuery = buildDeleteQuery(tableName, deleteConditions);
      expect(deleteQuery.sql).toContain('DELETE FROM');
      expect(deleteQuery.sql).toContain('WHERE');

      // COUNT
      const countQuery = buildCountQuery(tableName, [{ field: 'active', operator: 'eq', value: true }]);
      expect(countQuery.sql).toContain('SELECT COUNT(*)');
      expect(countQuery.sql).toContain('WHERE');
    });
  });
});