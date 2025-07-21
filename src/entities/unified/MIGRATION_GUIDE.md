# Migration Guide: From EntityAPI to UnifiedEntityHandler

This guide helps you migrate from the old multi-manager entity system to the new UnifiedEntityHandler.

## Overview of Changes

### Old Structure
```typescript
// Multiple managers needed
const entityManager = new EntityManager(databaseManager);
const entityDataManager = new EntityDataManager(databaseManager);
const validationManager = new ValidationManager();
const permissionManager = new PermissionManager();
const workflowManager = new WorkflowManager();

// Create EntityAPI
const entityAPI = new EntityAPI(
  'user',
  entityManager,
  entityDataManager,
  validationManager,
  permissionManager,
  workflowManager,
  'default'
);
```

### New Structure
```typescript
// Single factory
const factory = new UnifiedEntityFactory(databaseAdapter);

// Create handler
const userHandler = await factory.createHandler('user');
```

## Key Benefits

1. **Simplified API**: One class handles all entity operations
2. **Better Performance**: Configuration processed once into efficient Maps
3. **Cleaner Code**: No need to manage multiple managers
4. **Type Safety**: Improved TypeScript support
5. **Easier Testing**: Single class to mock

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { EntityManager } from './entities/entity/entity-manager';
import { EntityDataManager } from './entities/entity/entity-data-manager';
import { EntityAPI } from './entities/entity/entity-api';
// ... other manager imports
```

**After:**
```typescript
import { UnifiedEntityFactory } from './entities/unified';
```

### Step 2: Replace Manager Creation

**Before:**
```typescript
const databaseManager = new DatabaseManager(adapter);
const entityManager = new EntityManager(databaseManager);
const entityDataManager = new EntityDataManager(databaseManager);
// ... create other managers

const userAPI = new EntityAPI('user', entityManager, ...);
```

**After:**
```typescript
const factory = new UnifiedEntityFactory(adapter);
const userHandler = await factory.createHandler('user');
```

### Step 3: Update CRUD Operations

#### Create
**Before:**
```typescript
const result = await entityAPI.create(data, context);
```

**After:**
```typescript
const result = await userHandler.create(data, context.user?.roles?.[0]);
```

#### Read
**Before:**
```typescript
const results = await entityAPI.read(filters, context);
```

**After:**
```typescript
const results = await userHandler.read({
  page: 1,
  pageSize: 20,
  filters: filters,
  sortBy: 'created_at',
  sortOrder: 'DESC'
}, context.user?.roles?.[0]);
```

#### Update
**Before:**
```typescript
const result = await entityAPI.update(id, data, context);
```

**After:**
```typescript
const result = await userHandler.update(id, data, context.user?.roles?.[0]);
```

#### Delete
**Before:**
```typescript
const result = await entityAPI.delete(id, context);
```

**After:**
```typescript
const result = await userHandler.delete(id, context.user?.roles?.[0]);
```

### Step 4: Update Schema Access

**Before:**
```typescript
const schema = await entityAPI.schema;
const fields = await entityAPI.fields;
```

**After:**
```typescript
const schema = userHandler.getSchema();
const fields = userHandler.getFields();
```

### Step 5: Update Permission Checks

**Before:**
```typescript
const allowed = await permissionManager.checkPermission(
  entityConfig,
  'create',
  context
);
```

**After:**
```typescript
const allowed = userHandler.checkPermission('admin', 'create');
```

## API Comparison

### EntityAPI vs UnifiedEntityHandler

| Operation | EntityAPI | UnifiedEntityHandler |
|-----------|-----------|---------------------|
| Create | `create(data, context)` | `create(data, userRole?)` |
| Read | `read(filters, context)` | `read(filters, userRole?)` |
| Update | `update(id, data, context)` | `update(id, data, userRole?)` |
| Delete | `delete(id, context)` | `delete(id, userRole?)` |
| Find by ID | `findById(id, context)` | `findById(id, userRole?)` |
| Get Schema | `await schema` | `getSchema()` |
| Get Fields | `await fields` | `getFields()` |
| Clear Cache | `clearCache()` | Factory: `clearCache(entityName?)` |

## Complete Example

### Before (Old System)
```typescript
import { DatabaseManager } from './database/database-manager';
import { EntityManager } from './entities/entity/entity-manager';
import { EntityDataManager } from './entities/entity/entity-data-manager';
import { ValidationManager } from './entities/validation/validation-manager';
import { PermissionManager } from './entities/permission/permission-manager';
import { WorkflowManager } from './entities/workflow/workflow-manager';
import { EntityAPI } from './entities/entity/entity-api';

