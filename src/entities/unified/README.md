# Unified Entity Module

The Unified Entity Module provides a consolidated approach to entity management in SchemaKit, combining schema building, CRUD operations, and dynamic entity handling into a single, cohesive handler.

## Overview

The `UnifiedEntityHandler` replaces the previous multi-manager architecture with a single class that handles:
- Entity configuration processing
- CRUD operations with built-in validation
- Permission checking
- Schema generation
- Workflow management (hooks for future implementation)

## Key Components

### 1. UnifiedEntityHandler
The main handler class that processes entity configurations and provides CRUD operations.

```typescript
import { UnifiedEntityHandler } from './unified-entity-handler';

const handler = new UnifiedEntityHandler(dbAdapter, entityConfig, tenantId);
```

### 2. UnifiedEntityFactory
Factory class for creating handlers from database-stored entity configurations.

```typescript
import { UnifiedEntityFactory } from './unified-entity-factory';

const factory = new UnifiedEntityFactory(databaseAdapter);
const userHandler = await factory.createHandler('user');
```

### 3. DatabaseAdapterBridge
Bridges between the handler's expected interface and the existing DatabaseAdapter.

```typescript
import { createDbAdapter } from './adapters/database-adapter-bridge';

const dbAdapter = createDbAdapter(databaseAdapter);
```

## Features

### Configuration Processing
- Transforms raw entity configuration into efficient Map structures
- Processes fields, permissions, workflows, and views
- Supports JSON validation rules

### CRUD Operations
All CRUD methods return standardized result objects:

```typescript
interface OperationResult {
  success: boolean;
  message?: string;
  errors?: ValidationError[];
}
```

#### Create
```typescript
const result = await handler.create({
  name: 'John Doe',
  email: 'john@example.com'
}, 'admin'); // Pass user role
```

#### Read
```typescript
const result = await handler.read({
  page: 1,
  pageSize: 20,
  filters: { status: 'active' },
  sortBy: 'created_at',
  sortOrder: 'DESC'
}, 'user');
```

#### Update
```typescript
const result = await handler.update(id, {
  name: 'Jane Doe'
}, 'admin');
```

#### Delete
```typescript
const result = await handler.delete(id, 'admin');
```

### Validation
- Type validation (string, number, boolean, email, url, uuid, etc.)
- Rule-based validation (minLength, maxLength, min, max, pattern, enum)
- Custom validation functions
- Required field checking (auto-generates ID on create)

### Permissions
Simple role-based permission checking:

```typescript
const canCreate = handler.checkPermission('admin', 'create');
```

### Schema Generation
Generate JSON Schema from entity configuration:

```typescript
const schema = handler.getSchema();
// Returns: { type: 'object', properties: {...}, required: [...] }
```

## Architecture Benefits

1. **Single Responsibility**: One class handles all entity operations
2. **Performance**: Configuration processed once into Maps for O(1) lookups
3. **Type Safety**: Full TypeScript support with comprehensive interfaces
4. **Testability**: Easy to mock and test with clear interfaces
5. **Extensibility**: Clean structure for adding new features

## Migration from Old System

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions.

### Quick Comparison

**Old System:**
```typescript
const entityAPI = new EntityAPI(
  'user',
  entityManager,
  entityDataManager,
  validationManager,
  permissionManager,
  workflowManager
);
const result = await entityAPI.create(data, context);
```

**New System:**
```typescript
const factory = new UnifiedEntityFactory(databaseAdapter);
const userHandler = await factory.createHandler('user');
const result = await userHandler.create(data, 'admin');
```

## Usage Examples

See [example-usage.ts](./example-usage.ts) for comprehensive examples.

## Testing

The module includes comprehensive unit tests. Run them with:

```bash
npm test -- test/entities/unified/unified-entity-handler.test.ts
```

## Future Enhancements

1. **Workflow Execution**: Currently workflows are loaded but not executed
2. **View Processing**: Views are loaded but not used in queries
3. **RLS (Row Level Security)**: Add support for RLS conditions
4. **Field-level Permissions**: Implement field-level permission checking
5. **Batch Operations**: Add support for bulk create/update/delete
6. **Transactions**: Add transaction support for complex operations

## API Reference

### UnifiedEntityHandler Methods

- `create(data: CreateData, userRole?: string): Promise<CreateResult>`
- `read(filters: ReadFilters, userRole?: string): Promise<ReadResult>`
- `update(id: string, data: UpdateData, userRole?: string): Promise<UpdateResult>`
- `delete(id: string, userRole?: string): Promise<DeleteResult>`
- `findById(id: string, userRole?: string): Promise<any>`
- `validateData(data: Record<string, any>, isCreate?: boolean): ValidationResult`
- `checkPermission(role: string, action: string): boolean`
- `getSchema(): JSONSchema`
- `getEntityInfo(): EntityInfo`
- `getFields(): Map<string, Field>`
- `getPermissions(): Map<string, Permission>`
- `getWorkflows(): Map<string, Workflow>`
- `getViews(): Map<string, View>`

### UnifiedEntityFactory Methods

- `createHandler(entityName: string, tenantId?: string): Promise<UnifiedEntityHandler>`
- `clearCache(entityName?: string, tenantId?: string): void`
- `getCacheStats(): { handlerCacheSize: number; cachedEntities: string[] }`