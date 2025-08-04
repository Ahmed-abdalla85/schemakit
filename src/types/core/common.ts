/**
 * Common base types used across SchemaKit
 */

export type FieldType = 
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'object'
  | 'array'
  | 'reference'
  | 'computed';

export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'list';

export type SortDirection = 'asc' | 'desc';

export type JoinType = 'inner' | 'left' | 'right';

export type WorkflowTrigger = 'create' | 'update' | 'delete' | 'field_change';