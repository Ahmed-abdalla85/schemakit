/**
 * SchemaLoader
 * Handles loading of schema and seed files
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export class SchemaLoader {
  /**
   * Load schema file
   */
  static async loadSchemaFile(): Promise<string> {
    try {
      // Try to load from sql/schema.sql
      const schemaPath = join(process.cwd(), 'sql', 'schema.sql');
      return readFileSync(schemaPath, 'utf8');
    } catch (error) {
      // Fallback to embedded schema
      return this.getEmbeddedSchema();
    }
  }

  /**
   * Load seed file
   */
  static async loadSeedFile(): Promise<string | null> {
    try {
      const seedPath = join(process.cwd(), 'sql', 'seed.sql');
      return readFileSync(seedPath, 'utf8');
    } catch {
      return null; // Seed file is optional
    }
  }

  /**
   * Get embedded schema (fallback)
   */
  private static getEmbeddedSchema(): string {
    return `
      -- Basic system tables
      CREATE TABLE IF NOT EXISTS system_entities (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL UNIQUE,
          table_name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS system_fields (
          id TEXT PRIMARY KEY NOT NULL,
          entity_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          is_required BOOLEAN NOT NULL DEFAULT 0,
          is_unique BOOLEAN NOT NULL DEFAULT 0,
          default_value TEXT,
          validation_rules TEXT,
          display_name TEXT NOT NULL,
          description TEXT,
          order_index INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          reference_entity TEXT,
          metadata TEXT,
          FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS system_permissions (
          id TEXT PRIMARY KEY NOT NULL,
          entity_id TEXT NOT NULL,
          role TEXT NOT NULL,
          action TEXT NOT NULL,
          conditions TEXT,
          is_allowed BOOLEAN NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          field_permissions TEXT,
          FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS system_workflows (
          id TEXT PRIMARY KEY NOT NULL,
          entity_id TEXT NOT NULL,
          name TEXT NOT NULL,
          trigger_event TEXT NOT NULL,
          conditions TEXT,
          actions TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          order_index INTEGER NOT NULL DEFAULT 0,
          metadata TEXT,
          FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS system_rls (
          id TEXT PRIMARY KEY NOT NULL,
          entity_id TEXT NOT NULL,
          role TEXT NOT NULL,
          view_id TEXT,
          rls_config TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_system_fields_entity_id ON system_fields(entity_id);
      CREATE INDEX IF NOT EXISTS idx_system_permissions_entity_id ON system_permissions(entity_id);
      CREATE INDEX IF NOT EXISTS idx_system_workflows_entity_id ON system_workflows(entity_id);
      CREATE INDEX IF NOT EXISTS idx_system_rls_entity_id ON system_rls(entity_id);
    `;
  }
}