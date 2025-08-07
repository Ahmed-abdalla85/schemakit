# Fix for Drizzle Parameter Issue

## The Problem
The query is built correctly with placeholders (`$1`, `$2`) but the params array is empty when passed to `sql.raw`.

## Root Cause
Looking at the error and the fact that commenting out the WHERE clause makes it work, the issue is likely in how `sql.raw` is being called in the `query` method.

## The Fix

In the DrizzleAdapter's `query` method, the issue might be with how parameters are passed to `sql.raw`. The current code might be:

```typescript
async query<T = any>(sqlQuery: string, params?: any[]): Promise<T[]> {
  if (!this.isConnected()) await this.connect();

  try {
    // This might be the issue - sql.raw might not be handling params correctly
    const preparedQuery = params?.length 
      ? this.sql!.raw(sqlQuery, params)
      : this.sql!.raw(sqlQuery);
    
    const result = await this.db!.execute(preparedQuery);
    return Array.isArray(result) ? result : (result.rows || []);
  } catch (error) {
    throw new DatabaseError('query', { cause: error, context: { sql: sqlQuery, params } });
  }
}
```

The fix is to use Drizzle's sql template literal properly:

```typescript
async query<T = any>(sqlQuery: string, params?: any[]): Promise<T[]> {
  if (!this.isConnected()) await this.connect();

  try {
    let result;
    
    if (params && params.length > 0) {
      // For parameterized queries, we need to handle them differently
      // Drizzle's sql.raw doesn't work well with positional parameters
      // We need to use the underlying driver directly
      if (this.dbType === 'postgres') {
        result = await this.client.query(sqlQuery, params);
        return result.rows || [];
      } else if (this.dbType === 'mysql') {
        const [rows] = await this.client.execute(sqlQuery, params);
        return rows;
      } else {
        // SQLite - use prepared statement
        const stmt = this.client.prepare(sqlQuery);
        return stmt.all(...params);
      }
    } else {
      // For non-parameterized queries, use Drizzle
      const preparedQuery = this.sql!.raw(sqlQuery);
      result = await this.db!.execute(preparedQuery);
      return Array.isArray(result) ? result : (result.rows || []);
    }
  } catch (error) {
    throw new DatabaseError('query', { cause: error, context: { sql: sqlQuery, params } });
  }
}
```

This bypasses Drizzle's sql.raw for parameterized queries and uses the underlying database drivers directly, which properly handle positional parameters.