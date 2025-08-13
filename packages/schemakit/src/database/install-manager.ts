/**
 * InstallManager - Database installation and setup (ORM-first)
 * Creates core system tables and seeds minimal data using the adapter APIs.
 */
import { DatabaseAdapter, type ColumnDefinition } from '../database/adapter';
import { SchemaKitError } from '../errors';

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

  /** Create all required system tables using the adapter ORM */
  private async createSystemTables(): Promise<void> {
    // system_entities
    const entitiesColumns: ColumnDefinition[] = [
      { name: 'entity_id', type: 'uuid', primaryKey: true, notNull: true },
      { name: 'entity_tenant_id', type: 'string' },
      { name: 'entity_status', type: 'string', default: 'active' },
      { name: 'entity_weight', type: 'integer', default: 0 },
      { name: 'entity_created_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'entity_created_by', type: 'string' },
      { name: 'entity_modified_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'entity_modified_by', type: 'string' },
      { name: 'entity_name', type: 'string', notNull: true, unique: true },
      { name: 'entity_table_name', type: 'string', notNull: true },
      { name: 'entity_display_name', type: 'string', notNull: true },
      { name: 'entity_description', type: 'text' },
      { name: 'entity_metadata', type: 'text' },
    ];
    await this.databaseAdapter.createTable('system_entities', entitiesColumns);

    // system_fields
    const fieldsColumns: ColumnDefinition[] = [
      { name: 'field_id', type: 'uuid', primaryKey: true, notNull: true },
      { name: 'field_tenant_id', type: 'string' },
      { name: 'field_status', type: 'string', default: 'active' },
      { name: 'field_weight', type: 'integer', default: 0 },
      { name: 'field_created_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'field_created_by', type: 'string' },
      { name: 'field_modified_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'field_modified_by', type: 'string' },
      { name: 'field_entity_id', type: 'string', notNull: true, references: { table: 'system_entities', column: 'entity_id', onDelete: 'CASCADE' } },
      { name: 'field_name', type: 'string', notNull: true },
      { name: 'field_type', type: 'string', notNull: true },
      { name: 'field_is_required', type: 'boolean', notNull: true, default: false },
      { name: 'field_is_unique', type: 'boolean', notNull: true, default: false },
      { name: 'field_default_value', type: 'text' },
      { name: 'field_validation_rules', type: 'text' },
      { name: 'field_display_name', type: 'string', notNull: true },
      { name: 'field_description', type: 'text' },
      { name: 'field_order_index', type: 'integer', notNull: true, default: 0 },
      { name: 'field_reference_entity', type: 'string' },
      { name: 'field_metadata', type: 'text' },
    ];
    await this.databaseAdapter.createTable('system_fields', fieldsColumns);

    // system_permissions
    const permissionsColumns: ColumnDefinition[] = [
      { name: 'permission_id', type: 'uuid', primaryKey: true, notNull: true },
      { name: 'permission_tenant_id', type: 'string' },
      { name: 'permission_status', type: 'string', default: 'active' },
      { name: 'permission_weight', type: 'integer', default: 0 },
      { name: 'permission_created_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'permission_created_by', type: 'string' },
      { name: 'permission_modified_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'permission_modified_by', type: 'string' },
      { name: 'permission_entity_id', type: 'string', notNull: true, references: { table: 'system_entities', column: 'entity_id', onDelete: 'CASCADE' } },
      { name: 'permission_role', type: 'string', notNull: true },
      { name: 'permission_action', type: 'string', notNull: true },
      { name: 'permission_conditions', type: 'text' },
      { name: 'permission_is_allowed', type: 'boolean', notNull: true, default: true },
      { name: 'permission_field_permissions', type: 'text' },
    ];
    await this.databaseAdapter.createTable('system_permissions', permissionsColumns);

    // system_views
    const viewsColumns: ColumnDefinition[] = [
      { name: 'view_id', type: 'uuid', primaryKey: true, notNull: true },
      { name: 'view_tenant_id', type: 'string' },
      { name: 'view_status', type: 'string', default: 'active' },
      { name: 'view_weight', type: 'integer', default: 0 },
      { name: 'view_created_at', type: 'datetime', default: "CURRENT_TIMESTAMP" },
      { name: 'view_created_by', type: 'string' },
      { name: 'view_modified_at', type: 'datetime', default: "CURRENT_TIMESTAMP" },
      { name: 'view_modified_by', type: 'string' },
      { name: 'view_slot', type: 'integer', default: 0 },
      { name: 'view_entity_id', type: 'string', notNull: true, references: { table: 'system_entities', column: 'entity_id', onDelete: 'CASCADE' } },
      { name: 'view_name', type: 'string', notNull: true },
      { name: 'view_fields', type: 'text' },
      { name: 'view_filters', type: 'text' },
      { name: 'view_joins', type: 'text' },
      { name: 'view_sort', type: 'text' },
      { name: 'view_title', type: 'string' },
    ];
    await this.databaseAdapter.createTable('system_views', viewsColumns);

    // system_workflows
    const workflowsColumns: ColumnDefinition[] = [
      { name: 'workflow_id', type: 'uuid', primaryKey: true, notNull: true },
      { name: 'workflow_tenant_id', type: 'string' },
      { name: 'workflow_status', type: 'string', default: 'active' },
      { name: 'workflow_weight', type: 'integer', default: 0 },
      { name: 'workflow_created_at', type: 'datetime', default: "CURRENT_TIMESTAMP" },
      { name: 'workflow_created_by', type: 'string' },
      { name: 'workflow_modified_at', type: 'datetime', default: "CURRENT_TIMESTAMP" },
      { name: 'workflow_modified_by', type: 'string' },
      { name: 'workflow_entity_id', type: 'string', notNull: true, references: { table: 'system_entities', column: 'entity_id', onDelete: 'CASCADE' } },
      { name: 'workflow_name', type: 'string', notNull: true },
      { name: 'workflow_trigger_event', type: 'string', notNull: true },
      { name: 'workflow_conditions', type: 'text' },
      { name: 'workflow_actions', type: 'text', notNull: true },
      { name: 'workflow_metadata', type: 'text' },
    ];
    await this.databaseAdapter.createTable('system_workflows', workflowsColumns);

    // system_rls
    const rlsColumns: ColumnDefinition[] = [
      { name: 'rls_id', type: 'uuid', primaryKey: true, notNull: true },
      { name: 'rls_tenant_id', type: 'string' },
      { name: 'rls_status', type: 'string', default: 'active' },
      { name: 'rls_weight', type: 'integer', default: 0 },
      { name: 'rls_created_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'rls_created_by', type: 'string' },
      { name: 'rls_modified_at', type: 'datetime', notNull: true, default: "CURRENT_TIMESTAMP" },
      { name: 'rls_modified_by', type: 'string' },
      { name: 'rls_entity_id', type: 'string', notNull: true, references: { table: 'system_entities', column: 'entity_id', onDelete: 'CASCADE' } },
      { name: 'rls_role', type: 'string', notNull: true },
      { name: 'rls_view_id', type: 'string' },
      { name: 'rls_config', type: 'text', notNull: true },
    ];
    await this.databaseAdapter.createTable('system_rls', rlsColumns);
  }

  /** Seed minimal system entities */
  private async seedSystemData(): Promise<void> {
    const entities = [
      { entity_id: 'system_entities', entity_name: 'system_entities', entity_table_name: 'system_entities', entity_display_name: 'System Entities', entity_is_active: true, entity_created_at: new Date().toISOString(), entity_updated_at: new Date().toISOString() },
      { entity_id: 'system_fields', entity_name: 'system_fields', entity_table_name: 'system_fields', entity_display_name: 'System Fields', entity_is_active: true, entity_created_at: new Date().toISOString(), entity_updated_at: new Date().toISOString() },
      { entity_id: 'system_permissions', entity_name: 'system_permissions', entity_table_name: 'system_permissions', entity_display_name: 'System Permissions', entity_is_active: true, entity_created_at: new Date().toISOString(), entity_updated_at: new Date().toISOString() },
      { entity_id: 'system_views', entity_name: 'system_views', entity_table_name: 'system_views', entity_display_name: 'System Views', entity_is_active: true, entity_created_at: new Date().toISOString(), entity_updated_at: new Date().toISOString() },
      { entity_id: 'system_workflows', entity_name: 'system_workflows', entity_table_name: 'system_workflows', entity_display_name: 'System Workflows', entity_is_active: true, entity_created_at: new Date().toISOString(), entity_updated_at: new Date().toISOString() },
      { entity_id: 'system_rls', entity_name: 'system_rls', entity_table_name: 'system_rls', entity_display_name: 'System RLS', entity_is_active: true, entity_created_at: new Date().toISOString(), entity_updated_at: new Date().toISOString() },
    ];
    for (const rec of entities) {
      await this.databaseAdapter.insert('system_entities', rec);
    }
  }

  /**
   * Install database schema and seed data using adapter APIs
   */
  async install(): Promise<void> {
    try {
      await this.createSystemTables();
      await this.seedSystemData();
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