# SchemaKit Monorepo

A collection of framework adapters and tools for SchemaKit - the dynamic entity management system with runtime schema creation, validation, and CRUD operations.

## 📦 Packages

### [@mobtakronio/schemakit](./packages/schemakit/)
The core SchemaKit engine providing:
- Dynamic entity management with runtime schema creation
- Built-in validation and permissions
- Workflow automation
- Multi-tenant support
- Database adapters (SQLite, PostgreSQL, in-memory)

### [@mobtakronio/schemakit-elysia](./packages/schemakit-elysia/)
Elysia framework adapter that auto-generates REST endpoints for all SchemaKit entities with:
- 🚀 **Auto-generated CRUD endpoints** for all entities
- 🔐 **Built-in permissions & validation** handled by core
- ⚡ **Workflow execution** on entity operations
- 📚 **Automatic OpenAPI/Swagger documentation**
- 🎯 **Type-safe** with full TypeScript support
- 🔄 **Pagination & filtering** support

## 🚀 Quick Start

### Basic Usage with Elysia

```typescript
import { Elysia } from 'elysia';
import { SchemaKit } from '@mobtakronio/schemakit';
import { schemaKitElysia } from '@mobtakronio/schemakit-elysia';

const app = new Elysia();
const kit = new SchemaKit();

// Add SchemaKit REST API
app.use(schemaKitElysia(kit));

app.listen(3000);
console.log('🚀 Server running on http://localhost:3000');
console.log('📚 API docs available at http://localhost:3000/docs');
```

### Setting up Entities

```typescript
// Create a user entity
const users = await kit.entity('users');

// Define fields
await users.field('name', 'text', { required: true });
await users.field('email', 'text', { required: true, unique: true });
await users.field('role', 'text', { defaultValue: 'user' });

// Add permissions
await users.permission('create', { role: ['admin', 'user'] });
await users.permission('read', { role: ['admin', 'user'] });
await users.permission('update', { role: ['admin'], own: true });
await users.permission('delete', { role: ['admin'] });

// The REST API is automatically available:
// GET    /api/entity/users          - List users
// POST   /api/entity/users          - Create user
// GET    /api/entity/users/:id      - Get user by ID
// PUT    /api/entity/users/:id      - Update user
// DELETE /api/entity/users/:id      - Delete user
```

## 📁 Project Structure

```
/
├── packages/
│   ├── schemakit/              # Core SchemaKit engine
│   │   ├── src/
│   │   ├── test/
│   │   ├── package.json
│   │   └── README.md
│   └── schemakit-elysia/       # Elysia adapter
│       ├── src/
│       ├── test/
│       ├── package.json
│       └── README.md
├── examples/
│   └── elysia-basic/           # Basic Elysia example
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 🛠️ Development

This monorepo uses pnpm for package management with workspaces.

### Installation

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install all dependencies
pnpm install
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @mobtakronio/schemakit build
pnpm --filter @mobtakronio/schemakit-elysia build
```

### Development

```bash
# Watch mode for all packages
pnpm dev

# Watch specific package
pnpm --filter @mobtakronio/schemakit-elysia dev
```

### Testing

```bash
# Run tests for all packages
pnpm test

# Type checking
pnpm typecheck
```

## 📚 Examples

### Basic Elysia Server

See [examples/elysia-basic](./examples/elysia-basic/) for a complete working example.

To run:

```bash
cd examples/elysia-basic
pnpm dev
```

Visit:
- `http://localhost:3000` - Welcome page with API info
- `http://localhost:3000/docs` - Swagger documentation
- `http://localhost:3000/api/entities` - List available entities
- `http://localhost:3000/api/entity/users` - Users CRUD API

### API Examples

```bash
# List all entities
curl http://localhost:3000/api/entities

# List users with pagination
curl "http://localhost:3000/api/entity/users?page=1&limit=10"

# Create a user
curl -X POST http://localhost:3000/api/entity/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","role":"admin"}'

# Get user by ID
curl http://localhost:3000/api/entity/users/1

# Update user
curl -X PUT http://localhost:3000/api/entity/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Smith"}'

# Delete user
curl -X DELETE http://localhost:3000/api/entity/users/1
```

## 🔮 Future Packages

This monorepo is designed for extensibility. Future packages may include:

- `@mobtakronio/schemakit-express` - Express.js adapter
- `@mobtakronio/schemakit-fastify` - Fastify adapter
- `@mobtakronio/schemakit-nestjs` - NestJS adapter
- `@mobtakronio/schemakit-api` - Shared API utilities
- `@mobtakronio/schemakit-cli` - Command-line tools

## 🔧 Framework-Agnostic Architecture

The core SchemaKit package remains completely framework-agnostic. Each adapter is a thin wrapper that:

1. **Integrates** with the framework's routing and middleware system
2. **Translates** HTTP requests to SchemaKit operations
3. **Handles** framework-specific concerns (CORS, auth, validation)
4. **Generates** framework-appropriate documentation

This ensures:
- ✅ **Consistency** across all frameworks
- ✅ **Easy migration** between frameworks
- ✅ **Shared business logic** in the core
- ✅ **Framework-specific optimizations** in adapters

## 📄 License

MIT - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Documentation**: See individual package READMEs
- **Issues**: [GitHub Issues](https://github.com/MobtakronIO/schemakit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MobtakronIO/schemakit/discussions)