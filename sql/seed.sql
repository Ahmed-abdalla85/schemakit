-- SchemaKit Seed Data
-- This file contains initial data for SchemaKit system tables

-- Insert default installation record
INSERT OR REPLACE INTO system_installation (id, version, installed_at, updated_at, metadata)
VALUES (
    1,
    '1.0.0',
    datetime('now'),
    datetime('now'),
    '{"installer": "SchemaKit", "environment": "production"}'
);

-- Example: Create a default 'user' entity (optional - can be removed if not needed)
INSERT OR IGNORE INTO system_entities (
    id, name, table_name, display_name, description, 
    is_active, created_at, updated_at, metadata
) VALUES (
    'entity_user_default',
    'user',
    'entity_user',
    'User',
    'Default user entity for SchemaKit',
    1,
    datetime('now'),
    datetime('now'),
    '{"auto_created": true, "system": true}'
);

-- Example: Add default fields for user entity
INSERT OR IGNORE INTO system_fields (
    id, entity_id, name, type, is_required, is_unique,
    default_value, validation_rules, display_name, description,
    order_index, is_active, reference_entity, metadata
) VALUES 
-- ID field (auto-generated)
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
    '{"system": true, "auto_generated": true}'
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
    '{"system": false}'
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
    '{"system": false}'
),
-- Created at field (auto-generated)
(
    'field_user_created_at',
    'entity_user_default',
    'created_at',
    'date',
    1,
    0,
    NULL,
    NULL,
    'Created At',
    'Record creation timestamp',
    98,
    1,
    NULL,
    '{"system": true, "auto_generated": true}'
),
-- Updated at field (auto-generated)
(
    'field_user_updated_at',
    'entity_user_default',
    'updated_at',
    'date',
    1,
    0,
    NULL,
    NULL,
    'Updated At',
    'Record update timestamp',
    99,
    1,
    NULL,
    '{"system": true, "auto_generated": true}'
);

-- Example: Add default permissions for user entity
INSERT OR IGNORE INTO system_permissions (
    id, entity_id, role, action, conditions, is_allowed, created_at, field_permissions
) VALUES 
-- Admin permissions
(
    'perm_user_admin_create',
    'entity_user_default',
    'admin',
    'create',
    NULL,
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
    datetime('now'),
    NULL
),
-- User permissions (limited)
(
    'perm_user_user_read',
    'entity_user_default',
    'user',
    'read',
    '{"field": "id", "op": "eq", "value": "$context.user.id"}',
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
    datetime('now'),
    '{"email": false}' -- Users can't update their own email
);

-- Example: Add default view for user entity
INSERT OR IGNORE INTO system_views (
    id, entity_id, name, query_config, fields, is_default, created_by, is_public, metadata
) VALUES (
    'view_user_default',
    'entity_user_default',
    'default',
    '{"filters": {}, "sorting": [{"field": "name", "direction": "asc"}], "pagination": {"default_limit": 10, "max_limit": 100}}',
    '["id", "name", "email", "created_at", "updated_at"]',
    1,
    'system',
    1,
    '{"system": true, "description": "Default user listing view"}'
);

-- Note: The seed data above is optional and can be customized or removed
-- based on your application's needs. The system_installation record is required.