# @mobtakronio/schemakit-api

Shared API utilities and middleware for all SchemaKit framework adapters. This package contains framework-agnostic logic that can be reused across Elysia, Express, Fastify, NestJS and other framework adapters.

## 🎯 Purpose

This package provides the foundation for building consistent REST APIs across different web frameworks while keeping the SchemaKit core framework-agnostic. It demonstrates how common API functionality can be extracted and shared.

## 📦 What's Included

### Response Helpers
Standardized response formatting for all adapters:

```typescript
import { ResponseHelpers } from '@mobtakronio/schemakit-api';

// Success response
const response = ResponseHelpers.success(data, 'Operation completed');

// Error response
const error = ResponseHelpers.error(new Error('Something went wrong'));

// Paginated response
const paginated = ResponseHelpers.paginated(records, page, limit, total);
```

### CRUD Operations
Framework-agnostic business logic:

```typescript
import { CrudOperations } from '@mobtakronio/schemakit-api';

// Create record
const result = await CrudOperations.createRecord(entity, data, context);

// List records with pagination
const list = await CrudOperations.listRecords(entity, query, context);

// Get single record
const record = await CrudOperations.getRecord(entity, id, context);

// Update record
const updated = await CrudOperations.updateRecord(entity, id, data, context);

// Delete record
const deleted = await CrudOperations.deleteRecord(entity, id, context);
```

### Middleware Builders
Reusable patterns for common concerns:

```typescript
import { PermissionMiddleware, ValidationMiddleware, ErrorHandler } from '@mobtakronio/schemakit-api';

// Permission checking
const permissionChecker = PermissionMiddleware.createChecker({
  contextExtractor: (req) => extractUserContext(req),
  entityName: 'users',
  operation: 'create'
});

// Request validation
const validator = ValidationMiddleware.createValidator({
  validateBody: (body) => validateUserData(body)
});

// Error handling
const errorHandler = ErrorHandler.createHandler({
  logErrors: true,
  includeStack: process.env.NODE_ENV === 'development'
});
```

### Schema Generators
OpenAPI and route generation:

```typescript
import { OpenAPIGenerator, RouteGenerator } from '@mobtakronio/schemakit-api';

// Generate OpenAPI spec
const spec = OpenAPIGenerator.generateSpec({
  title: 'My API',
  entities: ['users', 'posts']
});

// Generate route metadata
const routes = RouteGenerator.generateEntityRoutes('users');
```

### Framework Adapter Interface
Base class and interface for building adapters:

```typescript
import { BaseFrameworkAdapter, FrameworkAdapter } from '@mobtakronio/schemakit-api';

class MyFrameworkAdapter extends BaseFrameworkAdapter<MyApp, MyRequest, MyResponse> {
  registerEntityRoutes(entityName: string) {
    // Framework-specific route registration
  }
  
  async handleRequest(request: MyRequest): Promise<MyResponse> {
    // Framework-specific request handling
  }
  
  setupMiddleware() {
    // Framework-specific middleware setup
  }
}
```

## 🔧 Framework Integration Examples

### Elysia Adapter (Current)
```typescript
// In @mobtakronio/schemakit-elysia
import { ResponseHelpers, CrudOperations } from '@mobtakronio/schemakit-api';

app.post('/entity/:entityName', async ({ params, body, request }) => {
  const entity = await getEntity(params.entityName);
  const context = await getContext(request);
  
  // Use shared CRUD logic
  return await CrudOperations.createRecord(entity, body, context);
});
```

### Express Adapter (Future)
```typescript
// In @mobtakronio/schemakit-express  
import { ResponseHelpers, CrudOperations } from '@mobtakronio/schemakit-api';

app.post('/entity/:entityName', async (req, res) => {
  const entity = await getEntity(req.params.entityName);
  const context = await getContext(req);
  
  // Same shared CRUD logic
  const result = await CrudOperations.createRecord(entity, req.body, context);
  res.json(result);
});
```

### Fastify Adapter (Future)
```typescript
// In @mobtakronio/schemakit-fastify
import { ResponseHelpers, CrudOperations } from '@mobtakronio/schemakit-api';

fastify.post('/entity/:entityName', async (request, reply) => {
  const entity = await getEntity(request.params.entityName);
  const context = await getContext(request);
  
  // Same shared CRUD logic
  return await CrudOperations.createRecord(entity, request.body, context);
});
```

## 🏗️ Architecture Benefits

### Consistency
- All framework adapters use the same response format
- Identical CRUD operations across frameworks
- Shared validation and error handling patterns

### Maintainability
- Bug fixes in shared logic benefit all adapters
- Feature additions are automatically available to all frameworks
- Centralized business logic reduces duplication

### Developer Experience
- Easy to switch between frameworks
- Familiar API across all adapters
- Consistent behavior regardless of framework choice

### Future-Proof
- New framework adapters can be built quickly
- Shared logic evolves independently of framework specifics
- Easy to add new features across all adapters

## 📋 Current Status

This package is currently a **foundation/placeholder** demonstrating the architecture for shared API logic. The utilities shown here are extracted patterns from the Elysia adapter and represent how future framework adapters could share common functionality.

## 🚀 Next Steps

1. **Extract from Elysia**: Move actual utilities from the Elysia adapter to this package
2. **Build Express Adapter**: Create `@mobtakronio/schemakit-express` using these shared utilities
3. **Add Advanced Features**: Caching, rate limiting, metrics collection
4. **Framework-Specific Optimizations**: Leverage unique framework features while maintaining consistency

## 🤝 Contributing

This package demonstrates the architecture for building framework adapters. When contributing:

1. Keep utilities framework-agnostic
2. Use generic interfaces that can map to any framework
3. Focus on reusable patterns and common concerns
4. Maintain consistency with the existing adapter(s)

## 📄 License

MIT - see LICENSE file for details.