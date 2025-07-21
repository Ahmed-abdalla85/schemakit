/**
 * InstallManager - Database installation and setup
 */
import { DatabaseAdapter } from '../database/adapter';
import { FileLoader } from '../entities/entity/file-loader';
import { SchemaKitError } from '../errors';

export class InstallManager {
  private databaseAdapter: DatabaseAdapter;

  constructor(databaseAdapter: DatabaseAdapter) {
    this.databaseAdapter = databaseAdapter;
  }

  /**
   * Check if database is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      const result = await this.databaseAdapter.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'system_entities'"
      );
      return result.length > 0 && result[0].count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Install database schema
   */
  async install(): Promise<void> {
    try {
      const schemaSql = await FileLoader.loadSchemaFile();
      await this.databaseAdapter.execute(schemaSql);

      const seedSql = await FileLoader.loadSeedFile();
      if (seedSql) {
        await this.databaseAdapter.execute(seedSql);
      }
    } catch (error) {
      throw new SchemaKitError(`Failed to install database: ${error}`);
    }
  }

  /**
   * Ensure database is ready
   */
  async ensureReady(): Promise<void> {
    if (!await this.isInstalled()) {
      await this.install();
    }
  }
} 