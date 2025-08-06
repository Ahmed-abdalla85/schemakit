-- SchemaKit Enhanced Seed Data
-- This file contains initial data for SchemaKit system tables
-- Updated to match prefixed field names and include system tables as entities

-- ========================================
-- PART 1: SYSTEM TABLES AS ENTITIES
-- ========================================
-- Each system table is itself represented as an entity in the system

-- System tables as entities - all in one insert
INSERT OR IGNORE INTO system_entities (
    entity_id, entity_name, entity_table_name, entity_display_name, entity_description,
    entity_is_active, entity_created_at, entity_updated_at, entity_metadata
) VALUES 
-- 1. Entity for system_entities table
(
    'entity_system_entities',
    'system_entities',
    'system_entities',
    'System Entities',
    'Meta-entity that stores all entity definitions in SchemaKit',
    1,
    datetime('now'),
    datetime('now'),
    '{"system": true, "meta": true, "auto_created": true}'
),
-- 2. Entity for system_fields table
(
    'entity_system_fields',
    'system_fields',
    'system_fields',
    'System Fields',
    'Meta-entity that stores field definitions for all entities',
    1,
    datetime('now'),
    datetime('now'),
    '{"system": true, "meta": true, "auto_created": true}'
),
-- 3. Entity for system_permissions table
(
    'entity_system_permissions',
    'system_permissions',
    'system_permissions',
    'System Permissions',
    'Meta-entity that stores permission rules for all entities',
    1,
    datetime('now'),
    datetime('now'),
    '{"system": true, "meta": true, "auto_created": true}'
),
-- 4. Entity for system_views table
(
    'entity_system_views',
    'system_views',
    'system_views',
    'System Views',
    'Meta-entity that stores view definitions for all entities',
    1,
    datetime('now'),
    datetime('now'),
    '{"system": true, "meta": true, "auto_created": true}'
),
-- 5. Entity for system_workflows table
(
    'entity_system_workflows',
    'system_workflows',
    'system_workflows',
    'System Workflows',
    'Meta-entity that stores workflow definitions for all entities',
    1,
    datetime('now'),
    datetime('now'),
    '{"system": true, "meta": true, "auto_created": true}'
),
-- 6. Entity for system_rls table
(
    'entity_system_rls',
    'system_rls',
    'system_rls',
    'System RLS',
    'Meta-entity that stores row-level security rules for all entities',
    1,
    datetime('now'),
    datetime('now'),
    '{"system": true, "meta": true, "auto_created": true}'
);

-- ========================================
-- PART 2: FIELDS FOR SYSTEM_ENTITIES TABLE
-- ========================================
-- Define the fields that system_entities table has

INSERT OR IGNORE INTO system_fields (
    field_id, field_entity_id, field_name, field_type, field_is_required, field_is_unique,
    field_default_value, field_validation_rules, field_display_name, field_description,
    field_order_index, field_is_active, field_reference_entity, field_metadata
) VALUES 
-- entity_id field
(
    'field_system_entities_entity_id',
    'entity_system_entities',
    'entity_id',
    'string',
    1,
    1,
    NULL,
    '{"minLength": 1, "maxLength": 255}',
    'Entity ID',
    'Unique identifier for the entity',
    0,
    1,
    NULL,
    '{"system": true, "primary_key": true}'
),
-- entity_name field
(
    'field_system_entities_entity_name',
    'entity_system_entities',
    'entity_name',
    'string',
    1,
    1,
    NULL,
    '{"minLength": 1, "maxLength": 100, "pattern": "^[a-z][a-z0-9_]*$"}',
    'Entity Name',
    'Code name for the entity (snake_case)',
    1,
    1,
    NULL,
    '{"system": true}'
),
-- entity_table_name field
(
    'field_system_entities_entity_table_name',
    'entity_system_entities',
    'entity_table_name',
    'string',
    1,
    0,
    NULL,
    '{"minLength": 1, "maxLength": 100}',
    'Table Name',
    'Actual database table name',
    2,
    1,
    NULL,
    '{"system": true}'
),
-- entity_display_name field
(
    'field_system_entities_entity_display_name',
    'entity_system_entities',
    'entity_display_name',
    'string',
    1,
    0,
    NULL,
    '{"minLength": 1, "maxLength": 200}',
    'Display Name',
    'Human-readable name for the entity',
    3,
    1,
    NULL,
    '{"system": true}'
),
-- entity_description field
(
    'field_system_entities_entity_description',
    'entity_system_entities',
    'entity_description',
    'string',
    0,
    0,
    NULL,
    '{"maxLength": 500}',
    'Description',
    'Description of what this entity represents',
    4,
    1,
    NULL,
    '{"system": true}'
),
-- entity_is_active field
(
    'field_system_entities_entity_is_active',
    'entity_system_entities',
    'entity_is_active',
    'boolean',
    1,
    0,
    '1',
    NULL,
    'Is Active',
    'Whether this entity is currently active',
    5,
    1,
    NULL,
    '{"system": true}'
),
-- entity_created_at field
(
    'field_system_entities_entity_created_at',
    'entity_system_entities',
    'entity_created_at',
    'datetime',
    1,
    0,
    NULL,
    NULL,
    'Created At',
    'Timestamp when entity was created',
    6,
    1,
    NULL,
    '{"system": true, "auto_generated": true}'
),
-- entity_updated_at field
(
    'field_system_entities_entity_updated_at',
    'entity_system_entities',
    'entity_updated_at',
    'datetime',
    1,
    0,
    NULL,
    NULL,
    'Updated At',
    'Timestamp when entity was last updated',
    7,
    1,
    NULL,
    '{"system": true, "auto_generated": true}'
),
-- entity_metadata field
(
    'field_system_entities_entity_metadata',
    'entity_system_entities',
    'entity_metadata',
    'json',
    0,
    0,
    NULL,
    NULL,
    'Metadata',
    'Additional metadata as JSON object',
    8,
    1,
    NULL,
    '{"system": true}'
);

