import { generateId } from '../utils/id-generation';
import { getCurrentTimestamp } from '../utils/date-helpers';

export function getPrimaryKeyColumn(prefix: string): string {
  return `${prefix}_id`;
}

export function buildCreateRow(
  input: Record<string, any>,
  columnPrefix: string,
  context: { user?: { id?: string | number } }
): Record<string, any> {
  const pkField = getPrimaryKeyColumn(columnPrefix);
  const id = input.id || (input as any)[pkField] || generateId();
  const now = getCurrentTimestamp();
  return {
    ...input,
    id,
    [pkField]: id,
    [`${columnPrefix}_created_at`]: now,
    [`${columnPrefix}_modified_at`]: now,
    ...(context.user?.id && {
      [`${columnPrefix}_created_by`]: context.user.id,
      [`${columnPrefix}_modified_by`]: context.user.id,
    }),
  };
}

export function buildUpdateRow(
  input: Record<string, any>,
  columnPrefix: string,
  context: { user?: { id?: string | number } }
): Record<string, any> {
  const pkField = getPrimaryKeyColumn(columnPrefix);
  const now = getCurrentTimestamp();
  const row: Record<string, any> = {
    ...input,
    [`${columnPrefix}_modified_at`]: now,
    ...(context.user?.id && { [`${columnPrefix}_modified_by`]: context.user.id }),
  };
  delete row.id;
  delete (row as any)[pkField];
  return row;
}

