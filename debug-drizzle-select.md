# Debug Version of DrizzleAdapter select method

The issue is that the query has parameter placeholders but the params array is empty. Here's what needs to be checked:

```typescript
async select(table: string, filters: QueryFilter[], options: QueryOptions): Promise<any[]> {
  console.log('DrizzleAdapter.select called with:', {
    table,
    filters,
    options
  });
  
  let query = `SELECT * FROM ${table}`;
  const params: any[] = [];
  const conditions: string[] = [];
  
  // Build filter conditions
  filters.forEach(filter => {
    console.log('Processing filter:', filter);
    const op = this.getOperator(filter.operator || 'eq');
    conditions.push(`${filter.field} ${op} ${this.placeholder(params.length)}`);
    params.push(filter.value);
    console.log('Added param:', filter.value, 'at index:', params.length - 1);
  });
  
  console.log('Built conditions:', conditions);
  console.log('Params array:', params);
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  // ... rest of the method
  
  console.log('Final query:', query);
  console.log('Final params:', params);
  
  return await this.query(query, params);
}
```

The issue might be:

1. **The filters array is empty** - Check if filters are being passed correctly from the DB class
2. **The placeholder method is returning wrong format** - Check if it's returning `$1`, `$2` for Postgres
3. **The params array is being cleared somewhere** - Check if there's any code that might clear it

Based on the error, it seems like the query is being built correctly (it has `$1` and `$2`), but the params array is empty. This suggests that either:
- The filters array is empty when it shouldn't be
- The params are being lost between building the query and executing it