# Fix for Entity Name Parameter Issue

## The Problem
The query is receiving the literal string `"{entityName}"` instead of the actual entity name value.

```
params: [ "active", "{entityName}" ]  // Wrong - literal string
params: [ "active", "users" ]          // Correct - actual entity name
```

## Root Cause
In the Entity class, when building the where clause for loading the entity definition, the code is passing a template string instead of the actual entity name.

## The Fix

In `/workspace/packages/schemakit/src/entities/entity/entity.ts`, in the `loadEntityDefinition` method:

Find:
```typescript
.where({ entity_status: 'active', entity_name: '{entityName}' })
```

Replace with:
```typescript
.where({ entity_status: 'active', entity_name: this.entityName })
```

The issue is that someone used a template literal syntax in the where clause object instead of using the actual property value.

## Quick Fix
Search for `{entityName}` in the entity.ts file and replace it with `this.entityName`.