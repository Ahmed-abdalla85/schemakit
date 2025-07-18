// PermissionChecker for SchemaKit

import { Permission, PermissionAction, PermissionResult } from '../types';

export class PermissionChecker {
  constructor() {}

  checkPermission(permissions: Map<string, any>, role: string, action: PermissionAction): PermissionResult {
    const permission = permissions.get(role);
    if (!permission) {
      return {
        allowed: false,
        role,
        action,
        reason: `Role '${role}' not found`
      };
    }

    const allowed = permission[action];
    
    return {
      allowed,
      role,
      action,
      reason: allowed ? undefined : `Role '${role}' does not have '${action}' permission`
    };
  }
} 