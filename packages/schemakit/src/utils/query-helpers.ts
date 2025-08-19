/**
 * Query Building Utilities
 * Common SQL query building functions for SchemaKit
 */

/**
 * Query condition interface
 */
export interface QueryCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin' | 'contains' | 'startswith' | 'endswith' | 'isnull' | 'isnotnull';
  value: any;
}

/**
 * Sort option interface
 */
export interface SortOption {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Pagination options interface
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Built query result interface
 */
export interface BuiltQuery {
  sql: string;
  params: any[];
}

/**
 * Resolve table name for multi-tenant support
 * @param table Base table name
 * @param tenantId Tenant identifier
 * @param databaseType Database type ('postgres', 'sqlite')
 * @returns Qualified table name
 */
export function resolveTableName(table: string, tenantId = 'default', databaseType = 'sqlite'): string {
  if (!tenantId || tenantId === 'default') {
    return table;
  }

  switch (databaseType.toLowerCase()) {
    case 'postgres':
      // PostgreSQL: schema.table format
      return `${tenantId}.${table}`;
    case 'sqlite':
      // SQLite: tenant_table format
      return `${tenantId}_${table}`;
    default:
      return table;
  }
}

/**
 * Build WHERE clause from query conditions
 * @param conditions Array of query conditions
 * @param startParamIndex Starting parameter index (for prepared statements)
 * @returns Built WHERE clause with parameters
 */
export function buildWhereClause(conditions: QueryCondition[], startParamIndex = 1): BuiltQuery {
  if (conditions.length === 0) {
    return { sql: '', params: [] };
  }

  const clauses: string[] = [];
  const params: any[] = [];
  let paramIndex = startParamIndex;

  for (const condition of conditions) {
    const { clause, conditionParams } = buildConditionClause(condition, paramIndex);
    clauses.push(clause);
    params.push(...conditionParams);
    paramIndex += conditionParams.length;
  }

  return {
    sql: clauses.join(' AND '),
    params
  };
}

/**
 * Build a single condition clause
 * @param condition Query condition
 * @param paramIndex Parameter index
 * @returns Built condition clause with parameters
 */
function buildConditionClause(condition: QueryCondition, paramIndex: number): { clause: string; conditionParams: any[] } {
  const { field, operator, value } = condition;
  const escapedField = escapeIdentifier(field);

  switch (operator) {
    case 'eq':
      return { clause: `${escapedField} = $${paramIndex}`, conditionParams: [value] };
    
    case 'neq':
      return { clause: `${escapedField} != $${paramIndex}`, conditionParams: [value] };
    
    case 'gt':
      return { clause: `${escapedField} > $${paramIndex}`, conditionParams: [value] };
    
    case 'gte':
      return { clause: `${escapedField} >= $${paramIndex}`, conditionParams: [value] };
    
    case 'lt':
      return { clause: `${escapedField} < $${paramIndex}`, conditionParams: [value] };
    
    case 'lte':
      return { clause: `${escapedField} <= $${paramIndex}`, conditionParams: [value] };
    
    case 'like':
      return { clause: `${escapedField} LIKE $${paramIndex}`, conditionParams: [value] };
    
    case 'contains':
      return { clause: `${escapedField} ILIKE $${paramIndex}`, conditionParams: [`%${value}%`] };
    
    case 'startswith':
      return { clause: `${escapedField} ILIKE $${paramIndex}`, conditionParams: [`${value}%`] };
    
    case 'endswith':
      return { clause: `${escapedField} ILIKE $${paramIndex}`, conditionParams: [`%${value}`] };
    
    case 'in':
      if (!Array.isArray(value) || value.length === 0) {
        return { clause: '1=0', conditionParams: [] }; // Always false
      }
      const inPlaceholders = value.map((_, i) => `$${paramIndex + i}`).join(', ');
      return { clause: `${escapedField} IN (${inPlaceholders})`, conditionParams: value };
    
    case 'nin':
      if (!Array.isArray(value) || value.length === 0) {
        return { clause: '1=1', conditionParams: [] }; // Always true
      }
      const ninPlaceholders = value.map((_, i) => `$${paramIndex + i}`).join(', ');
      return { clause: `${escapedField} NOT IN (${ninPlaceholders})`, conditionParams: value };
    
    case 'isnull':
      return { clause: `${escapedField} IS NULL`, conditionParams: [] };
    
    case 'isnotnull':
      return { clause: `${escapedField} IS NOT NULL`, conditionParams: [] };
    
    default:
      // Default to equality
      return { clause: `${escapedField} = $${paramIndex}`, conditionParams: [value] };
  }
}

/**
 * Build ORDER BY clause from sort options
 * @param sorting Array of sort options
 * @returns ORDER BY clause string
 */
export function buildOrderClause(sorting: SortOption[]): string {
  if (sorting.length === 0) {
    return '';
  }

  const orderClauses = sorting.map(sort => {
    const escapedField = escapeIdentifier(sort.field);
    const direction = sort.direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return `${escapedField} ${direction}`;
  });

  return `ORDER BY ${orderClauses.join(', ')}`;
}

/**
 * Build LIMIT and OFFSET clause from pagination options
 * @param pagination Pagination options
 * @returns LIMIT/OFFSET clause string
 */
export function buildLimitClause(pagination: PaginationOptions): string {
  const clauses: string[] = [];
  
  if (pagination.limit > 0) {
    clauses.push(`LIMIT ${pagination.limit}`);
  }
  
  if (pagination.offset > 0) {
    clauses.push(`OFFSET ${pagination.offset}`);
  }
  
  return clauses.join(' ');
}

/**
 * Escape SQL identifier (table name, column name, etc.)
 * @param identifier Identifier to escape
 * @returns Escaped identifier
 */
export function escapeIdentifier(identifier: string): string {
  // Remove any existing quotes and escape internal quotes
  const cleaned = identifier.replace(/"/g, '""');
  
  // Wrap in double quotes for PostgreSQL/SQLite compatibility
  return `"${cleaned}"`;
}

/**
 * Build a complete SELECT query
 * @param options Query building options
 * @returns Built SELECT query
 */
export function buildSelectQuery(options: {
  table: string;
  fields?: string[];
  conditions?: QueryCondition[];
  sorting?: SortOption[];
  pagination?: PaginationOptions;
  joins?: JoinClause[];
}): BuiltQuery {
  const {
    table,
    fields = ['*'],
    conditions = [],
    sorting = [],
    pagination,
    joins = []
  } = options;

  let sql = `SELECT ${fields.map(f => f === '*' ? '*' : escapeIdentifier(f)).join(', ')}`;
  sql += ` FROM ${escapeIdentifier(table)}`;
  
  const params: any[] = [];
  let paramIndex = 1;

  // Add JOINs
  if (joins.length > 0) {
    const joinClause = buildJoinClause(joins);
    sql += ` ${joinClause}`;
  }

  // Add WHERE clause
  if (conditions.length > 0) {
    const whereClause = buildWhereClause(conditions, paramIndex);
    sql += ` WHERE ${whereClause.sql}`;
    params.push(...whereClause.params);
    paramIndex += whereClause.params.length;
  }

  // Add ORDER BY clause
  if (sorting.length > 0) {
    const orderClause = buildOrderClause(sorting);
    sql += ` ${orderClause}`;
  }

  // Add LIMIT/OFFSET clause
  if (pagination) {
    const limitClause = buildLimitClause(pagination);
    if (limitClause) {
      sql += ` ${limitClause}`;
    }
  }

  return { sql, params };
}

/**
 * Join clause interface
 */
export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
  alias?: string;
}

/**
 * Build JOIN clauses
 * @param joins Array of join clauses
 * @returns JOIN clause string
 */
export function buildJoinClause(joins: JoinClause[]): string {
  return joins.map(join => {
    const joinType = join.type.toUpperCase();
    const tableName = escapeIdentifier(join.table);
    const alias = join.alias ? ` AS ${escapeIdentifier(join.alias)}` : '';
    return `${joinType} JOIN ${tableName}${alias} ON ${join.on}`;
  }).join(' ');
}

/**
 * Build INSERT query
 * @param table Table name
 * @param data Data to insert
 * @param returning Fields to return (for PostgreSQL)
 * @returns Built INSERT query
 */
export function buildInsertQuery(table: string, data: Record<string, any>, returning?: string[]): BuiltQuery {
  const fields = Object.keys(data);
  const values = Object.values(data);
  
  if (fields.length === 0) {
    throw new Error('No data provided for INSERT query');
  }

  const escapedTable = escapeIdentifier(table);
  const escapedFields = fields.map(f => escapeIdentifier(f)).join(', ');
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
  
  let sql = `INSERT INTO ${escapedTable} (${escapedFields}) VALUES (${placeholders})`;
  
  if (returning && returning.length > 0) {
    const returningFields = returning.map(f => escapeIdentifier(f)).join(', ');
    sql += ` RETURNING ${returningFields}`;
  }

  return { sql, params: values };
}

/**
 * Build UPDATE query
 * @param table Table name
 * @param data Data to update
 * @param conditions WHERE conditions
 * @param returning Fields to return (for PostgreSQL)
 * @returns Built UPDATE query
 */
export function buildUpdateQuery(
  table: string, 
  data: Record<string, any>, 
  conditions: QueryCondition[],
  returning?: string[]
): BuiltQuery {
  const fields = Object.keys(data);
  const values = Object.values(data);
  
  if (fields.length === 0) {
    throw new Error('No data provided for UPDATE query');
  }

  const escapedTable = escapeIdentifier(table);
  const setClause = fields.map((field, i) => `${escapeIdentifier(field)} = $${i + 1}`).join(', ');
  
  let sql = `UPDATE ${escapedTable} SET ${setClause}`;
  const params = [...values];
  const paramIndex = values.length + 1;

  // Add WHERE clause
  if (conditions.length > 0) {
    const whereClause = buildWhereClause(conditions, paramIndex);
    sql += ` WHERE ${whereClause.sql}`;
    params.push(...whereClause.params);
  }

  // Add RETURNING clause
  if (returning && returning.length > 0) {
    const returningFields = returning.map(f => escapeIdentifier(f)).join(', ');
    sql += ` RETURNING ${returningFields}`;
  }

  return { sql, params };
}

/**
 * Build DELETE query
 * @param table Table name
 * @param conditions WHERE conditions
 * @param returning Fields to return (for PostgreSQL)
 * @returns Built DELETE query
 */
export function buildDeleteQuery(
  table: string, 
  conditions: QueryCondition[],
  returning?: string[]
): BuiltQuery {
  const escapedTable = escapeIdentifier(table);
  let sql = `DELETE FROM ${escapedTable}`;
  const params: any[] = [];

  // Add WHERE clause
  if (conditions.length > 0) {
    const whereClause = buildWhereClause(conditions, 1);
    sql += ` WHERE ${whereClause.sql}`;
    params.push(...whereClause.params);
  }

  // Add RETURNING clause
  if (returning && returning.length > 0) {
    const returningFields = returning.map(f => escapeIdentifier(f)).join(', ');
    sql += ` RETURNING ${returningFields}`;
  }

  return { sql, params };
}

/**
 * Build COUNT query
 * @param table Table name
 * @param conditions WHERE conditions
 * @param joins JOIN clauses
 * @returns Built COUNT query
 */
export function buildCountQuery(
  table: string, 
  conditions: QueryCondition[] = [],
  joins: JoinClause[] = []
): BuiltQuery {
  const escapedTable = escapeIdentifier(table);
  let sql = `SELECT COUNT(*) as count FROM ${escapedTable}`;
  const params: any[] = [];

  // Add JOINs
  if (joins.length > 0) {
    const joinClause = buildJoinClause(joins);
    sql += ` ${joinClause}`;
  }

  // Add WHERE clause
  if (conditions.length > 0) {
    const whereClause = buildWhereClause(conditions, 1);
    sql += ` WHERE ${whereClause.sql}`;
    params.push(...whereClause.params);
  }

  return { sql, params };
}

/**
 * Build schema-qualified table name for multi-tenant operations
 * @param schemaName Schema name (tenant ID)
 * @param tableName Table name
 * @returns Qualified table name
 */
export function buildQualifiedTableName(schemaName: string, tableName: string): string {
  return `${escapeIdentifier(schemaName)}.${escapeIdentifier(tableName)}`;
}

/**
 * Parse and validate sort direction
 * @param direction Sort direction string
 * @returns Validated sort direction
 */
export function parseSortDirection(direction: string): 'ASC' | 'DESC' {
  const normalized = direction.toUpperCase();
  return normalized === 'DESC' ? 'DESC' : 'ASC';
}

/**
 * Convert filter object to query conditions
 * @param filters Filter object
 * @returns Array of query conditions
 */
export function filtersToConditions(filters: Record<string, any>): QueryCondition[] {
  const conditions: QueryCondition[] = [];

  for (const [field, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle complex filter objects
      for (const [operator, operatorValue] of Object.entries(value)) {
        conditions.push({
          field,
          operator: operator as QueryCondition['operator'],
          value: operatorValue
        });
      }
    } else {
      // Handle simple equality filters
      conditions.push({
        field,
        operator: 'eq',
        value
      });
    }
  }

  return conditions;
}

/**
 * Build search conditions for full-text search
 * @param searchTerm Search term
 * @param searchFields Fields to search in
 * @param operator Search operator ('contains', 'startswith', 'endswith')
 * @returns Array of search conditions
 */
export function buildSearchConditions(
  searchTerm: string, 
  searchFields: string[], 
  operator: 'contains' | 'startswith' | 'endswith' = 'contains'
): QueryCondition[] {
  if (!searchTerm.trim() || searchFields.length === 0) {
    return [];
  }

  return searchFields.map(field => ({
    field,
    operator,
    value: searchTerm.trim()
  }));
}

/**
 * Combine multiple condition groups with OR logic
 * @param conditionGroups Array of condition groups
 * @returns Combined WHERE clause
 */
export function buildOrConditions(conditionGroups: QueryCondition[][]): BuiltQuery {
  if (conditionGroups.length === 0) {
    return { sql: '', params: [] };
  }

  const groupClauses: string[] = [];
  const allParams: any[] = [];
  let paramIndex = 1;

  for (const group of conditionGroups) {
    if (group.length === 0) continue;

    const groupClause = buildWhereClause(group, paramIndex);
    if (groupClause.sql) {
      groupClauses.push(`(${groupClause.sql})`);
      allParams.push(...groupClause.params);
      paramIndex += groupClause.params.length;
    }
  }

  return {
    sql: groupClauses.join(' OR '),
    params: allParams
  };
}

/**
 * Validate and sanitize table/column names
 * @param name Name to validate
 * @returns True if name is valid
 */
export function isValidIdentifier(name: string): boolean {
  if (typeof name !== 'string' || name.length === 0) {
    return false;
  }

  // Check for SQL injection patterns
  const dangerousPatterns = [
    /;/,           // Statement terminator
    /--/,          // SQL comment
    /\/\*/,        // Block comment start
    /\*\//,        // Block comment end
    /\bDROP\b/i,   // DROP statement
    /\bDELETE\b/i, // DELETE statement
    /\bTRUNCATE\b/i, // TRUNCATE statement
    /\bALTER\b/i,  // ALTER statement
    /\bCREATE\b/i, // CREATE statement
    /\bINSERT\b/i, // INSERT statement
    /\bUPDATE\b/i, // UPDATE statement
    /\bEXEC\b/i,   // EXEC statement
    /\bUNION\b/i   // UNION statement
  ];

  return !dangerousPatterns.some(pattern => pattern.test(name));
}

/**
 * Process value for specific operators
 * @param operator Filter operator
 * @param value Filter value
 */
export function processFilterValue(operator: string, value: any): any {
  switch (operator) {
    case 'contains':
      return `%${value}%`;
    case 'startswith':
      return `${value}%`;
    case 'endswith':
      return `%${value}`;
    case 'like':
      return value; // Assume user provides wildcards
    default:
      return value;
  }
}

/**
 * Build table creation SQL (basic structure)
 * @param tableName Table name
 * @param columns Column definitions
 * @returns CREATE TABLE SQL
 */
export function buildCreateTableQuery(tableName: string, columns: Array<{
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  defaultValue?: any;
}>): string {
  const escapedTable = escapeIdentifier(tableName);
  
  const columnDefs = columns.map(col => {
    let def = `${escapeIdentifier(col.name)} ${col.type}`;
    
    if (col.primaryKey) def += ' PRIMARY KEY';
    if (col.unique && !col.primaryKey) def += ' UNIQUE';
    if (col.nullable === false) def += ' NOT NULL';
    if (col.defaultValue !== undefined) {
      def += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
    }
    
    return def;
  });

  return `CREATE TABLE ${escapedTable} (${columnDefs.join(', ')})`;
}