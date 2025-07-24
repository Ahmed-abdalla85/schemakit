# SchemaKit

> ⚠️ **BETA VERSION** - This is a beta version and is not recommended for production use. Please use with caution and expect potential breaking changes.
>
> 🚧 **ACTIVE DEVELOPMENT** - This library is actively under development. Functionality may change and features are under testing. Expect bugs and incomplete features.

SchemaKit lets you create, validate, and manage entities and data at runtime, with built-in permissions and support for SQLite and PostgreSQL. Written in TypeScript.
>
> 🚧 **ACTIVE DEVELOPMENT** - This library is actively under development. Functionality may change and features are under testing. Expect bugs and incomplete features.

SchemaKit lets you create, validate, and manage entities and data at runtime, with built-in permissions and support for SQLite and PostgreSQL. Written in TypeScript.

## Features
- Dynamic entities and fields (no migrations)
- Data validation
- Role-based permissions and RLS
- Multi-database: SQLite & Postgres
- TypeScript-first, zero dependencies
- ✅ **Built-in Validation** - Comprehensive data validation with custom rules
- 🔐 **Permission System** - Role-based access control with row-level security
- 🔄 **Workflow Engine** - Automated actions on entity lifecycle events
- 🗃️ **Multiple Databases** - SQLite and PostgreSQL support
- 📱 **Universal** - Works in Node.js and browsers
- 🎯 **TypeScript First** - Full type safety and IntelliSense support
- 🧩 **Modular Architecture** - Use individual components as needed

## 📦 Installation

```bash
npm install @mobtakronio/schemakit
```

## 🚀 Quick Start

```typescript
import { SchemaKit } from '@mobtakronio/schemakit';

// Initialize SchemaKit
const schemaKit = new SchemaKit({
  adapter: {
    type: 'sqlite',
    config: { filename: 'database.db' }
  }
});

// Initialize (automatically installs SchemaKit if not already installed)
await schemaKit.initialize();

const user = await schemaKit.entity('users','system');
const user = await schemaKit.entity('users','system');

// Create a user entity
await user.create({
await user.create({
  name: 'John Doe',
  email: 'john@example.com'
});

// Update user
const updatedUser = await user.update(1,{
const updatedUser = await user.update(1,{
  name: 'John Smith'
});

// Find All users
const users = await user.read();

// Find user by name
const userRecord = await user.read({user_name:"John Doe"});
        
// Delete user
await user.delete(1);
await user.delete(1);
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

**Note:** SQLite adapter requires `better-sqlite3` to be installed separately:
```bash
npm install better-sqlite3
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

MIT © Mobtakron

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/MobtakronIO/schemakit/issues)
- 📖 Documentation: [GitHub Wiki](https://github.com/MobtakronIO/schemakit/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/MobtakronIO/schemakit/issues)
- 📖 Documentation: [GitHub Wiki](https://github.com/MobtakronIO/schemakit/wiki)

## 🗺️ Roadmap

- [ ] GraphQL support
- [ ] MongoDB adapter
- [ ] Real-time subscriptions
- [ ] Advanced workflow conditions
- [ ] Schema migrations
- [ ] Performance optimizations
- [ ] Browser-specific optimizations

---

Made with ❤️ by Mobtakron
Made with ❤️ by Mobtakron