-- ========================================
-- PART 3: EXAMPLE USER ENTITY (UPDATED)
-- ========================================
-- Example entity with updated field names

INSERT OR IGNORE INTO system_entities (
    entity_id, entity_name, entity_table_name, entity_display_name, entity_description, 
    entity_is_active, entity_created_at, entity_updated_at, entity_metadata
) VALUES (
    'entity_user_default',
    'user',
    'users',
    'User',
    'Default user entity for SchemaKit applications',
    1,
    datetime('now'),
    datetime('now'),
    '{"auto_created": true, "example": true}'
);

-- Fields for user entity
INSERT OR IGNORE INTO system_fields (
    field_id, field_entity_id, field_name, field_type, field_is_required, field_is_unique,
    field_default_value, field_validation_rules, field_display_name, field_description,
    field_order_index, field_is_active, field_reference_entity, field_metadata
) VALUES 
-- ID field
(
    'field_user_id',
    'entity_user_default',
    'id',
    'string',
    1,
    1,
    NULL,
    NULL,
    'ID',
    'Unique identifier',
    0,
    1,
    NULL,
    '{"primary_key": true, "auto_generated": true}'
),
-- Name field
(
    'field_user_name',
    'entity_user_default',
    'name',
    'string',
    1,
    0,
    NULL,
    '{"minLength": 2, "maxLength": 100}',
    'Name',
    'User full name',
    1,
    1,
    NULL,
    '{"searchable": true}'
),
-- Email field
(
    'field_user_email',
    'entity_user_default',
    'email',
    'string',
    1,
    1,
    NULL,
    '{"pattern": "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$"}',
    'Email',
    'User email address',
    2,
    1,
    NULL,
    '{"searchable": true}'
),
-- Created at field
(
    'field_user_created_at',
    'entity_user_default',
    'created_at',
    'datetime',
    1,
    0,
    NULL,
    NULL,
    'Created At',
    'Record creation timestamp',
    98,
    1,
    NULL,
    '{"auto_generated": true}'
),
-- Updated at field
(
    'field_user_updated_at',
    'entity_user_default',
    'updated_at',
    'datetime',
    1,
    0,
    NULL,
    NULL,
    'Updated At',
    'Record update timestamp',
    99,
    1,
    NULL,
    '{"auto_generated": true}'
);

-- ========================================
-- PART 4: PERMISSIONS FOR USER ENTITY
-- ========================================

