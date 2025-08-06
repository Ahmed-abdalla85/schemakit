# @mobtakronio/schemakit-elysia

Elysia adapter for SchemaKit that auto-generates REST endpoints for all entities with built-in permissions, validation, workflows, and OpenAPI documentation.

## Features

- 🚀 **Auto-generated CRUD endpoints** for all SchemaKit entities
- 🔐 **Built-in permissions & validation** handled by SchemaKit core
- ⚡ **Workflow execution** on entity operations
- 📚 **Automatic OpenAPI/Swagger documentation**
- 🎯 **Type-safe** with full TypeScript support
- 🔄 **Pagination & filtering** support
- 🌐 **CORS** support built-in
- 🎭 **Framework-agnostic core** - SchemaKit remains independent

## Installation

```bash
npm install @mobtakronio/schemakit-elysia elysia
# or
pnpm add @mobtakronio/schemakit-elysia elysia
# or
yarn add @mobtakronio/schemakit-elysia elysia
```

## Quick Start

```typescript
import { Elysia } from 'elysia';
import { SchemaKit } from '@mobtakronio/schemakit';
import { schemaKitElysia } from '@mobtakronio/schemakit-elysia';

const app = new Elysia();
const kit = new SchemaKit();

// Add SchemaKit REST API with default configuration
app.use(schemaKitElysia(kit));

app.listen(3000);
console.log('Server running on http://localhost:3000');
console.log('API docs available at http://localhost:3000/docs');
```

## Configuration

```typescript
app.use(schemaKitElysia(kit, {
  // Base path for all SchemaKit routes (default: '/api')
  basePath: '/api/v1',
  
  // Tenant ID for multi-tenant setups (default: 'default')
  tenantId: 'my-tenant',
  
  // Enable/disable Swagger documentation (default: true)
  enableDocs: true,
  docsPath: '/documentation',
  
  // Entity filtering
  includeEntities: ['users', 'posts'], // Only these entities
  excludeEntities: ['system_logs'],    // Exclude these entities
  
  // Custom context provider for request context
  contextProvider: (request) => ({
    tenantId: 'my-tenant',
    user: {
      id: request.headers.get('user-id') || 'anonymous',
      role: request.headers.get('user-role') || 'user',
    },
  }),
  
  // Custom error handler
  errorHandler: (error, entityName, operation) => {
    console.error(`Error in ${entityName}:${operation}:`, error);
    return { success: false, error: error.message };
  },
  
  // CORS settings (default: true)
  enableCors: true,
}));
```

## Generated API Endpoints

For each entity (e.g., `users`), the following endpoints are automatically created:

### List Entities
```
GET /api/entities
```
Returns a list of all available entities.

### Entity CRUD Operations

#### List Records
```
GET /api/entity/{entityName}?page=1&limit=10&sort=created_at&order=desc
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sort` - Field to sort by
- `order` - Sort order: `asc` or `desc`
- `search` - Search term
- Any other field for filtering

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### Create Record
```
POST /api/entity/{entityName}
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### Get Record by ID
```
GET /api/entity/{entityName}/{id}
```

#### Update Record
```
PUT /api/entity/{entityName}/{id}
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

#### Delete Record
```
DELETE /api/entity/{entityName}/{id}
```

## Authentication & Authorization

The adapter automatically extracts user context from request headers:

```typescript
// Default headers used:
X-User-Id: user-123
X-User-Role: admin
```

Or provide a custom context provider:

```typescript
app.use(schemaKitElysia(kit, {
  contextProvider: async (request) => {
    const token = request.headers.get('authorization');
    const user = await verifyToken(token); // Your auth logic
    
    return {
      tenantId: user.tenantId,
      user: {
        id: user.id,
        role: user.role,
      },
    };
  },
}));
```

## Entity Filtering

Control which entities are exposed via the API:

```typescript
// Only expose specific entities
app.use(schemaKitElysia(kit, {
  includeEntities: ['users', 'posts', 'comments'],
}));

// Exclude sensitive entities
app.use(schemaKitElysia(kit, {
  excludeEntities: ['system_logs', 'admin_settings'],
}));

// Use regex patterns
app.use(schemaKitElysia(kit, {
  includeEntities: [/^public_/], // Only entities starting with "public_"
  excludeEntities: [/^internal_/], // Exclude entities starting with "internal_"
}));
```

## Error Handling

The adapter provides consistent error responses:

```json
{
  "success": false,
  "error": "User not found",
  "message": "Operation failed",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

All SchemaKit permissions, validations, and workflow errors are automatically handled and returned in this format.

## OpenAPI/Swagger Documentation

When `enableDocs: true` (default), comprehensive API documentation is automatically generated and available at `/docs` (or your configured `docsPath`).

The documentation includes:
- All available endpoints
- Request/response schemas
- Parameter descriptions
- Error responses
- Entity-specific information

## Integration with SchemaKit Features

### Permissions
All SchemaKit permission rules are automatically enforced. If a user doesn't have permission for an operation, the request is rejected with a 403-style error response.

### Validation
SchemaKit field validations are applied automatically on create/update operations. Validation errors are returned in the standardized error format.

### Workflows
Entity workflows are executed automatically:
- `create` workflows run after successful record creation
- `update` workflows run after successful record updates
- `delete` workflows run after successful record deletion

### Multi-tenancy
The adapter supports SchemaKit's multi-tenant architecture through the `tenantId` configuration and context provider.

## Advanced Usage

### Custom Response Transformation

```typescript
import { createSuccessResponse, createErrorResponse } from '@mobtakronio/schemakit-elysia';

// You can use the utility functions in your own routes
app.get('/custom-endpoint', async () => {
  try {
    const data = await someOperation();
    return createSuccessResponse(data, 'Custom operation completed');
  } catch (error) {
    return createErrorResponse(error, 'Custom operation failed');
  }
});
```

### Extending with Custom Routes

```typescript
const app = new Elysia();

// Add SchemaKit routes
app.use(schemaKitElysia(kit));

// Add custom routes that work alongside SchemaKit
app.group('/custom', (app) => 
  app
    .get('/health', () => ({ status: 'ok' }))
    .post('/bulk-import', async ({ body }) => {
      // Custom bulk operations
    })
);
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm dev
```

## License

MIT - see LICENSE file for details.