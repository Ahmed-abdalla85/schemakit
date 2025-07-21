/**
 * Database Usage Examples - CodeIgniter Style
 * 
 * This file demonstrates how to use the new fluent database interface
 * with DatabaseManager as the main gateway.
 */

import { EntityManager } from '../src/core/entity-manager';
import { DatabaseManager, DatabaseConfig } from '../src/database/database-manager';

export class DatabaseUsageExamples {
  private databaseManager: DatabaseManager;
  private entityManager: EntityManager;

  constructor(config: DatabaseConfig) {
    // DatabaseManager is now the main gateway for all database operations
    this.databaseManager = new DatabaseManager(config);
    this.entityManager = new EntityManager(this.databaseManager);
  }

  async initialize() {
    // Initialize database connection
    await this.databaseManager.connect();
    
    // Ensure system tables exist (do this once during app startup)
    await this.entityManager.ensureSystemTables();
  }

  async examples() {
    // === OLD APPROACH (removed) ===
    // const { sql, params } = this.queryManager.buildInsertQuery(tableName, tenantId, data);
    // const result = await this.databaseAdapter.execute(sql, params);

    // === NEW CODEIGNITER-STYLE APPROACH ===

    // Can use either EntityManager or DatabaseManager for fluent queries
    
    // 1. Simple Insert (via EntityManager)
    const user = await this.entityManager.db('users')
      .insert({
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active'
      });

    // 1b. Simple Insert (via DatabaseManager directly)
    const user2 = await this.databaseManager.db('users')
      .insert({
        name: 'Jane Doe',
        email: 'jane@example.com',
        status: 'active'
      });

    // 2. Select with conditions
    const activeUsers = await this.databaseManager.db('users')
      .where('status', 'active')
      .where('created_at', '>', '2024-01-01')
      .orderBy('name', 'ASC')
      .limit(10)
      .get();

    // 3. Select specific fields
    const userNames = await this.entityManager.db('users')
      .select(['id', 'name', 'email'])
      .where('status', 'active')
      .get();

    // 4. Find single record
    const firstUser = await this.entityManager.db('users')
      .where('email', 'john@example.com')
      .first();

    // 5. Using IN clause
    const specificUsers = await this.entityManager.db('users')
      .whereIn('id', [1, 2, 3, 4, 5])
      .get();

    // 6. Using LIKE for search
    const searchResults = await this.entityManager.db('users')
      .whereLike('name', 'John')
      .get();

    // 7. Complex conditions
    const complexQuery = await this.entityManager.db('orders')
      .select(['id', 'total', 'status'])
      .where('status', 'completed')
      .where('total', '>', 100)
      .where('created_at', '>=', '2024-01-01')
      .orderBy('created_at', 'DESC')
      .limit(20, 0) // limit with offset
      .get();

    // 8. Update records
    const updateResult = await this.entityManager.db('users')
      .where('id', 123)
      .update({
        last_login: new Date().toISOString(),
        status: 'active'
      });

    // 9. Delete records
    const deleteResult = await this.entityManager.db('users')
      .where('status', 'inactive')
      .where('last_login', '<', '2023-01-01')
      .delete();

    // 10. Count records
    const userCount = await this.entityManager.db('users')
      .where('status', 'active')
      .count();

    // 11. Working with different tables
    const posts = await this.entityManager.table('blog_posts')
      .where('published', true)
      .orderBy('created_at', 'DESC')
      .limit(5)
      .get();

    // 12. With tenant context
    const tenantUsers = await this.entityManager.db('users', 'tenant_123')
      .where('role', 'admin')
      .get();

    // === DATABASE MANAGER SPECIFIC FEATURES ===

    // Transaction support
    const transactionResult = await this.databaseManager.transaction(async () => {
      const newUser = await this.databaseManager.db('users').insert({
        name: 'Transaction User',
        email: 'transaction@example.com'
      });
      
      await this.databaseManager.db('user_profiles').insert({
        user_id: newUser.lastInsertId,
        bio: 'Created in transaction'
      });
      
      return newUser;
    });

    // Raw queries
    const rawResult = await this.databaseManager.query(
      'SELECT COUNT(*) as total FROM users WHERE created_at > ?',
      ['2024-01-01']
    );

    // Database introspection
    const tables = await this.databaseManager.listTables();
    const userTableInfo = await this.databaseManager.getTableInfo('users');
    const connectionInfo = this.databaseManager.getConnectionInfo();

    return {
      user,
      user2,
      activeUsers,
      userNames,
      firstUser,
      specificUsers,
      searchResults,
      complexQuery,
      updateResult,
      deleteResult,
      userCount,
      posts,
      tenantUsers,
      transactionResult,
      rawResult,
      tables,
      userTableInfo,
      connectionInfo
    };
  }

  /**
   * Comparison: Before vs After
   */
  async comparisonExample() {
    // === BEFORE (Old QueryManager approach) ===
    /*
    const { sql, params } = this.queryManager.buildSelectQuery(
      'users', 
      'default', 
      [
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'created_at', operator: '>', value: '2024-01-01' }
      ],
      {
        sort: [{ field: 'name', direction: 'ASC' }],
        limit: 10
      }
    );
    const result = await this.databaseAdapter.query(sql, params);
    */

    // === AFTER (New CodeIgniter-style approach) ===
    const result = await this.entityManager.db('users')
      .where('status', 'active')
      .where('created_at', '>', '2024-01-01')
      .orderBy('name', 'ASC')
      .limit(10)
      .get();

    return result;
  }

  /**
   * Entity-level operations (high-level API)
   */
  async entityLevelExamples() {
    // The entity-level operations now use the fluent interface internally
    // but still provide the high-level abstraction for business logic
    
    const entityConfig = await this.entityManager.loadEntity('users');
    
    // These methods now use the fluent interface internally
    const newUser = await this.entityManager.create(entityConfig, {
      name: 'Jane Doe',
      email: 'jane@example.com'
    });

    const user = await this.entityManager.findById(entityConfig, newUser.id);
    
    const updatedUser = await this.entityManager.update(entityConfig, newUser.id, {
      status: 'verified'
    });

    const users = await this.entityManager.find(entityConfig, [
      { field: 'status', value: 'active' }
    ]);

    return { newUser, user, updatedUser, users };
  }
}