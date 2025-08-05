/**
 * InstallManager - Database installation and setup
 * Simplified to handle all installation logic without external dependencies
 */
import { DatabaseAdapter } from '../database/adapter';
import { SchemaKitError } from '../errors';
import { readFileSync } from 'fs';
import { join } from 'path';

export class InstallManager {
  private databaseAdapter: DatabaseAdapter;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
  }

  /**
   * Check if database is installed
   * Uses DatabaseAdapter's tableExists method for cross-database compatibility
   */
  async isInstalled(): Promise<boolean> {
    try {
      return await this.databaseAdapter.tableExists('system_entities');
    } catch (error) {
      return false;
    }
  }

  /**
   * Load SQL file from sql directory
   * @param filename - Name of the SQL file (e.g., 'schema.sql', 'seed.sql')
   * @returns File content or null if file doesn't exist
   */
  private async loadSqlFile(filename: string): Promise<string | null> {
    try {
      const filePath = join(process.cwd(), 'sql', filename);
      return readFileSync(filePath, 'utf8');
    } catch (error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Execute SQL with proper statement splitting
   * Handles multi-line statements and comments
   */
  private async executeSql(sql: string): Promise<void> {
    // Split SQL into individual statements
    const statements = this.splitSqlStatements(sql);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await this.databaseAdapter.execute(statement);
      }
    }
  }

  /**
   * Split SQL script into individual statements
   * Removes comments and handles multi-line statements
   */
  private splitSqlStatements(sql: string): string[] {
    // Remove comments and split by semicolons
    const cleaned = sql
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    
    return cleaned
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
  }

  /**
   * Install database schema and seed data
   * Loads and executes schema.sql, then seed.sql if available
   */
  async install(): Promise<void> {
    try {
      // Load and execute schema - this is required
      const schemaSql = await this.loadSqlFile('schema.sql');
      if (!schemaSql) {
        throw new SchemaKitError('schema.sql file not found in sql/ directory');
      }
      
      await this.executeSql(schemaSql);

      // Load and execute seed data - this is optional
      const seedSql = await this.loadSqlFile('seed.sql');
      if (seedSql) {
        await this.executeSql(seedSql);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new SchemaKitError(`Failed to install database: ${message}`, {
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Ensure database is ready for use
   * Installs schema if not already installed
   */
  async ensureReady(): Promise<void> {
    if (!await this.isInstalled()) {
      await this.install();
    }
  }
} 