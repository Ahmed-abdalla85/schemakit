import { generateId } from '../../utils/id-generation';
import { getCurrentTimestamp } from '../../utils/date-helpers';

export function getPrimaryKeyFieldNameFromTable(tableName: string): string {
  return `${tableName}_id`;
}

export function buildCreateRow(
  input: Record<string, any>,
  tableName: string,
  context: { user?: { id?: string | number } }
): Record<string, any> {
  const pkField = getPrimaryKeyFieldNameFromTable(tableName);
  const id = input.id || (input as any)[pkField] || generateId();
  const now = getCurrentTimestamp();
  return {
    ...input,
    id,
    [pkField]: id,
    created_at: now,
    updated_at: now,
    ...(context.user?.id && {
      created_by: context.user.id,
      updated_by: context.user.id,
    }),
  };
}

export function buildUpdateRow(
  input: Record<string, any>,
  tableName: string,
  context: { user?: { id?: string | number } }
): Record<string, any> {
  const pkField = getPrimaryKeyFieldNameFromTable(tableName);
  const now = getCurrentTimestamp();
  const row: Record<string, any> = {
    ...input,
    updated_at: now,
    ...(context.user?.id && { updated_by: context.user.id }),
  };
  delete row.id;
  delete (row as any)[pkField];
  return row;
}

