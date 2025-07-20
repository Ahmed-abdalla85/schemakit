(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WorkflowManager = void 0;
    /**
     * WorkflowManager class
     * Single responsibility: Handle workflow execution
     */
    class WorkflowManager {
        /**
         * Create a new WorkflowManager instance
         * @param databaseAdapter Database adapter
         */
        constructor(databaseAdapter) {
            this.databaseAdapter = databaseAdapter;
        }
        /**
         * Execute workflows for an entity event
         * @param entityConfig Entity configuration
         * @param event Trigger event
         * @param oldData Old data (for update/delete)
         * @param newData New data (for create/update)
         * @param context User context
         */
        async executeWorkflows(entityConfig, event, oldData, newData, context) {
            // Get workflows that match the event and are active
            const matchingWorkflows = entityConfig.workflows.filter(workflow => {
                // Check if workflow is active
                if (!workflow.is_active) {
                    return false;
                }
                // Check if workflow trigger matches the event
                return workflow.trigger_event === event;
            });
            // Execute each matching workflow
            for (const workflow of matchingWorkflows) {
                try {
                    await this.executeWorkflow(workflow, event, oldData, newData, context);
                }
                catch (error) {
                    console.error(`Error executing workflow ${workflow.name}: ${error}`);
                    // In a production system, you might want to handle workflow errors differently
                    // For now, we'll log the error and continue
                }
            }
        }
        /**
         * Execute a single workflow
         * @param workflow Workflow definition
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeWorkflow(workflow, event, oldData, newData, context) {
            // Check conditions
            if (workflow.conditions && !this.evaluateWorkflowConditions(workflow.conditions, oldData, newData, context)) {
                return; // Conditions not met, skip workflow
            }
            // Execute actions
            if (workflow.actions && Array.isArray(workflow.actions)) {
                await this.executeWorkflowActions(workflow.actions, event, oldData, newData, context);
            }
        }
        /**
         * Evaluate workflow conditions
         * @param conditions Workflow conditions
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @returns True if conditions are met
         * @private
         */
        evaluateWorkflowConditions(conditions, oldData, newData, context) {
            if (!conditions || typeof conditions !== 'object') {
                return true; // No conditions means workflow should execute
            }
            // Handle different condition formats
            if (Array.isArray(conditions)) {
                // Array of conditions - all must be true (AND logic)
                return conditions.every(condition => this.evaluateSingleCondition(condition, oldData, newData, context));
            }
            else if (conditions.operator) {
                // Object with operator and conditions
                const { operator, conditions: conditionList } = conditions;
                if (!Array.isArray(conditionList)) {
                    return this.evaluateSingleCondition(conditions, oldData, newData, context);
                }
                switch (operator?.toLowerCase()) {
                    case 'and':
                        return conditionList.every(condition => this.evaluateSingleCondition(condition, oldData, newData, context));
                    case 'or':
                        return conditionList.some(condition => this.evaluateSingleCondition(condition, oldData, newData, context));
                    default:
                        return conditionList.every(condition => this.evaluateSingleCondition(condition, oldData, newData, context));
                }
            }
            else {
                // Single condition object
                return this.evaluateSingleCondition(conditions, oldData, newData, context);
            }
        }
        /**
         * Execute workflow actions
         * @param actions Array of workflow actions
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeWorkflowActions(actions, event, oldData, newData, context) {
            for (const action of actions) {
                try {
                    await this.executeWorkflowAction(action, event, oldData, newData, context);
                }
                catch (error) {
                    console.error(`Error executing workflow action: ${error}`);
                    // Continue with other actions even if one fails
                }
            }
        }
        /**
         * Execute a single workflow action
         * @param action Workflow action
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeWorkflowAction(action, event, oldData, newData, context) {
            if (!action || typeof action !== 'object' || !action.type) {
                console.warn('Invalid workflow action:', action);
                return;
            }
            switch (action.type.toLowerCase()) {
                case 'log':
                    await this.executeLogAction(action, event, oldData, newData, context);
                    break;
                case 'email':
                    await this.executeEmailAction(action, event, oldData, newData, context);
                    break;
                case 'webhook':
                    await this.executeWebhookAction(action, event, oldData, newData, context);
                    break;
                case 'update_field':
                    await this.executeUpdateFieldAction(action, event, oldData, newData, context);
                    break;
                case 'create_record':
                    await this.executeCreateRecordAction(action, event, oldData, newData, context);
                    break;
                default:
                    console.warn(`Unknown workflow action type: ${action.type}`);
            }
        }
        /**
         * Evaluate a single condition
         * @param condition Single condition object
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @returns True if condition is met
         * @private
         */
        evaluateSingleCondition(condition, oldData, newData, context) {
            if (!condition || typeof condition !== 'object') {
                return true;
            }
            const { field, operator, value } = condition;
            if (!field || !operator) {
                return true; // Invalid condition, default to allow
            }
            // Get the actual value to compare
            let actualValue;
            // Determine which data to use for comparison
            const data = newData || oldData;
            if (field.startsWith('$context.')) {
                const path = field.substring(9).split('.');
                actualValue = context;
                for (const key of path) {
                    if (actualValue === undefined || actualValue === null) {
                        break;
                    }
                    actualValue = actualValue[key];
                }
            }
            else if (field.startsWith('$user.')) {
                const path = field.substring(6).split('.');
                actualValue = context.user;
                for (const key of path) {
                    if (actualValue === undefined || actualValue === null) {
                        break;
                    }
                    actualValue = actualValue[key];
                }
            }
            else if (field.startsWith('$old.')) {
                const fieldName = field.substring(5);
                actualValue = oldData?.[fieldName];
            }
            else if (field.startsWith('$new.')) {
                const fieldName = field.substring(5);
                actualValue = newData?.[fieldName];
            }
            else {
                // Direct field access from current data
                actualValue = data?.[field];
            }
            // Evaluate condition based on operator
            switch (operator.toLowerCase()) {
                case 'eq':
                case '=':
                case '==':
                    return actualValue === value;
                case 'neq':
                case '!=':
                case '<>':
                    return actualValue !== value;
                case 'gt':
                case '>':
                    return actualValue > value;
                case 'gte':
                case '>=':
                    return actualValue >= value;
                case 'lt':
                case '<':
                    return actualValue < value;
                case 'lte':
                case '<=':
                    return actualValue <= value;
                case 'in':
                    return Array.isArray(value) ? value.includes(actualValue) : actualValue === value;
                case 'nin':
                case 'not_in':
                    return Array.isArray(value) ? !value.includes(actualValue) : actualValue !== value;
                case 'like':
                    if (typeof actualValue === 'string' && typeof value === 'string') {
                        const regex = new RegExp(value.replace(/%/g, '.*'), 'i');
                        return regex.test(actualValue);
                    }
                    return false;
                case 'exists':
                    return actualValue !== undefined && actualValue !== null;
                case 'not_exists':
                    return actualValue === undefined || actualValue === null;
                case 'changed':
                    // Check if field value changed between old and new data
                    return !!(oldData && newData && oldData[field] !== newData[field]);
                default:
                    return true; // Unknown operator, default to allow
            }
        }
        /**
         * Execute log action
         * @param action Action configuration
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeLogAction(action, event, oldData, newData, context) {
            const config = action.config || {};
            const message = config.message || `Workflow action executed for event: ${event}`;
            const level = config.level || 'info';
            // In a real implementation, you would use a proper logging system
            console.log(`[${level.toUpperCase()}] ${message}`, {
                event,
                oldData,
                newData,
                context: context.user?.id
            });
        }
        /**
         * Execute email action
         * @param action Action configuration
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeEmailAction(action, event, oldData, newData, _context) {
            const config = action.config || {};
            // This is a placeholder for email sending functionality
            // In a real implementation, you would integrate with an email service
            console.log('Email action executed:', {
                to: config.to,
                subject: config.subject,
                template: config.template,
                event,
                data: newData || oldData
            });
        }
        /**
         * Execute webhook action
         * @param action Action configuration
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeWebhookAction(action, event, oldData, newData, context) {
            const config = action.config || {};
            // This is a placeholder for webhook functionality
            // In a real implementation, you would make HTTP requests to external services
            console.log('Webhook action executed:', {
                url: config.url,
                method: config.method || 'POST',
                payload: {
                    event,
                    oldData,
                    newData,
                    context: context.user?.id
                }
            });
        }
        /**
         * Execute update field action
         * @param action Action configuration
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeUpdateFieldAction(action, _event, _oldData, _newData, _context) {
            const config = action.config || {};
            // This is a placeholder for field update functionality
            // In a real implementation, you would update specific fields based on the action configuration
            console.log('Update field action executed:', {
                field: config.field,
                value: config.value,
                condition: config.condition
            });
        }
        /**
         * Execute create record action
         * @param action Action configuration
         * @param event Trigger event
         * @param oldData Old data
         * @param newData New data
         * @param context User context
         * @private
         */
        async executeCreateRecordAction(action, _event, _oldData, _newData, _context) {
            const config = action.config || {};
            // This is a placeholder for record creation functionality
            // In a real implementation, you would create new records in other entities
            console.log('Create record action executed:', {
                entity: config.entity,
                data: config.data,
                template: config.template
            });
        }
    }
    exports.WorkflowManager = WorkflowManager;
});
//# sourceMappingURL=workflow-manager.js.map