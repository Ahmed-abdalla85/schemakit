/**
 * TableManager
 * Responsible for database table management operations
 */
import { DatabaseAdapter } from '../database/adapter';
import { EntityConfiguration } from '../types';
import { SqlQueryLoader } from './sql-query-loader';

export class TableManager {
  private databaseAdapter: DatabaseAdapter;
  private sqlQueryLoader: SqlQueryLoader;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
    this.sqlQueryLoader = new SqlQueryLoader();
  }

  /**
   * Ensure system tables exist
   */
  async ensureSystemTables(): Promise<void> {
    const systemTables = [
      'system_entities',
      'system_fields',
      'system_permissions',
      'system_views',
      'system_workflows',
      'system_rls',
      'system_settings'
    ];

    for (const table of systemTables) {
      const exists = await this.tableExists(table);
      if (!exists) {
        await this.createSystemTable(table);
      }
    }
  }

  /**
   * Reinstall SchemaKit
   * WARNING: This will delete all system tables and recreate them
   */
  async reinstall(): Promise<void> {
    const systemTables = [
      'system_entities',
      'system_fields',
      'system_permissions',
      'system_views',
      'system_workflows',
      'system_rls',
      'system_settings'
    ];

    // Drop all system tables
    for (const table of systemTables) {
      try {
        await this.databaseAdapter.execute(`DROP TABLE IF EXISTS ${table}`);
      } catch (e) {
        console.error(`Error dropping table ${table}:`, e);
      }
    }

    // Recreate system tables
    await this.ensureSystemTables();

    // Set version
    await this.databaseAdapter.execute(
      'INSERT INTO system_settings (key, value) VALUES (?, ?)',
      ['version', '1.0.0']
    );
  }

  /**
   * Ensure entity table exists
   * @param entityConfig Entity configuration
   */
  async ensureEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    
    const exists = await this.databaseAdapter.tableExists(tableName);
    if (!exists) {
      await this.createEntityTable(entityConfig);
    } else {
      // Check if table needs to be updated with new fields
      await this.updateEntityTable(entityConfig);
    }
  }

  /**
   * Create entity table
   * @param entityConfig Entity configuration
   */
  async createEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    
    // Build column definitions
    const columns = entityConfig.fields.map((field: any) => ({
      name: field.name,
      type: this.getSqlType(field.type),
      primaryKey: field.name === 'id',
      notNull: field.is_required || field.name === 'id',
      unique: field.is_unique,
      default: field.default_value
    }));

    // Add system columns
    columns.push(
      { name: 'created_at', type: 'DATETIME', primaryKey: false, notNull: true, unique: false, default: undefined },
      { name: 'updated_at', type: 'DATETIME', primaryKey: false, notNull: true, unique: false, default: undefined },
      { name: 'created_by', type: 'VARCHAR(255)', primaryKey: false, notNull: false, unique: false, default: undefined },
      { name: 'updated_by', type: 'VARCHAR(255)', primaryKey: false, notNull: false, unique: false, default: undefined }
    );

    await this.databaseAdapter.createTable(tableName, columns);
  }

  /**
   * Update entity table with new fields
   * @param entityConfig Entity configuration
   */
  async updateEntityTable(entityConfig: EntityConfiguration): Promise<void> {
    const tableName = entityConfig.entity.table_name;
    
    // Get existing columns
    const existingColumns = await this.databaseAdapter.getTableColumns(tableName);
    const existingColumnNames = new Set(existingColumns.map(col => col.name));
    
    // Find new fields that need to be added
    const newFields = entityConfig.fields.filter((field: any) => !existingColumnNames.has(field.name));
    
    if (newFields.length > 0) {
      // Add new columns one by one
      for (const field of newFields) {
        // Note: This is a simplified approach. In a real implementation,
        // you'd want to use ALTER TABLE ADD COLUMN statements
        console.log(`Would add column ${field.name} to table ${tableName}`, {
          type: this.getSqlType(field.type),
          notNull: field.is_required,
          unique: field.is_unique,
          default: field.default_value
        });
      }
    }
  }

  /**
   * Check if a table exists
   * @param tableName Table name
   * @returns True if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const sql = await this.sqlQueryLoader.loadQuery('check-table-exists');
      const result = await this.databaseAdapter.query<{ count: number }>(sql, ['table', tableName]);
      return result.length > 0 && result[0].count > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get SQL type for field type
   * @param fieldType Field type
   * @returns SQL type
   */
  private getSqlType(fieldType: string): string {
    switch (fieldType) {
      case 'string':
      case 'email':
      case 'url':
      case 'text':
      case 'uuid':
        return 'VARCHAR(255)';
      case 'number':
        return 'DECIMAL(10,2)';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'datetime':
        return 'DATETIME';
      default:
        return 'VARCHAR(255)';
    }
  }

  /**
   * Create a system table (using external SQL files)
   * @param tableName Table name
   */
  private async createSystemTable(tableName: string): Promise<void> {
    try {
      // Try to load table creation SQL from external file
      const sql = await this.sqlQueryLoader.loadQuery(`create-${tableName}`);
      await this.databaseAdapter.execute(sql);
    } catch (error) {
      // Fallback to inline SQL for now (could be moved to external files later)
      const sql = this.getSystemTableSQL(tableName);
      await this.databaseAdapter.execute(sql);
    }
  }

  /**
   * Get system table SQL (fallback)
   * @param tableName Table name
   * @returns SQL string
   */
  private getSystemTableSQL(tableName: string): string {
    switch (tableName) {
      case 'system_entities':
        return `
          CREATE TABLE system_entities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            display_name TEXT,
            description TEXT,
            metadata TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
          )
        `;

      case 'system_fields':
        return `
          CREATE TABLE system_fields (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            type TEXT NOT NULL,
            is_required INTEGER DEFAULT 0,
            is_unique INTEGER DEFAULT 0,
            is_primary_key INTEGER DEFAULT 0,
            is_system INTEGER DEFAULT 0,
            default_value TEXT,
            validation TEXT,
            metadata TEXT,
            order_index INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;

      case 'system_permissions':
        return `
          CREATE TABLE system_permissions (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            role TEXT NOT NULL,
            action TEXT NOT NULL,
            conditions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;

      case 'system_views':
        return `
          CREATE TABLE system_views (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            query TEXT,
            params TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;

      case 'system_workflows':
        return `
          CREATE TABLE system_workflows (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            triggers TEXT,
            conditions TEXT,
            actions TEXT,
            order_index INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;

      case 'system_rls':
        return `
          CREATE TABLE system_rls (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            role TEXT NOT NULL,
            conditions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (entity_id) REFERENCES system_entities (id)
          )
        `;

      case 'system_settings':
        return `
          CREATE TABLE system_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            created_at TEXT,
            updated_at TEXT
          )
        `;

      default:
        throw new Error(`Unknown system table: ${tableName}`);
    }
  }
}