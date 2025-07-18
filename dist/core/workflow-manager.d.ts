/**
 * Workflow Manager - Handles workflow execution for entity lifecycle events
 */
import { Context, EntityConfiguration } from '../types';
/**
 * Workflow Manager class
 */
export declare class WorkflowManager {
    /**
     * Execute workflows for an entity
     * @param entityConfig Entity configuration
     * @param event Trigger event
     * @param oldData Old data (for update/delete)
     * @param newData New data (for create/update)
     * @param context User context
     */
    executeWorkflows(entityConfig: EntityConfiguration, event: 'create' | 'update' | 'delete' | 'field_change', oldData: Record<string, any> | null, newData: Record<string, any> | null, context: Context): Promise<void>;
    /**
     * Execute a single workflow
     * @param workflow Workflow definition
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeWorkflow;
    /**
     * Evaluate workflow conditions
     * @param conditions Workflow conditions
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private evaluateConditions;
    /**
     * Execute a workflow action
     * @param action Workflow action
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeAction;
    /**
     * Execute log action
     * @param action Action configuration
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeLogAction;
    /**
     * Execute email action
     * @param action Action configuration
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeEmailAction;
    /**
     * Execute webhook action
     * @param action Action configuration
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeWebhookAction;
    /**
     * Execute update field action
     * @param action Action configuration
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeUpdateFieldAction;
    /**
     * Execute create record action
     * @param action Action configuration
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeCreateRecordAction;
}
