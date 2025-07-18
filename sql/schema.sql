-- SchemaKit System Tables Schema
-- This file defines the core system tables for SchemaKit

-- System entities table - stores entity definitions
CREATE TABLE IF NOT EXISTS system_entities (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    table_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    metadata TEXT -- JSON string
);

-- System fields table - stores field definitions for entities
CREATE TABLE IF NOT EXISTS system_fields (
    id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT 0,
    is_unique BOOLEAN NOT NULL DEFAULT 0,
    default_value TEXT,
    validation_rules TEXT, -- JSON string
    display_name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    reference_entity TEXT,
    metadata TEXT, -- JSON string
    FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
);

-- System permissions table - stores permission rules
CREATE TABLE IF NOT EXISTS system_permissions (
    id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    conditions TEXT, -- JSON string
    is_allowed BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    field_permissions TEXT, -- JSON string
    FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
);

-- System views table - stores view definitions
CREATE TABLE IF NOT EXISTS system_views (
    id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    query_config TEXT NOT NULL, -- JSON string
    fields TEXT NOT NULL, -- JSON string array
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_by TEXT,
    is_public BOOLEAN NOT NULL DEFAULT 0,
    metadata TEXT, -- JSON string
    FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
);

-- System workflows table - stores workflow definitions
CREATE TABLE IF NOT EXISTS system_workflows (
    id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    conditions TEXT, -- JSON string
    actions TEXT NOT NULL, -- JSON string array
    is_active BOOLEAN NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    metadata TEXT, -- JSON string
    FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
);

-- System RLS (Row Level Security) table - stores RLS rules
CREATE TABLE IF NOT EXISTS system_rls (
    id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    role TEXT NOT NULL,
    view_id TEXT,
    rls_config TEXT NOT NULL, -- JSON string
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES system_entities(id) ON DELETE CASCADE
);

-- System installation table - tracks SchemaKit installation and version
CREATE TABLE IF NOT EXISTS system_installation (
    id INTEGER PRIMARY KEY,
    version TEXT NOT NULL,
    installed_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    metadata TEXT -- JSON string for additional info
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_fields_entity_id ON system_fields(entity_id);
CREATE INDEX IF NOT EXISTS idx_system_fields_active ON system_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_system_permissions_entity_id ON system_permissions(entity_id);
CREATE INDEX IF NOT EXISTS idx_system_permissions_role ON system_permissions(role);
CREATE INDEX IF NOT EXISTS idx_system_views_entity_id ON system_views(entity_id);
CREATE INDEX IF NOT EXISTS idx_system_workflows_entity_id ON system_workflows(entity_id);
CREATE INDEX IF NOT EXISTS idx_system_workflows_active ON system_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_system_rls_entity_id ON system_rls(entity_id);
CREATE INDEX IF NOT EXISTS idx_system_rls_role ON system_rls(role);
CREATE INDEX IF NOT EXISTS idx_system_entities_active ON system_entities(is_active);
CREATE INDEX IF NOT EXISTS idx_system_entities_name ON system_entities(name);