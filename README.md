# SchemaKit

> ⚠️ **BETA VERSION** - This is a beta version and is not recommended for production use. Please use with caution and expect potential breaking changes.

[![npm version](https://badge.fury.io/js/%40ahmedabdalla_85%2Fschemakit.svg)](https://badge.fury.io/js/%40ahmedabdalla_85%2Fschemakit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Dynamic entity management system with runtime schema creation, validation, and CRUD operations. Zero dependencies, works in Node.js and browsers.

## ✨ Features

- 🚀 **Zero Dependencies** - Lightweight and self-contained
- 🔧 **Runtime Schema Creation** - Define entities dynamically without migrations
- ✅ **Built-in Validation** - Comprehensive data validation with custom rules
- 🔐 **Permission System** - Role-based access control with row-level security
- 🔄 **Workflow Engine** - Automated actions on entity lifecycle events
- 🗃️ **Multiple Databases** - SQLite and PostgreSQL support
- 📱 **Universal** - Works in Node.js and browsers
- 🎯 **TypeScript First** - Full type safety and IntelliSense support
- 🧩 **Modular Architecture** - Use individual components as needed

## 📦 Installation

```bash
npm install @ahmedabdalla_85/schemakit
```

## 🚀 Quick Start

```typescript
import { SchemaKit } from '@ahmedabdalla_85/schemakit';

// Initialize SchemaKit
const schemaKit = new SchemaKit({
  adapter: {
    type: 'sqlite',
    config: { filename: 'database.db' }
  }
});

// Initialize (automatically installs SchemaKit if not already installed)
await schemaKit.init();

// Check installation status
const isInstalled = await schemaKit.isInstalled();
const version = await schemaKit.getVersion();
console.log(`Installed: ${isInstalled}, Version: ${version}`);

// Create a user entity
const user = await schemaKit.create('user', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Find user by ID
const foundUser = await schemaKit.findById('user', user.id);

// Update user
const updatedUser = await schemaKit.update('user', user.id, {
  name: 'John Smith'
});

// Delete user
await schemaKit.delete('user', user.id);
```

## 📚 Core Concepts

### Dynamic Entity Creation

SchemaKit allows you to create entities at runtime without predefined schemas:

```typescript
// Entities are created automatically when you first use them
const product = await schemaKit.create('product', {
  name: 'Laptop',
  price: 999.99,
  category: 'Electronics',
  inStock: true
});
```

### Built-in Validation

Automatic validation based on field types and custom rules:

```typescript
// This will validate field types automatically
const user = await schemaKit.create('user', {
  name: 'John',        // string
  age: 25,             // number
  isActive: true,      // boolean
  createdAt: new Date(), // date
  tags: ['admin', 'user'], // array
  metadata: { role: 'admin' } // object
});
```

### Permission System

Role-based access control with fine-grained permissions:

```typescript
const context = {
  user: {
    id: 'user123',
    roles: ['admin']
  }
};

// Check permissions
const canCreate = await schemaKit.checkPermission('user', 'create', context);

// Get all permissions
const permissions = await schemaKit.getEntityPermissions('user', context);
```

### Query Operations

Flexible querying with views and custom queries:

```typescript
// Execute a view
const result = await schemaKit.executeView('user', 'active_users', {
  page: 1,
  per_page: 10
});

// Custom query
const customResult = await schemaKit.query('user', query => 
  query
    .select(['id', 'name', 'email'])
    .addWhere('age', '>', 18)
    .addOrderBy('name', 'asc')
    .setLimit(10)
);
```

## 🛠️ Installation System

SchemaKit uses a professional SQL-based installation system:

### Automatic Installation
```typescript
// SchemaKit automatically installs itself on first use
const schemaKit = new SchemaKit({ /* config */ });
await schemaKit.init(); // Installs if not already installed
```

### Installation Management
```typescript
// Check installation status
const isInstalled = await schemaKit.isInstalled();
const version = await schemaKit.getVersion();

// Force reinstall (useful for development)
await schemaKit.reinstall();
```

### SQL Schema Files
- **`sql/schema.sql`** - Defines system tables structure
- **`sql/seed.sql`** - Initial data and default entities
- **Version tracking** - Automatic version management
- **Migration support** - Ready for future schema updates

## 🗄️ Database Tables

When SchemaKit is installed, it creates the following system tables in your database:

### Core System Tables

| Table Name | Purpose | Description |
|------------|---------|-------------|
| `system_entities` | Entity Definitions | Stores metadata for all dynamic entities including name, table name, and configuration |
| `system_fields` | Field Definitions | Defines fields for each entity with validation rules, types, and constraints |
| `system_permissions` | Access Control | Role-based permissions for entities and field-level access control |
| `system_views` | Query Views | Predefined query configurations for entities with sorting and filtering |
| `system_workflows` | Automation | Workflow definitions for automated actions on entity lifecycle events |
| `system_rls` | Row-Level Security | Security rules that control which records users can access |
| `system_installation` | Version Management | Tracks SchemaKit installation version and metadata |

### Table Details

#### `system_entities`
- **Primary Key**: `id` (TEXT)
- **Key Fields**: `name` (unique entity name), `table_name`, `display_name`
- **Purpose**: Central registry of all dynamic entities in your application

#### `system_fields` 
- **Primary Key**: `id` (TEXT)
- **Foreign Key**: `entity_id` → `system_entities.id`
- **Key Fields**: `name`, `type`, `validation_rules` (JSON), `is_required`, `is_unique`
- **Purpose**: Define structure and validation for entity fields

#### `system_permissions`
- **Primary Key**: `id` (TEXT)  
- **Foreign Key**: `entity_id` → `system_entities.id`
- **Key Fields**: `role`, `action`, `conditions` (JSON), `field_permissions` (JSON)
- **Purpose**: Control who can perform what actions on entities

#### `system_views`
- **Primary Key**: `id` (TEXT)
- **Foreign Key**: `entity_id` → `system_entities.id`  
- **Key Fields**: `name`, `query_config` (JSON), `fields` (JSON array)
- **Purpose**: Store reusable query configurations for entities

#### `system_workflows`
- **Primary Key**: `id` (TEXT)
- **Foreign Key**: `entity_id` → `system_entities.id`
- **Key Fields**: `trigger_event`, `conditions` (JSON), `actions` (JSON array)
- **Purpose**: Define automated workflows triggered by entity events

#### `system_rls`
- **Primary Key**: `id` (TEXT)
- **Foreign Key**: `entity_id` → `system_entities.id`
- **Key Fields**: `role`, `rls_config` (JSON)
- **Purpose**: Implement row-level security rules

#### `system_installation`
- **Primary Key**: `id` (INTEGER)
- **Key Fields**: `version`, `installed_at`, `updated_at`
- **Purpose**: Track SchemaKit version and installation status

### Automatic Indexes

SchemaKit automatically creates performance indexes on:
- Entity and field lookups
- Permission and role queries  
- Active record filtering
- Foreign key relationships

## 🏗️ Architecture

SchemaKit uses a modular architecture with focused components:

- **SchemaLoader** - Entity configuration loading, caching, and installation
- **ValidationManager** - Data validation and type conversion
- **EntityManager** - CRUD operations
- **PermissionManager** - Security and permissions
- **QueryManager** - Query building and execution
- **WorkflowManager** - Workflow execution

### Advanced Usage

Use individual modules for more control:

```typescript
import { 
  SchemaLoader, 
  EntityManager, 
  ValidationManager 
} from '@ahmedabdalla_85/schemakit';

const schemaLoader = new SchemaLoader(databaseAdapter);
const entityConfig = await schemaLoader.loadEntity('user');

const validationManager = new ValidationManager();
const result = validationManager.validateEntityData(entityConfig, data, 'create');
```

## 🔌 Database Adapters

### SQLite (Default)

```typescript
const schemaKit = new SchemaKit({
  adapter: {
    type: 'sqlite',
    config: { 
      filename: 'database.db' // or ':memory:' for in-memory
    }
  }
});
```

### PostgreSQL

```typescript
const schemaKit = new SchemaKit({
  adapter: {
    type: 'postgres',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      user: 'username',
      password: 'password'
    }
  }
});
```

## 🔧 Configuration

### SchemaKit Options

```typescript
const schemaKit = new SchemaKit({
  adapter: {
    type: 'sqlite',
    config: { filename: 'database.db' }
  },
  cache: {
    enabled: true,
    ttl: 3600000 // 1 hour
  }
});
```

### Field Types

Supported field types:

- `string` - Text data
- `number` - Numeric data
- `boolean` - True/false values
- `date` - Date/time values
- `array` - Array data
- `json` - JSON objects
- `reference` - References to other entities

### Validation Rules

```typescript
// String validation
{
  type: 'string',
  validation_rules: {
    minLength: 2,
    maxLength: 50,
    pattern: '^[a-zA-Z]+$'
  }
}

// Number validation
{
  type: 'number',
  validation_rules: {
    min: 0,
    max: 120
  }
}

// Array validation
{
  type: 'array',
  validation_rules: {
    minItems: 1,
    maxItems: 10
  }
}
```

## 🔐 Security Features

### Row-Level Security (RLS)

```typescript
// RLS rules are applied automatically based on user context
const context = {
  user: {
    id: 'user123',
    roles: ['user']
  }
};

// This will only return records the user has access to
const users = await schemaKit.executeView('user', 'default', {}, context);
```

### Field-Level Permissions

Control access to specific fields based on user roles:

```typescript
// Users can only read their own email, admins can read all
const permissions = {
  email_read: context.user.roles.includes('admin') || 
              context.user.id === record.id
};
```

## 🔄 Workflows

Automate actions on entity lifecycle events:

```typescript
// Workflows are defined in the database and executed automatically
// Examples:
// - Send email when user is created
// - Log changes when entity is updated
// - Trigger webhooks on specific events
// - Update related entities
```

## 📖 API Reference

### SchemaKit Class

#### Methods

- `init()` - Initialize SchemaKit
- `create(entityName, data, context?)` - Create entity instance
- `findById(entityName, id, context?)` - Find entity by ID
- `update(entityName, id, data, context?)` - Update entity instance
- `delete(entityName, id, context?)` - Delete entity instance
- `executeView(entityName, viewName, params?, context?)` - Execute view query
- `query(entityName, queryBuilder, context?)` - Execute custom query
- `checkPermission(entityName, action, context?)` - Check user permission
- `getEntityPermissions(entityName, context?)` - Get all entity permissions

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🏗️ Building

```bash
# Build for production
npm run build:all

# Build CommonJS
npm run build

# Build ES modules
npm run build:esm

# Build UMD
npm run build:umd
```

## 📄 License

MIT © Ahmed Abdalla

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/ahmedabdalla_85/schemakit/issues)
- 📖 Documentation: [GitHub Wiki](https://github.com/ahmedabdalla_85/schemakit/wiki)

## 🗺️ Roadmap

- [ ] GraphQL support
- [ ] MongoDB adapter
- [ ] Real-time subscriptions
- [ ] Advanced workflow conditions
- [ ] Schema migrations
- [ ] Performance optimizations
- [ ] Browser-specific optimizations

---

Made with ❤️ by Ahmed Abdalla