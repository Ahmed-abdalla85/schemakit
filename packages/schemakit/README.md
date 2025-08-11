# SchemaKit
### Runtime Schema Engine for Building Secure, Low-Code Backend Applications
*ship apps that adapt on the fly*

> ⚠️ **BETA VERSION** - Active development. Not recommended for production use yet.

> 🎉 **NEW in v0.1.5**: Now part of a monorepo with framework adapters! Check out [`@mobtakronio/schemakit-elysia`](../schemakit-elysia/) for auto-generated REST APIs.

**SchemaKit is a runtime schema engine** that lets you build secure, multi-tenant backend applications where entities, permissions, and workflows are defined as data rather than code. Build business applications that can evolve without code deployments.

## 🎯 What Makes SchemaKit Different

Unlike traditional ORMs that require code changes to add entities, SchemaKit stores your **schema as data**. Add new business entities, modify permissions, and create workflows through API calls - no code deployment needed.

```typescript
// Traditional ORM: Define entities in code
const userSchema = z.object({
  name: z.string(),
  email: z.string().email()
});

// SchemaKit: Entities are data, created at runtime
await schemaKit.defineEntity({
  name: 'customer',
  fields: {
    name: { type: 'string', required: true },
    department: { type: 'string' }
  },
  authorization: {
    'manager': [{
      conditions: [{
        field: 'department',
        operator: 'eq',
        value: 'currentUser.department', // Dynamic filtering
        exposed: false // Hidden from user
      }]
    }],
    'analyst': [{
      conditions: [{
        field: 'priority',
        operator: 'in',
        value: ['high', 'urgent'],
        exposed: true, // User can modify this filter
        metadata: {
          type: 'multiselect',
          options: ['low', 'medium', 'high', 'urgent']
        }
      }]
    }]
  },
  // Workflows coming in v0.3
  // workflows: {
  //   'after-create': ['send-notification', 'update-analytics']
  // }
});

// Use immediately - no code deployment
const customer = await schemaKit.entity('customer', tenantId);
await customer.create({ name: 'ACME Corp', department: 'Sales' });
```

## 🏗️ Architecture: Four-Tier Runtime Engine

SchemaKit is built as a layered runtime engine:

### 1. **Meta Schema Layer** (Data-Driven Foundation)
```sql
system_entities    -> Entity definitions stored as data
system_fields      -> Field schemas with validation rules  
system_permissions -> Business authorization rules
system_workflows   -> Lifecycle automation definitions
system_views       -> Query configurations
```

### 2. **Engine Layer** (Business Logic)
```typescript
EntityBuilder      -> Dynamic entity creation from meta-schema
PermissionManager  -> Business authorization with exposed/hidden filters
ValidationManager  -> Runtime data validation
RLS Integration    -> Row-level security patterns
ViewManager        -> Planned: Query configuration management
WorkflowManager    -> Planned: Lifecycle event automation
```

### 3. **Adapter Layer** (Database Abstraction)
```typescript
PostgresAdapter   -> Native PostgreSQL implementation
SQLiteAdapter     -> File-based development
InMemoryAdapter   -> Testing and development
DrizzleAdapter    -> Planned: Leverage Drizzle ORM optimizations
TypeORMAdapter    -> Planned: Enterprise features
```

### 4. **Interface Layer** (Future: Low-Code Tools)
```typescript
REST API          -> Planned: Auto-generated endpoints
GraphQL API       -> Planned: Dynamic schema generation
Admin UI          -> Planned: Entity management interface
CLI Tools         -> Planned: Schema migration utilities
```

## 🚀 Key Innovations

### **Meta-Database Approach**
Store entity definitions as data, not code. Add new entity types through API calls:

```typescript
// Add a new entity type without deploying code
await schemaKit.defineEntity({
  name: 'project',
  fields: { 
    name: { type: 'string' },
    status: { type: 'string', options: ['active', 'completed'] }
  }
});
```

### **Business Authorization Engine**
Hybrid permission system with enforced and user-controllable filters:

```typescript
// Some filters are enforced (security)
// Some filters are exposed (user experience)
authorization: {
  'analyst': [{
    conditions: [
      { field: 'department', exposed: false }, // Enforced by system
      { field: 'priority', exposed: true }     // User can modify
    ]
  }]
}
```

### **Dynamic Views System** *(Coming in v0.2)*
Create reusable query configurations:

```typescript
views: {
  'active-customers': {
    filters: { status: 'active' },
    sorting: [{ field: 'created_at', direction: 'DESC' }],
    fields: ['name', 'email', 'department']
  }
}
```

