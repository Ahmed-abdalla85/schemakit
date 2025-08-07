# Fix for Query Parameter Issue

## Problem
The error shows that SQL queries are being generated with parameter placeholders (`$1`, `$2`) but the parameters array is empty. This happens when the table name includes a schema prefix (e.g., `system.system_entities`).

## Root Cause
In the DrizzleAdapter's `select` method, when filters are processed, the parameters are being added to the `params` array, but they're not being passed correctly to the `query` method.

## Solution
The DrizzleAdapter needs to:

1. Properly escape schema-qualified table names
2. Ensure field names are properly quoted
3. Pass parameters correctly to the query method

## Code Changes Needed

In `/workspace/packages/schemakit/src/database/adapters/drizzle.ts`:

```typescript
// Update the select method:
async select(table: string, filters: QueryFilter[], options: QueryOptions): Promise<any[]> {
  // Properly escape table name
  const escapedTable = this.escapeTableName(table);
  
  let query = `SELECT * FROM ${escapedTable}`;
  const params: any[] = [];
  const conditions: string[] = [];
  
  // Build filter conditions
  filters.forEach(filter => {
    const op = this.getOperator(filter.operator || 'eq');
    conditions.push(`${this.escapeIdentifier(filter.field)} ${op} ${this.placeholder(params.length)}`);
    params.push(filter.value);
  });
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  // Add ordering
  if (options.orderBy?.length) {
    query += ` ORDER BY ${options.orderBy.map(o => 
      `${this.escapeIdentifier(o.field)} ${o.direction}`
    ).join(', ')}`;
  }
  
  // Add pagination
  if (options.limit) query += ` LIMIT ${options.limit}`;
  if (options.offset) query += ` OFFSET ${options.offset}`;
  
  return await this.query(query, params);
}

// Add helper methods:
private escapeIdentifier(identifier: string): string {
  // Don't escape if already quoted
  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier;
  }
  // Handle schema.table format
  if (identifier.includes('.')) {
    return identifier.split('.').map(part => `"${part}"`).join('.');
  }
  return `"${identifier}"`;
}

private escapeTableName(table: string): string {
  // Handle schema.table format
  if (table.includes('.')) {
    const parts = table.split('.');
    return parts.map(part => `"${part}"`).join('.');
  }
  return `"${table}"`;
}
```

## Alternative Quick Fix

If you need a quick fix, you can modify the DB class to not use schema-based multi-tenancy for system tables. In the `resolveTableName` method:

```typescript
private resolveTableName(table: string): string {
  // Don't apply multi-tenancy to system tables
  if (table.startsWith('system_')) {
    return table;
  }
  
  switch (this.multiTenancy.strategy) {
    case 'schema':
      // For schema-based, prepend schema name
      return `${this.tenantId}.${table}`;
    // ... rest of the method
  }
}
```