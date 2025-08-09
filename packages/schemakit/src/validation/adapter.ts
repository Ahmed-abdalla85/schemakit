import type { FieldDefinition } from '../types/core';

export type UnknownFieldPolicy = 'allow' | 'strip' | 'error';
export type ValidationAction = 'create' | 'update';

export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

export interface ValidationResult<T = any> {
  ok: boolean;
  data?: T;
  errors?: ValidationIssue[];
}

/**
 * Opaque compiled schema representation for a specific entity.
 */
export interface CompiledSchema {
  entityId: string;
  fieldMap: Record<string, { type: string; required: boolean }>;
  allowedKeys: Set<string>;
  unknownFieldPolicy: UnknownFieldPolicy;
}

export interface ValidationAdapter {
  name: string;
  buildSchema(
    entityId: string,
    fields: FieldDefinition[],
    options?: { unknownFieldPolicy?: UnknownFieldPolicy }
  ): CompiledSchema;

  validate(
    action: ValidationAction,
    schema: CompiledSchema,
    input: unknown
  ): ValidationResult<Record<string, any>>;

  sanitizeFilters?(
    schema: CompiledSchema,
    filters: Record<string, any>
  ): { filters: Record<string, any>; errors?: ValidationIssue[] };
}


