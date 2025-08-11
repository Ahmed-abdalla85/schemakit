import type { FieldDefinition } from '../../types/core';
import type {
  CompiledSchema,
  UnknownFieldPolicy,
  ValidationAdapter,
  ValidationAction,
  ValidationIssue,
  ValidationResult,
} from '../adapter';

function isValidIdentifier(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

function coerceType(value: any, type: string): any {
  if (value == null) return value;
  switch (type) {
    case 'string':
      return String(value);
    case 'integer': {
      const n = Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : value;
    }
    case 'number': {
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const v = value.toLowerCase();
        if (v === 'true' || v === '1') return true;
        if (v === 'false' || v === '0') return false;
      }
      return Boolean(value);
    case 'datetime': {
      if (value instanceof Date) return value;
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? value : d.toISOString();
    }
    case 'json':
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    case 'array':
      return Array.isArray(value) ? value : [value];
    default:
      return value;
  }
}

export class SimpleValidationAdapter implements ValidationAdapter {
  name = 'simple';

  buildSchema(
    entityId: string,
    fields: FieldDefinition[],
    options?: { unknownFieldPolicy?: UnknownFieldPolicy }
  ): CompiledSchema {
    const fieldMap: CompiledSchema['fieldMap'] = {};
    const allowedKeys = new Set<string>();
    for (const f of fields) {
      fieldMap[f.field_name] = {
        type: f.field_type,
        required: Boolean(f.field_is_required),
      };
      allowedKeys.add(f.field_name);
    }
    return {
      entityId,
      fieldMap,
      allowedKeys,
      unknownFieldPolicy: options?.unknownFieldPolicy ?? 'strip',
    };
  }

  validate(
    action: ValidationAction,
    schema: CompiledSchema,
    input: unknown
  ): ValidationResult<Record<string, any>> {
    if (typeof input !== 'object' || input === null) {
      return { ok: false, errors: [{ path: '', message: 'Invalid payload', code: 'invalid' }] };
    }
    const data: Record<string, any> = {};
    const issues: ValidationIssue[] = [];

    // Unknown field handling
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      if (!isValidIdentifier(key) || !schema.allowedKeys.has(key)) {
        if (schema.unknownFieldPolicy === 'error') {
          issues.push({ path: key, message: 'Unknown field', code: 'unknown' });
        }
        // strip or error; skip assignment
        continue;
      }
      const spec = schema.fieldMap[key];
      data[key] = coerceType(value, spec.type);
    }

    // Required check
    for (const [key, spec] of Object.entries(schema.fieldMap)) {
      if (spec.required && (data[key] === undefined || data[key] === null)) {
        // On update, allow missing unless explicitly required
        if (action === 'update' && data[key] === undefined) continue;
        issues.push({ path: key, message: 'Field is required', code: 'required' });
      }
    }

    return issues.length > 0 ? { ok: false, errors: issues } : { ok: true, data };
  }

  sanitizeFilters(
    schema: CompiledSchema,
    filters: Record<string, any>
  ): { filters: Record<string, any>; errors?: ValidationIssue[] } {
    const out: Record<string, any> = {};
    const issues: ValidationIssue[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (!isValidIdentifier(key) || !schema.allowedKeys.has(key)) {
        issues.push({ path: key, message: 'Unknown filter field', code: 'unknown' });
        continue;
      }
      const spec = schema.fieldMap[key];
      out[key] = coerceType(value, spec.type);
    }
    return { filters: out, errors: issues.length ? issues : undefined };
  }
}


