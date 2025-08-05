/**
 * SchemaKit Types - Professional Domain-Based Type System
 * 
 * This module provides a comprehensive, organized type system for SchemaKit's
 * runtime schema engine. Types are organized by domain for better maintainability
 * and discoverability.
 * 
 * ## Import Patterns
 * 
 * ### Option 1: Import common types from main module
 * ```typescript
 * import { 
 *   EntityDefinition, 
 *   FieldDefinition, 
 *   Context,
 *   ViewOptions,
 *   RLSCondition 
 * } from '@/types';
 * ```
 * 
 * ### Option 2: Import from specific domains for clarity
 * ```typescript
 * import { EntityDefinition, FieldDefinition } from '@/types/core';
 * import { ViewDefinition, ViewResult } from '@/types/views';
 * import { RLSCondition, RoleRestrictions } from '@/types/permissions';
 * import { WorkflowDefinition } from '@/types/workflows';
 * import { ValidationResult } from '@/types/validation';
 * import { QueryFilter, QueryOptions } from '@/types/database';
 * ```
 * 
 * ## Domain Organization
 * 
 * - **core/**: Entity definitions, SchemaKit configuration, common types
 * - **database/**: Query building, results, and adapter interfaces
 * - **permissions/**: RBAC permissions and row-level security (RLS)
 * - **views/**: View definitions, execution options, and results
 * - **workflows/**: Automation and business process definitions
 * - **validation/**: Data validation and error handling
 * 
 * @since 0.1.0
 */

// Core types - Most commonly used across SchemaKit
export * from './core';

// Domain-specific modules (can be imported directly for clarity)
export * from './database';
export * from './permissions'; 
export * from './views';
export * from './workflows';
export * from './validation';

// Convenience re-exports for most common types to reduce import complexity
export type {
  // Core essentials - Entity and field definitions
  EntityDefinition,
  FieldDefinition,
  EntityConfiguration,
  Context,
  SchemaKitOptions,
  FieldType,
  OperationType,
} from './core';

export type {
  // Database essentials - Query building and results
  QueryFilter,
  QueryOptions,
  QueryResult,
  BuiltQuery,
} from './database';

export type {
  // Permission essentials - RBAC and RLS
  PermissionDefinition,
  RLSCondition,
  RLSRule,
  RLSDefinition,
  RoleRestrictions,
} from './permissions';

export type {
  // View essentials - Query templates and execution
  ViewDefinition,
  ViewOptions,
  ViewResult,
  PaginationOptions,
  SortDefinition,
  JoinDefinition,
} from './views';

export type {
  // Workflow essentials - Business process automation
  WorkflowDefinition,
  WorkflowAction,
} from './workflows';

export type {
  // Validation essentials - Data integrity and error handling
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './validation';