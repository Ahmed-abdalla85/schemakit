// SchemaBuilder for SchemaKit

import { 
  EntityConfig, 
  JSONSchema, 
  ValidationResult, 
  ValidationError, 
  Field 
} from '../types';

export class SchemaBuilder {
  constructor() {}

  // Process entity configuration into usable maps
  processEntityConfig(config: EntityConfig): {
    fields: Map<string, Field>;
    permissions: Map<string, any>;
    workflows: Map<string, any>;
    views: Map<string, any>;
  } {
    const fields = new Map<string, Field>();
    const permissions = new Map<string, any>();
    const workflows = new Map<string, any>();
    const views = new Map<string, any>();

    // Process fields
    config.fields.forEach((fieldRecord: any) => {
      const field: Field = {
        name: fieldRecord.field_name,
        type: fieldRecord.field_type,
        required: fieldRecord.field_is_required,
        default: fieldRecord.field_default_value,
        validation: fieldRecord.field_validation_rules ? 
          JSON.parse(fieldRecord.field_validation_rules) : undefined,
        weight: fieldRecord.field_weight
      };
      fields.set(fieldRecord.field_name, field);
    });

    // Process permissions
    config.permissions.forEach((permissionRecord: any) => {
      const permission = {
        role: permissionRecord.permission_role_name,
        create: permissionRecord.permission_can_create,
        read: permissionRecord.permission_can_read,
        update: permissionRecord.permission_can_update,
        delete: permissionRecord.permission_can_delete,
        weight: permissionRecord.permission_weight
      };
      permissions.set(permissionRecord.permission_role_name, permission);
    });

    // Process workflows
    config.workflow.forEach((workflowRecord: any) => {
      const workflow = {
        id: workflowRecord.workflow_id,
        name: workflowRecord.workflow_name,
        description: workflowRecord.workflow_description,
        initialState: workflowRecord.workflow_initial_state,
        states: workflowRecord.states || [],
        transitions: workflowRecord.transitions || []
      };
      workflows.set(workflowRecord.workflow_name, workflow);
    });

    // Process views
    config.views.forEach((viewRecord: any) => {
      const view = {
        id: viewRecord.view_id,
        name: viewRecord.view_name,
        displayedFields: viewRecord.view_displayed_fields,
        rlsFilters: viewRecord.view_rls_filters,
        joins: viewRecord.view_joins,
        sort: viewRecord.view_sort,
        weight: viewRecord.view_weight
      };
      views.set(viewRecord.view_name, view);
    });

    return { fields, permissions, workflows, views };
  }

  // Generate JSON schema from fields map
  generateJsonSchema(fields: Map<string, Field>): JSONSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    fields.forEach((field: Field, fieldName: string) => {
      properties[fieldName] = {
        type: this.mapFieldTypeToJsonSchema(field.type),
        ...(field.default !== undefined && { default: field.default })
      };

      if (field.validation) {
        const val = field.validation;
        if (val.minLength) properties[fieldName].minLength = val.minLength;
        if (val.maxLength) properties[fieldName].maxLength = val.maxLength;
        if (val.min) properties[fieldName].minimum = val.min;
        if (val.max) properties[fieldName].maximum = val.max;
        if (val.pattern) properties[fieldName].pattern = val.pattern;
        if (val.enum) properties[fieldName].enum = val.enum;
      }

      if (field.required) required.push(fieldName);
    });

    return { type: 'object', properties, required };
  }

  // Validate data against fields
  validateData(fields: Map<string, Field>, data: Record<string, any>, isCreate = true): ValidationResult {
    const errors: ValidationError[] = [];
    
    fields.forEach((field: Field, fieldName: string) => {
      const value = data[fieldName];
      
      if (isCreate && field.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' is required`, value });
        return;
      }
      
      if (value !== undefined && value !== null) {
        const typeError = this.validateType(fieldName, value, field.type);
        if (typeError) errors.push(typeError);
        
        if (field.validation) {
          const ruleError = this.validateRules(fieldName, value, field.validation);
          if (ruleError) errors.push(ruleError);
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  }

  private mapFieldTypeToJsonSchema(type: string): string {
    switch (type) {
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'date':
      case 'datetime':
      case 'email':
      case 'url':
      case 'text':
      case 'uuid':
      default: return 'string';
    }
  }

  private validateType(field: string, value: any, type: string): ValidationError | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return { field, message: `Field '${field}' must be a string`, value };
        }
        break;
      case 'number':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
          return { field, message: `Field '${field}' must be a number`, value };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { field, message: `Field '${field}' must be a boolean`, value };
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { field, message: `Field '${field}' must be a valid email`, value };
        }
        break;
      case 'date':
      case 'datetime':
        if (!Date.parse(value)) {
          return { field, message: `Field '${field}' must be a valid date`, value };
        }
        break;
    }
    return null;
  }

  private validateRules(field: string, value: any, rules: any): ValidationError | null {
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return { field, message: `Field '${field}' must be at least ${rules.minLength} characters`, value };
    }
    
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return { field, message: `Field '${field}' must be no more than ${rules.maxLength} characters`, value };
    }
    
    if (rules.min && Number(value) < rules.min) {
      return { field, message: `Field '${field}' must be at least ${rules.min}`, value };
    }
    
    if (rules.max && Number(value) > rules.max) {
      return { field, message: `Field '${field}' must be no more than ${rules.max}`, value };
    }
    
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return { field, message: `Field '${field}' does not match required pattern`, value };
    }
    
    if (rules.enum && !rules.enum.includes(value)) {
      return { field, message: `Field '${field}' must be one of: ${rules.enum.join(', ')}`, value };
    }
    
    return null;
  }
} 