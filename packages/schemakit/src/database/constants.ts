/**
 * Centralized tenancy constants and helpers
 */

export const DEFAULT_TENANT_ID = 'public';

export function resolveTenantId(input?: string | null): string {
  if (typeof input === 'string' && input.trim().length > 0) {
    return input.trim();
  }
  return DEFAULT_TENANT_ID;
}

