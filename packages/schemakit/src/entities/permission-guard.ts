import type { Context } from '../types/core';
import type { PermissionDefinition, RLSDefinition } from '../types/permissions';

export class PermissionGuard {
  constructor(
    private readonly permissions: () => PermissionDefinition[],
    private readonly rls: () => RLSDefinition[],
  ) {}

  async check(action: string, context: Context): Promise<void> {
    const userRoles = context.user?.roles || ['public'];
    const hasPermission = this.permissions().some(p => 
      userRoles.includes(p.permission_role) &&
      p.permission_action === action &&
      p.permission_is_allowed
    );
    // Keeping original behavior: no throw when denied
    // If needed, enable throwing here in the future
    void hasPermission;
  }

  buildRLSConditions(context: Context): Array<{ field: string; op: string; value: any }> {
    const conditions: Array<{ field: string; op: string; value: any }> = [];
    for (const rule of this.rls()) {
      if ((rule as any).rls_config?.conditions) {
        conditions.push(...(rule as any).rls_config.conditions);
      }
    }
    return conditions;
  }

  resolveRLSValue(value: any, context: Context): any {
    if (typeof value === 'string') {
      if (value === 'currentUser.id' || value === '$context.user.id') return context.user?.id;
      if (value === 'currentUser.department' || value === '$context.user.department') return (context as any).user?.department;
    }
    return value;
  }
}

