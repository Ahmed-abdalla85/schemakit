import { SqlBuilder } from '../../src/database/adapters/drizzle';

describe('DrizzleAdapter SqlBuilder', () => {
  describe('quoteIdent', () => {
    test('quotes and validates identifiers for postgres/sqlite', () => {
      expect(SqlBuilder.quoteIdent('users', 'postgres')).toBe('"users"');
      expect(SqlBuilder.quoteIdent('users', 'sqlite')).toBe('"users"');
    });
    test('quotes and validates identifiers for mysql', () => {
      expect(SqlBuilder.quoteIdent('users', 'mysql')).toBe('`users`');
    });
    test('throws on invalid identifier', () => {
      expect(() => SqlBuilder.quoteIdent('users;drop', 'postgres')).toThrow();
      expect(() => SqlBuilder.quoteIdent('user name', 'mysql')).toThrow();
    });
  });

  describe('buildWhere', () => {
    test('handles simple operators with placeholders', () => {
      const { clause, params } = SqlBuilder.buildWhere([
        { field: 'age', operator: 'gte', value: 18 },
        { field: 'status', operator: 'eq', value: 'active' },
      ], 'sqlite');
      expect(clause).toBe('WHERE "age" >= ? AND "status" = ?');
      expect(params).toEqual([18, 'active']);
    });

    test('handles contains/startswith/endswith as LIKE with patterns', () => {
      const { clause, params } = SqlBuilder.buildWhere([
        { field: 'name', operator: 'contains', value: 'oh' },
        { field: 'email', operator: 'startswith', value: 'john' },
        { field: 'email', operator: 'endswith', value: '.com' },
      ], 'postgres');
      expect(clause).toBe('WHERE "name" LIKE $1 AND "email" LIKE $2 AND "email" LIKE $3');
      expect(params).toEqual(['%oh%', 'john%', '%.com']);
    });

    test('handles IN and NOT IN with array expansion', () => {
      const { clause, params } = SqlBuilder.buildWhere([
        { field: 'id', operator: 'in', value: [1, 2, 3] },
        { field: 'role', operator: 'nin', value: ['guest', 'blocked'] },
      ], 'postgres');
      expect(clause).toBe('WHERE "id" IN ($1, $2, $3) AND "role" NOT IN ($4, $5)');
      expect(params).toEqual([1, 2, 3, 'guest', 'blocked']);
    });

    test('handles empty IN and NOT IN gracefully', () => {
      const inEmpty = SqlBuilder.buildWhere([{ field: 'id', operator: 'in', value: [] }], 'sqlite');
      expect(inEmpty.clause).toBe('WHERE 1=0');
      const ninEmpty = SqlBuilder.buildWhere([{ field: 'role', operator: 'nin', value: [] }], 'sqlite');
      expect(ninEmpty.clause).toBe('WHERE 1=1');
    });
  });

  describe('buildOrderBy', () => {
    test('supports direction and dir keys', () => {
      const s1 = SqlBuilder.buildOrderBy([{ field: 'name', direction: 'ASC' }], 'mysql');
      expect(s1).toBe('ORDER BY `name` ASC');
      const s2 = SqlBuilder.buildOrderBy([{ field: 'age', dir: 'DESC' } as any], 'postgres');
      expect(s2).toBe('ORDER BY "age" DESC');
    });
  });

  describe('buildSelect/Insert/Update/Delete/Count', () => {
    test('buildSelect combines where/order/pagination', () => {
      const { sql, params } = SqlBuilder.buildSelect(
        'users',
        [{ field: 'status', operator: 'eq', value: 'active' }],
        { orderBy: [{ field: 'name', direction: 'ASC' }], limit: 10, offset: 5 },
        'sqlite'
      );
      expect(sql).toBe('SELECT * FROM "users" WHERE "status" = ? ORDER BY "name" ASC LIMIT 10 OFFSET 5');
      expect(params).toEqual(['active']);
    });

    test('buildInsert uses quoted identifiers and param list', () => {
      const { sql, params } = SqlBuilder.buildInsert('users', { name: 'John', age: 30 }, 'postgres');
      expect(sql).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
      expect(params).toEqual(['John', 30]);
    });

    test('buildUpdate builds set list and id predicate', () => {
      const { sql, params } = SqlBuilder.buildUpdate('users', 7, { name: 'J', age: 20 }, 'mysql');
      expect(sql).toBe('UPDATE `users` SET `name` = ?, `age` = ? WHERE `id` = ?');
      expect(params).toEqual(['J', 20, 7]);
    });

    test('buildDelete builds id predicate', () => {
      const { sql, params } = SqlBuilder.buildDelete('users', 9, 'sqlite');
      expect(sql).toBe('DELETE FROM "users" WHERE "id" = ?');
      expect(params).toEqual([9]);
    });

    test('buildCount builds where and count', () => {
      const { sql, params } = SqlBuilder.buildCount('users', [{ field: 'role', operator: 'eq', value: 'admin' }], 'postgres');
      expect(sql).toBe('SELECT COUNT(*) as count FROM "users" WHERE "role" = $1');
      expect(params).toEqual(['admin']);
    });
  });
});