INSERT OR IGNORE INTO system_permissions (
    permission_id, permission_entity_id, permission_role, permission_action, permission_conditions, 
    permission_is_allowed, permission_is_active, permission_created_at, permission_field_permissions
) VALUES 
-- Admin permissions
(
    'perm_user_admin_create',
    'entity_user_default',
    'admin',
    'create',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_user_admin_read',
    'entity_user_default',
    'admin',
    'read',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_user_admin_update',
    'entity_user_default',
    'admin',
    'update',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_user_admin_delete',
    'entity_user_default',
    'admin',
    'delete',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
-- User permissions (limited to own records)
(
    'perm_user_user_read',
    'entity_user_default',
    'user',
    'read',
    '{"field": "id", "op": "eq", "value": "$context.user.id"}',
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_user_user_update',
    'entity_user_default',
    'user',
    'update',
    '{"field": "id", "op": "eq", "value": "$context.user.id"}',
    1,
    1,
    datetime('now'),
    '{"email": false}'
);

-- ========================================
-- PART 5: VIEWS FOR USER ENTITY
-- ========================================

INSERT OR IGNORE INTO system_views (
    view_id, view_entity_id, view_name, view_query_config, view_fields, 
    view_is_default, view_created_by, view_is_public, view_metadata
) VALUES 
-- Default user list view
(
    'view_user_list',
    'entity_user_default',
    'list',
    '{"filters": {}, "sorting": [{"field": "name", "direction": "asc"}], "pagination": {"default_limit": 20, "max_limit": 100}}',
    '["id", "name", "email", "created_at"]',
    1,
    'system',
    1,
    '{"description": "Default user listing view"}'
),
-- User detail view
(
    'view_user_detail',
    'entity_user_default',
    'detail',
    '{"filters": {}, "sorting": [], "pagination": {"default_limit": 1, "max_limit": 1}}',
    '["id", "name", "email", "created_at", "updated_at"]',
    0,
    'system',
    1,
    '{"description": "Detailed user view with all fields"}'
);

-- ========================================
-- PART 6: WORKFLOWS FOR USER ENTITY
-- ========================================

INSERT OR IGNORE INTO system_workflows (
    workflow_id, workflow_entity_id, workflow_name, workflow_trigger_event, workflow_conditions,
    workflow_actions, workflow_is_active, workflow_order_index, workflow_metadata
) VALUES 
-- Welcome email workflow
(
    'workflow_user_welcome',
    'entity_user_default',
    'welcome_email',
    'create',
    '{"field": "email", "op": "notNull"}',
    '[{"type": "send_email", "config": {"template": "welcome", "to": "{{record.email}}", "data": {"name": "{{record.name}}"}}}]',
    1,
    1,
    '{"description": "Send welcome email to new users"}'
),
-- User audit workflow
(
    'workflow_user_audit',
    'entity_user_default',
    'audit_changes',
    'update',
    NULL,
    '[{"type": "log_audit", "config": {"action": "user_updated", "user_id": "{{record.id}}", "changes": "{{changes}}"}}]',
    1,
    2,
    '{"description": "Log user changes for audit trail"}'
);

-- ========================================
-- PART 7: BASIC PERMISSIONS FOR SYSTEM TABLES
-- ========================================
-- Allow admins to manage system tables

INSERT OR IGNORE INTO system_permissions (
    permission_id, permission_entity_id, permission_role, permission_action, permission_conditions, 
    permission_is_allowed, permission_is_active, permission_created_at, permission_field_permissions
) VALUES 
-- System entities permissions
(
    'perm_system_entities_admin_full',
    'entity_system_entities',
    'admin',
    'read',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_system_fields_admin_full',
    'entity_system_fields',
    'admin',
    'read',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_system_permissions_admin_full',
    'entity_system_permissions',
    'admin',
    'read',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_system_views_admin_full',
    'entity_system_views',
    'admin',
    'read',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_system_workflows_admin_full',
    'entity_system_workflows',
    'admin',
    'read',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
),
(
    'perm_system_rls_admin_full',
    'entity_system_rls',
    'admin',
    'read',
    NULL,
    1,
    1,
    datetime('now'),
    NULL
);

-- ========================================
-- PART 8: BASIC VIEWS FOR SYSTEM TABLES
-- ========================================

INSERT OR IGNORE INTO system_views (
    view_id, view_entity_id, view_name, view_query_config, view_fields, 
    view_is_default, view_created_by, view_is_public, view_metadata
) VALUES 
-- System entities overview
(
    'view_system_entities_list',
    'entity_system_entities',
    'list',
    '{"filters": {}, "sorting": [{"field": "entity_name", "direction": "asc"}], "pagination": {"default_limit": 50, "max_limit": 200}}',
    '["entity_id", "entity_name", "entity_display_name", "entity_is_active", "entity_created_at"]',
    1,
    'system',
    0,
    '{"description": "System entities overview", "admin_only": true}'
),
-- System fields overview
(
    'view_system_fields_list',
    'entity_system_fields',
    'list',
    '{"filters": {}, "sorting": [{"field": "field_entity_id", "direction": "asc"}, {"field": "field_order_index", "direction": "asc"}], "pagination": {"default_limit": 100, "max_limit": 500}}',
    '["field_id", "field_entity_id", "field_name", "field_type", "field_is_required", "field_is_active"]',
    1,
    'system',
    0,
    '{"description": "System fields overview", "admin_only": true}'
);

-- ========================================
-- NOTES:
-- ========================================
-- 1. All field names now use the prefixed naming convention
-- 2. System tables are represented as entities in system_entities
-- 3. Basic field definitions are provided for system_entities table
-- 4. Example user entity is updated with new field names
-- 5. Permissions, views, and workflows demonstrate the full system
-- 6. System_installation table is removed (no longer exists)
-- 7. This creates a self-describing meta-system where SchemaKit
--    can introspect its own structure