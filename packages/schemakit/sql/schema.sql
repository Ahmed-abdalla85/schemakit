-- SchemaKit System Tables Schema
-- This file defines the core system tables for SchemaKit

-- System entities table - stores entity definitions
CREATE TABLE IF NOT EXISTS system_entities (
    entity_id TEXT PRIMARY KEY NOT NULL,
    entity_name TEXT NOT NULL UNIQUE,
    entity_table_name TEXT NOT NULL,
    entity_display_name TEXT NOT NULL,
    entity_description TEXT,
    entity_is_active BOOLEAN NOT NULL DEFAULT 1,
    entity_created_at TEXT NOT NULL,
    entity_updated_at TEXT NOT NULL,
    entity_metadata TEXT -- JSON string
);

-- System fields table - stores field definitions for entities
CREATE TABLE IF NOT EXISTS system_fields (
    field_id TEXT PRIMARY KEY NOT NULL,
    field_entity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    field_is_required BOOLEAN NOT NULL DEFAULT 0,
    field_is_unique BOOLEAN NOT NULL DEFAULT 0,
    field_default_value TEXT,
    field_validation_rules TEXT, -- JSON string
    field_display_name TEXT NOT NULL,
    field_description TEXT,
    field_order_index INTEGER NOT NULL DEFAULT 0,
    field_is_active BOOLEAN NOT NULL DEFAULT 1,
    field_reference_entity TEXT,
    field_metadata TEXT, -- JSON string
    FOREIGN KEY (field_entity_id) REFERENCES system_entities(entity_id) ON DELETE CASCADE
);

-- System permissions table - stores permission rules
CREATE TABLE IF NOT EXISTS system_permissions (
    permission_id TEXT PRIMARY KEY NOT NULL,
    permission_entity_id TEXT NOT NULL,
    permission_role TEXT NOT NULL,
    permission_action TEXT NOT NULL,
    permission_conditions TEXT, -- JSON string
    permission_is_allowed BOOLEAN NOT NULL DEFAULT 1,
    permission_is_active BOOLEAN NOT NULL DEFAULT 1,
    permission_created_at TEXT NOT NULL,
    permission_field_permissions TEXT, -- JSON string
    FOREIGN KEY (permission_entity_id) REFERENCES system_entities(entity_id) ON DELETE CASCADE
);

-- System views table - stores view definitions
CREATE TABLE IF NOT EXISTS system_views (
    view_id TEXT PRIMARY KEY NOT NULL,
    view_entity_id TEXT NOT NULL,
    view_name TEXT NOT NULL,
    view_query_config TEXT NOT NULL, -- JSON string
    view_fields TEXT NOT NULL, -- JSON string array
    view_is_default BOOLEAN NOT NULL DEFAULT 0,
    view_created_by TEXT,
    view_is_public BOOLEAN NOT NULL DEFAULT 0,
    view_metadata TEXT, -- JSON string
    FOREIGN KEY (view_entity_id) REFERENCES system_entities(entity_id) ON DELETE CASCADE
);

-- System workflows table - stores workflow definitions
CREATE TABLE IF NOT EXISTS system_workflows (
    workflow_id TEXT PRIMARY KEY NOT NULL,
    workflow_entity_id TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    workflow_trigger_event TEXT NOT NULL,
    workflow_conditions TEXT, -- JSON string
    workflow_actions TEXT NOT NULL, -- JSON string array
    workflow_is_active BOOLEAN NOT NULL DEFAULT 1,
    workflow_order_index INTEGER NOT NULL DEFAULT 0,
    workflow_metadata TEXT, -- JSON string
    FOREIGN KEY (workflow_entity_id) REFERENCES system_entities(entity_id) ON DELETE CASCADE
);

-- System RLS (Row Level Security) table - stores RLS rules
CREATE TABLE IF NOT EXISTS system_rls (
    rls_id TEXT PRIMARY KEY NOT NULL,
    rls_entity_id TEXT NOT NULL,
    rls_role TEXT NOT NULL,
    rls_view_id TEXT,
    rls_config TEXT NOT NULL, -- JSON string
    rls_is_active BOOLEAN NOT NULL DEFAULT 1,
    rls_created_at TEXT NOT NULL,
    rls_updated_at TEXT NOT NULL,
    FOREIGN KEY (rls_entity_id) REFERENCES system_entities(entity_id) ON DELETE CASCADE
);


-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_fields_entity_id ON system_fields(field_entity_id);
CREATE INDEX IF NOT EXISTS idx_system_fields_active ON system_fields(field_is_active);
CREATE INDEX IF NOT EXISTS idx_system_permissions_entity_id ON system_permissions(permission_entity_id);
CREATE INDEX IF NOT EXISTS idx_system_permissions_role ON system_permissions(permission_role);
CREATE INDEX IF NOT EXISTS idx_system_views_entity_id ON system_views(view_entity_id);
CREATE INDEX IF NOT EXISTS idx_system_workflows_entity_id ON system_workflows(workflow_entity_id);
CREATE INDEX IF NOT EXISTS idx_system_workflows_active ON system_workflows(workflow_is_active);
CREATE INDEX IF NOT EXISTS idx_system_rls_entity_id ON system_rls(rls_entity_id);
CREATE INDEX IF NOT EXISTS idx_system_rls_role ON system_rls(rls_role);
CREATE INDEX IF NOT EXISTS idx_system_entities_active ON system_entities(entity_is_active);
CREATE INDEX IF NOT EXISTS idx_system_entities_name ON system_entities(entity_name);