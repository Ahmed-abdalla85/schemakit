import type { Context } from '../types/core';
import type { PermissionDefinition, RLSDefinition, RoleRestrictions } from '../types/permissions';
import type { QueryFilter } from '../database/adapter';

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

  /**
   * Enhanced API: pick the most specific role when multiple roles provided
   * - If numeric roles exist, chooses the highest numeric value
   * - Else, returns the first matching role in user roles order
   */
  private selectEffectiveRole(userRoles: string[], restrictions: Record<string, any[]>): string | undefined {
    const matching = userRoles.filter((r) => Object.prototype.hasOwnProperty.call(restrictions, r));
    if (matching.length === 0) return undefined;
    const numeric = matching.map((r) => ({ r, n: Number(r) })).filter(x => Number.isFinite(x.n));
    if (numeric.length > 0) return numeric.sort((a, b) => b.n - a.n)[0].r;
    return matching[0];
  }

  /**
   * Build query filters from RLS definitions and user context, merging exposed inputs
   */
  buildQueryFilters(context: Context, userInputs: Record<string, any> = {}): QueryFilter[] {
    const filters: QueryFilter[] = [];
    const userRoles = context.user?.roles || [];
    const restrictionsMap: Record<string, any[]> = {};
    for (const rule of this.rls()) {
      const cfg = (rule as any).rls_config;
      if (cfg && cfg.role) {
        restrictionsMap[cfg.role] = cfg.rules || cfg.conditions ? [cfg] : [cfg];
      }
    }
    const chosen = this.selectEffectiveRole(userRoles, restrictionsMap);
    const group = chosen ? restrictionsMap[chosen]?.[0] : undefined;
    const conditions: any[] = group?.conditions || [];
    for (const c of conditions) {
      const op = (c.op || c.operator || 'eq').toLowerCase();
      let value = c.value;
      if (c.exposed && userInputs[c.field] != null) value = userInputs[c.field];
      value = this.resolveRLSValue(value, context);
      const mappedOp = this.mapOperator(op);
      filters.push({ field: c.field, operator: mappedOp, value });
    }
    return filters;
  }

  /**
   * Return exposed conditions for UI from RLS, based on user roles
   */
  getExposedConditions(context: Context): Array<{ field: string; op: string; value: any; exposed: boolean }> {
    const userRoles = context.user?.roles || [];
    const restrictionsMap: Record<string, any[]> = {};
    for (const rule of this.rls()) {
      const cfg = (rule as any).rls_config;
      if (cfg && cfg.role) restrictionsMap[cfg.role] = cfg.rules || cfg.conditions ? [cfg] : [cfg];
    }
    const chosen = this.selectEffectiveRole(userRoles, restrictionsMap);
    const group = chosen ? restrictionsMap[chosen]?.[0] : undefined;
    return (group?.conditions || []).filter((c: any) => c.exposed);
  }

  private mapOperator(op: string): QueryFilter['operator'] {
    const map: Record<string, QueryFilter['operator']> = {
      eq: 'eq',
      neq: 'neq',
      ne: 'neq',
      gt: 'gt',
      gte: 'gte',
      lt: 'lt',
      lte: 'lte',
      like: 'like',
      contains: 'contains',
      startswith: 'startswith',
      endswith: 'endswith',
      in: 'in',
      notin: 'nin',
      nin: 'nin',
    };
    return map[op] || 'eq';
  }
}

