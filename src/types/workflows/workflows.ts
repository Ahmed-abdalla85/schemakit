/**
 * Workflow and automation types
 * 
 * Workflows in SchemaKit provide automated responses to entity lifecycle
 * events, enabling business process automation and integration.
 * 
 * @since 0.1.0
 */

import { WorkflowTrigger } from '../core/common';

/**
 * Single action to execute in a workflow
 * 
 * @example
 * ```typescript
 * // Send email action
 * const emailAction: WorkflowAction = {
 *   type: 'send-email',
 *   config: {
 *     to: '{{user.email}}',
 *     subject: 'Welcome to {{app.name}}',
 *     template: 'welcome-email',
 *     data: {
 *       userName: '{{user.name}}',
 *       activationLink: '{{user.activationUrl}}'
 *     }
 *   }
 * };
 * 
 * // API call action
 * const webhookAction: WorkflowAction = {
 *   type: 'webhook',
 *   config: {
 *     url: 'https://api.example.com/user-created',
 *     method: 'POST',
 *     headers: {
 *       'Authorization': 'Bearer {{app.apiKey}}'
 *     },
 *     body: {
 *       userId: '{{record.id}}',
 *       email: '{{record.email}}'
 *     }
 *   }
 * };
 * 
 * // Database action
 * const updateAction: WorkflowAction = {
 *   type: 'update-record',
 *   config: {
 *     entity: 'user_stats',
 *     where: { user_id: '{{record.id}}' },
 *     data: {
 *       last_login: '{{now}}',
 *       login_count: '{{increment}}'
 *     }
 *   }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface WorkflowAction {
  /** Action type (e.g., 'send-email', 'webhook', 'update-record') */
  type: string;
  /** Action-specific configuration with template support */
  config: Record<string, any>;
}

/**
 * Complete workflow definition stored in system_workflows table
 * 
 * Workflows define automated processes that run in response to entity
 * lifecycle events, with optional conditions and multiple actions.
 * 
 * @example
 * ```typescript
 * // User welcome workflow
 * const welcomeWorkflow: WorkflowDefinition = {
 *   id: 'wf_001',
 *   entity_id: 'ent_users_001',
 *   name: 'user-welcome',
 *   trigger_event: 'create',
 *   conditions: {
 *     // Only for active users
 *     is_active: true,
 *     // Only for specific user types
 *     user_type: { $in: ['customer', 'premium'] }
 *   },
 *   actions: [
 *     {
 *       type: 'send-email',
 *       config: {
 *         template: 'welcome-email',
 *         to: '{{record.email}}',
 *         data: { name: '{{record.name}}' }
 *       }
 *     },
 *     {
 *       type: 'webhook',
 *       config: {
 *         url: 'https://api.crm.com/users',
 *         method: 'POST',
 *         body: '{{record}}'
 *       }
 *     }
 *   ],
 *   is_active: true,
 *   order_index: 1,
 *   metadata: {
 *     description: 'Welcome new users and sync with CRM',
 *     created_by: 'admin',
 *     version: '1.0'
 *   }
 * };
 * 
 * // Order processing workflow
 * const orderWorkflow: WorkflowDefinition = {
 *   id: 'wf_002',
 *   entity_id: 'ent_orders_001',
 *   name: 'order-processing',
 *   trigger_event: 'update',
 *   conditions: {
 *     // Only when status changes to 'paid'
 *     status: 'paid',
 *     // Only for orders over $100
 *     total: { $gte: 100 }
 *   },
 *   actions: [
 *     {
 *       type: 'update-inventory',
 *       config: {
 *         items: '{{record.items}}',
 *         operation: 'decrease'
 *       }
 *     },
 *     {
 *       type: 'send-email',
 *       config: {
 *         template: 'order-confirmation',
 *         to: '{{record.customer_email}}'
 *       }
 *     }
 *   ],
 *   is_active: true,
 *   order_index: 1
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface WorkflowDefinition {
  /** Unique identifier for this workflow */
  id: string;
  /** Entity this workflow applies to */
  entity_id: string;
  /** Workflow name for reference */
  name: string;
  /** Event that triggers this workflow */
  trigger_event: WorkflowTrigger;
  /** Optional conditions that must be met to execute */
  conditions?: Record<string, any>;
  /** Array of actions to execute in order */
  actions: WorkflowAction[];
  /** Whether this workflow is currently active */
  is_active: boolean;
  /** Execution order when multiple workflows match */
  order_index: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}