### **Multi-Tenancy by Design**
Built-in tenant isolation at the database level:

```typescript
const customerEntity = await schemaKit.entity('customer', 'tenant-123');
// All operations automatically scoped to tenant-123
```

## 📦 Installation & Quick Start

```bash
npm install @mobtakronio/schemakit
```

```typescript
import { SchemaKit } from '@mobtakronio/schemakit';

// Initialize with your preferred database
const schemaKit = new SchemaKit({
  adapter: 'postgres', // or 'sqlite', 'inmemory'
  config: { url: process.env.DATABASE_URL }
});

// Get entity (auto-creates from meta-schema)
const user = await schemaKit.entity('users', 'tenant-id');

// Business operations with built-in authorization
await user.create({ 
  name: 'John Doe', 
  email: 'john@example.com' 
});

const users = await user.find(); // Automatically filtered by permissions
```

## 🎯 Who Should Use SchemaKit

### **✅ Perfect For:**
- **SaaS Applications** - Multi-tenant apps with dynamic requirements
- **Internal Tools** - Rapid development with business user configuration
- **Client Projects** - Agencies building customizable applications  
- **Startups** - Need to move fast and adapt quickly
- **Low-Code Platforms** - Building configurable business applications

### **❌ Consider Alternatives For:**
- **High-performance applications** - Use Drizzle/Prisma directly
- **Simple CRUD apps** - Traditional ORMs might be simpler
- **Static schemas** - If your schema never changes, code-first is fine

## 🛣️ Roadmap

### **v0.1.X - Core Runtime Engine (Current Release)**
Goal: Establish foundational architecture and prove the runtime entity concept.

- ✅ Meta-database architecture (system_entities, system_fields, etc.)
- ✅ Runtime entity builder (schemaKit.entity('customer'))
- ✅ Pluggable database adapter layer (Postgres, SQLite, InMemory)
- ✅ Permission system (RLS-style with exposed/hidden filters)
- ✅ Multi-tenancy context support

### **v0.2 - Views & Validation Layer**
Goal: Strengthen schema-powered querying and enforce data correctness.

- 🔄 Views system —  dynamic runtime queries with permissions and filters
- 🔄 Validation engine — field-level + custom rule validation
- 🔄 Improved error handling — standard error codes, context-based messages
- 🔄 Caching strategies for entity schema and permissions
- 🧪 Entity test utils (mockEntity(), runWithContext())

### **v0.3 - Developer Experience + Adapter Ecosystem**

- 🎯 DrizzleAdapter (for query optimization and joins)
- 🎯 Better transaction and query debugging across adapters
- 🎯 Type-safe entity access (through TypeScript enhancement layer)


### **v0.4 - API & External Interfaces**
- 🧬 Auto-generated REST API layer (based on runtime schema + permissions)
- 🧬 Audit logs for entity/schema/permission changes
- 🧬 Entity versioning (track schema changes over time)


### **v0.5 - Workflow & Events** 
- 🎯 OpenAPI/Swagger generation
- 🎯 Workflow engine (basic lifecycle hooks)
- 🎯 Events layer (Webhooks, Queue support)

### **v0.6 - UI Builder (Optional Web Layer)** 
- 🎯 Web-based entity/field builder UI (linked to system_entities)
- 🎯 Permission/role UI with exposed filters
- 🎯 Workflow visual editor (state-machine or flow-based)
- 🎯 Query builder for creating “views” visually

### **v1.0🚀 - Public/Enterprise Ready** 

Goal: Full SaaS/enterprise use-case support with documentation and examples.
- 🎯 Tenant isolation strategies (shared DB, schema, or DB per tenant)
- 🎯 Role-based UI definitions (custom forms/layouts per role)
- 🎯 Plugin system (custom rules, hooks, adapters)
- 🎯 Extensive docs + SDKs (Node, Browser, CLI)
- 🎯 Real-world examples: CRM, Inventory, E-commerce, etc.

### **Experimental / Future Ideas** 

- 🧠 AI-powered schema suggestions or generation
- 🔁 Integration with existing low-code tools (Retool, BudiBase, etc.)
- 💼 Schema portability (exportSchema(), importSchema())
- 🎯 Real-time subscriptions
- 🎯 TypeORMAdapter (enterprise features)


## 🤝 Contributing

### 🏗️ Monorepo Structure

SchemaKit now uses a **monorepo architecture** for better organization and framework adapter development:

