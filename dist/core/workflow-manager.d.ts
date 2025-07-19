/**
 * WorkflowManager
 * Responsible for workflow execution
 */
import { Context, EntityConfiguration } from '../types';
import { DatabaseAdapter } from '../database/adapter';
/**
 * WorkflowManager class
 * Single responsibility: Handle workflow execution
 */
export declare class WorkflowManager {
    private databaseAdapter;
    /**
     * Create a new WorkflowManager instance
     * @param databaseAdapter Database adapter
     */
    constructor(databaseAdapter: DatabaseAdapter);
    /**
     * Execute workflows for an entity event
     * @param entityConfig Entity configuration
     * @param event Trigger event
     * @param oldData Old data (for update/delete)
     * @param newData New data (for create/update)
     * @param context User context
     */
    executeWorkflows(entityConfig: EntityConfiguration, event: string, oldData: Record<string, any> | null, newData: Record<string, any> | null, context: Context): Promise<void>;
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
     * @returns True if conditions are met
     * @private
     */
    private evaluateWorkflowConditions;
    /**
     * Execute workflow actions
     * @param actions Array of workflow actions
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeWorkflowActions;
    /**
     * Execute a single workflow action
     * @param action Workflow action
     * @param event Trigger event
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @private
     */
    private executeWorkflowAction;
    /**
     * Evaluate a single condition
     * @param condition Single condition object
     * @param oldData Old data
     * @param newData New data
     * @param context User context
     * @returns True if condition is met
     * @private
     */
    private evaluateSingleCondition;
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