async function oldWay() {
  // Setup
  const adapter = await DatabaseAdapter.create('sqlite');
  const databaseManager = new DatabaseManager(adapter);
  const entityManager = new EntityManager(databaseManager);
  const entityDataManager = new EntityDataManager(databaseManager);
  const validationManager = new ValidationManager();
  const permissionManager = new PermissionManager();
  const workflowManager = new WorkflowManager();

  // Create API
  const userAPI = new EntityAPI(
    'user',
    entityManager,
    entityDataManager,
    validationManager,
    permissionManager,
    workflowManager
  );

  // Use
  const context = {
    user: { id: '123', roles: ['admin'] },
    tenantId: 'default'
  };

  const result = await userAPI.create({
    name: 'John Doe',
    email: 'john@example.com'
  }, context);
}
```

### After (New System)
```typescript
import { DatabaseAdapter } from './database/adapter';
import { UnifiedEntityFactory } from './entities/unified';

async function newWay() {
  // Setup
  const adapter = await DatabaseAdapter.create('sqlite');
  const factory = new UnifiedEntityFactory(adapter);

  // Create handler
  const userHandler = await factory.createHandler('user');

  // Use
  const result = await userHandler.create({
    name: 'John Doe',
    email: 'john@example.com'
  }, 'admin');
}
```

## Breaking Changes

1. **Context Parameter**: Instead of passing full context, just pass the user role
2. **Synchronous Schema Access**: Schema methods are now synchronous
3. **Result Format**: All CRUD operations return standardized result objects with `success` field
4. **Cache Management**: Cache is managed at factory level, not handler level

## Gradual Migration

You can migrate gradually by running both systems side by side:

```typescript
// Keep old system for existing code
const oldUserAPI = new EntityAPI(...);

// Use new system for new features
const factory = new UnifiedEntityFactory(adapter);
const newUserHandler = await factory.createHandler('user');

// Gradually migrate endpoints
app.post('/api/users/old', async (req, res) => {
  const result = await oldUserAPI.create(req.body, req.context);
  res.json(result);
});

app.post('/api/users/new', async (req, res) => {
  const result = await newUserHandler.create(req.body, req.user.role);
  res.json(result);
});
```

## Testing

The new system is easier to test:

```typescript
// Mock the DbAdapter
const mockDb: DbAdapter = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn()
};

// Create handler with mock
const handler = new UnifiedEntityHandler(mockDb, entityConfig, 'test');

// Test
const result = await handler.create({ name: 'Test' }, 'admin');
expect(mockDb.insert).toHaveBeenCalled();
```

## Troubleshooting

### Issue: Missing permissions
**Solution**: Ensure permissions are properly mapped in the database. The new system expects boolean flags for each permission.

### Issue: Validation not working
**Solution**: Check that `field_validation_rules` in the database is valid JSON or an object.

### Issue: Cache not clearing
**Solution**: Use `factory.clearCache(entityName)` instead of handler-level cache clearing.

## Next Steps

1. Start with non-critical entities
2. Test thoroughly with your permission system
3. Monitor performance improvements
4. Gradually migrate all entities
5. Remove old manager dependencies

For questions or issues, please refer to the example usage in `example-usage.ts`.