```
schemakit/                          # Repository root
├── packages/
│   ├── schemakit/                  # 📦 Core engine (this package)
│   ├── schemakit-elysia/           # 🚀 Elysia framework adapter
│   ├── schemakit-api/              # 🔧 Shared API utilities
│   └── schemakit-express/          # 🚧 Express adapter (coming soon)
├── examples/
│   └── elysia-basic/               # 💡 Working examples
├── pnpm-workspace.yaml             # 📋 Workspace configuration
└── README.md                       # 📚 Monorepo overview
```

### 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/MobtakronIO/schemakit.git
cd schemakit

# Install dependencies (requires pnpm)
pnpm install

# Build all packages
pnpm build

# Work on core SchemaKit
cd packages/schemakit
pnpm dev

# Run tests
pnpm test
```

### 🎯 Contribution Areas

SchemaKit is designed with a clear separation of concerns. Contributors can focus on specific layers:

- **Meta Schema Layer**: Enhance the data model for entities/permissions
- **Engine Layer**: Improve business logic and authorization patterns  
- **Adapter Layer**: Add support for new databases (MongoDB, CockroachDB, etc.)
- **Framework Adapters**: Build integrations for Express, Fastify, NestJS, etc.
- **Interface Layer**: Build tools and UIs for schema management

### 📦 Package Dependencies

- **Core (`@mobtakronio/schemakit`)**: Framework-agnostic, zero HTTP dependencies
- **Framework Adapters**: Depend on core + specific framework (Elysia, Express, etc.)
- **Shared API**: Common utilities for all framework adapters
- **Examples**: Demonstrate real-world usage patterns

## 📈 Performance & Production

While in beta, SchemaKit prioritizes **developer experience** and **flexibility** over raw performance. For production applications requiring maximum performance:

1. **Use DrizzleAdapter** (planned v0.3) for query optimization
2. **Cache entity definitions** using the built-in caching system
3. **Consider hybrid approaches** - SchemaKit for dynamic entities, direct ORM for static high-traffic tables

## 🔗 Learn More

- 🎮 **[Examples](../../examples/)** - See SchemaKit in action with framework adapters
- 🚀 **[Elysia Adapter](../schemakit-elysia/)** - Auto-generated REST APIs with Swagger docs
- 🏗️ **[Monorepo Overview](../../README.md)** - Full project structure and roadmap
- 💬 **[Discussions](https://github.com/MobtakronIO/schemakit/discussions)** - Community and support
- 🐛 **[Issues](https://github.com/MobtakronIO/schemakit/issues)** - Bug reports and feature requests

## 📄 License

MIT © [MobtakronIO](https://github.com/MobtakronIO)

---

**SchemaKit: Where Business Logic Meets Runtime Flexibility**

*Code Less. Deploy Less. Build Smarter.*

## 🗄️ Database Adapters

SchemaKit uses a flexible adapter pattern to support multiple databases. By default, it includes an in-memory adapter for testing and development.

### Using Drizzle ORM (Recommended)

For production use, SchemaKit integrates with Drizzle ORM to provide robust database support. This approach gives you:

- 🚀 **Better Performance** - Connection pooling, prepared statements, and query optimization
- 🔒 **Type Safety** - Full TypeScript support with Drizzle
- 🛡️ **Security** - Automatic SQL injection protection
- 📦 **Smaller Bundle** - Database drivers are peer dependencies

#### Installation

First, install Drizzle ORM and your database driver:

```bash
# For PostgreSQL
npm install drizzle-orm pg

# For MySQL
npm install drizzle-orm mysql2

# For SQLite
npm install drizzle-orm better-sqlite3
```

#### Configuration

```typescript
import { SchemaKit } from '@mobtakronio/schemakit';

// PostgreSQL
const kit = new SchemaKit({
  adapter: 'postgres',
  config: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'user',
    password: 'password'
  }
});

// MySQL
const kit = new SchemaKit({
  adapter: 'mysql',
  config: {
    host: 'localhost',
    port: 3306,
    database: 'mydb',
    user: 'user',
    password: 'password'
  }
});

// SQLite
const kit = new SchemaKit({
  adapter: 'sqlite',
  config: {
    filename: './database.sqlite' // or ':memory:' for in-memory
  }
});

// Initialize the adapter
await kit.init();
```

### In-Memory Adapter

Perfect for testing and development:

```typescript
const kit = new SchemaKit({
  adapter: 'inmemory'
});
```

### Custom Adapters

You can create custom adapters by extending the `DatabaseAdapter` class. See the [adapter documentation](./docs/adapters.md) for details.