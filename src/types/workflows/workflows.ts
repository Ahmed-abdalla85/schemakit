/**
 * Workflow and automation types
 */

import { WorkflowTrigger } from '../core/common';

export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  entity_id: string;
  name: string;
  trigger_event: WorkflowTrigger;
  conditions?: Record<string, any>;
  actions: WorkflowAction[];
  is_active: boolean;
  order_index: number;
  metadata?: Record<string, any>;
}