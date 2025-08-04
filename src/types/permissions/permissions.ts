/**
 * Permission and authorization types
 */

import { OperationType } from '../core/common';

export interface PermissionDefinition {
  id: string;
  entity_id: string;
  role: string;
  action: OperationType;
  conditions?: Record<string, any>;
  is_allowed: boolean;
  is_active?: boolean;
  created_at: string;
  field_permissions?: Record<string, boolean>;
}