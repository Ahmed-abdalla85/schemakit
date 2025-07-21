/**
 * UnifiedEntityHandler - Combines SchemaBuilder, CrudHandler, and DynamicEntityHandler
 * 
 * A unified approach to entity management that consolidates:
 * - Schema building and validation
 * - CRUD operations with permissions
 * - Dynamic entity handling
 * - Workflow execution
 */

import { DbAdapter } from './adapters/database-adapter-bridge';
import { QueryFilter, QueryOptions } from '../../database/adapter';
import { 
  EntityConfig,
  Field,
  Permission,
  Workflow,
  View,
  CreateData, 
  UpdateData, 
  ReadFilters, 
  CreateResult, 
  ReadResult, 
  UpdateResult, 
  DeleteResult,
  ValidationResult,
  ValidationError,
  JSONSchema,
  EntityInfo
} from './types';

export class UnifiedEntityHandler {
  // Database and context
  protected db: DbAdapter;
  protected tenantId: string;
  
  // Entity configuration
  public readonly entityName: string;
  public readonly displayName: string;
  public readonly tableName: string;
  
  // Processed configuration maps
  protected fields: Map<string, Field>;
  protected permissions: Map<string, Permission>;
  protected workflows: Map<string, Workflow>;
  protected views: Map<string, View>;

  constructor(
    db: DbAdapter,
    config: EntityConfig,
    tenantId: string
  ) {
    this.db = db;
    this.tenantId = tenantId;
    
    // Entity properties
    this.entityName = config.entity.entity_name;
    this.displayName = config.entity.entity_display_name;
    this.tableName = config.entity.entity_table_name;
    
    // Process configuration into usable maps
    const processedConfig = this.processEntityConfig(config);
    this.fields = processedConfig.fields;
    this.permissions = processedConfig.permissions;
    this.workflows = processedConfig.workflows;
    this.views = processedConfig.views;
  }

  // === CONFIGURATION PROCESSING ===

  private processEntityConfig(config: EntityConfig): {
    fields: Map<string, Field>;
    permissions: Map<string, Permission>;
    workflows: Map<string, Workflow>;
    views: Map<string, View>;
  } {
    const fields = new Map<string, Field>();
    const permissions = new Map<string, Permission>();
    const workflows = new Map<string, Workflow>();
    const views = new Map<string, View>();

    // Process fields
    config.fields.forEach((fieldRecord: any) => {
      const field: Field = {
        name: fieldRecord.field_name,
        type: fieldRecord.field_type,
        required: fieldRecord.field_is_required,
        unique: fieldRecord.field_is_unique,
        default: fieldRecord.field_default_value,
        validation: fieldRecord.field_validation_rules ? 
          (typeof fieldRecord.field_validation_rules === 'string' ? 
            JSON.parse(fieldRecord.field_validation_rules) : 
            fieldRecord.field_validation_rules) : undefined,
        displayName: fieldRecord.field_display_name,
        description: fieldRecord.field_description,
        weight: fieldRecord.field_weight,
        referenceEntity: fieldRecord.field_reference_entity,
        metadata: fieldRecord.field_metadata
      };
      fields.set(fieldRecord.field_name, field);
    });

    // Process permissions
    config.permissions.forEach((permissionRecord: any) => {
      const permission: Permission = {
        role: permissionRecord.permission_role_name,
        create: permissionRecord.permission_can_create,
        read: permissionRecord.permission_can_read,
        update: permissionRecord.permission_can_update,
        delete: permissionRecord.permission_can_delete,
        conditions: permissionRecord.permission_conditions,
        fieldPermissions: permissionRecord.permission_field_permissions,
        weight: permissionRecord.permission_weight
      };
      permissions.set(permissionRecord.permission_role_name, permission);
    });

    // Process workflows
    config.workflow.forEach((workflowRecord: any) => {
      const workflow: Workflow = {
        id: workflowRecord.workflow_id,
        name: workflowRecord.workflow_name,
        description: workflowRecord.workflow_description,
        triggerEvent: workflowRecord.workflow_trigger_event,
        initialState: workflowRecord.workflow_initial_state,
        conditions: workflowRecord.workflow_conditions,
        actions: workflowRecord.workflow_actions,
        states: workflowRecord.states || [],
        transitions: workflowRecord.transitions || []
      };
      workflows.set(workflowRecord.workflow_name, workflow);
    });

    // Process views
    config.views.forEach((viewRecord: any) => {
      const view: View = {
        id: viewRecord.view_id,
        name: viewRecord.view_name,
        displayedFields: viewRecord.view_displayed_fields,
        rlsFilters: viewRecord.view_rls_filters,
        joins: viewRecord.view_joins,
        sort: viewRecord.view_sort,
        weight: viewRecord.view_weight,
        queryConfig: viewRecord.view_query_config
      };
      views.set(viewRecord.view_name, view);
    });

    return { fields, permissions, workflows, views };
  }

  // === CRUD OPERATIONS ===

  async create(data: CreateData, userRole?: string): Promise<CreateResult> {
    try {
      // Check permissions
      if (userRole && !this.checkPermission(userRole, 'create')) {
        return { success: false, message: 'Permission denied: Cannot create entity records' };
      }

      // Validate data
      const validation = this.validateData(data, true);
      if (!validation.valid) {
        return { success: false, errors: validation.errors, message: 'Validation failed' };
      }

      // Prepare create data with defaults and system fields
      const recordData = this.prepareCreateData(data);

      // Insert record
      const result = await this.db.insert(this.tableName, recordData, this.tenantId);
      
      // Get the created record
      const createdId = result.lastInsertId || recordData.id;
      const createdRecord = await this.db.findById(this.tableName, createdId, this.tenantId);
      
      return { 
        success: true, 
        data: createdRecord || recordData, 
        message: 'Entity record created successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to create entity record: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async read(filters: ReadFilters = {}, userRole?: string): Promise<ReadResult> {
    try {
      // Check permissions
      if (userRole && !this.checkPermission(userRole, 'read')) {
        return { success: false, message: 'Permission denied: Cannot read entity records' };
      }

      const page = filters.page || 1;
      const pageSize = Math.min(filters.pageSize || 20, 100);
      const offset = (page - 1) * pageSize;

      // Build query filters
      const queryFilters = this.buildQueryFilters(filters);

      // Build query options
      const options: QueryOptions = {
        limit: pageSize,
        offset: offset,
        orderBy: this.buildOrderBy(filters)
      };

      // Execute query
      const data = await this.db.select(this.tableName, queryFilters, options, this.tenantId);
      
      // For now, we'll estimate total count based on whether we got a full page
      // In a real implementation, you'd want a separate count query
      const hasMore = data.length === pageSize;
      const estimatedTotal = hasMore ? (page * pageSize) + 1 : (page - 1) * pageSize + data.length;

      return {
        success: true,
        data,
        total: estimatedTotal,
        page,
        pageSize,
        totalPages: Math.ceil(estimatedTotal / pageSize),
        message: `Retrieved ${data.length} records`
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to read entity records: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async update(id: string, data: UpdateData, userRole?: string): Promise<UpdateResult> {
    try {
      // Check permissions
      if (userRole && !this.checkPermission(userRole, 'update')) {
        return { success: false, message: 'Permission denied: Cannot update entity records' };
      }

      // Check if record exists
      const existing = await this.db.findById(this.tableName, id, this.tenantId);
      if (!existing) {
        return { success: false, message: 'Entity record not found' };
      }

      // Validate data (not creating, so required fields are optional)
      const validation = this.validateData(data, false);
      if (!validation.valid) {
        return { success: false, errors: validation.errors, message: 'Validation failed' };
      }

      // Prepare update data
      const updateData = this.prepareUpdateData(data);

      // Update record
      await this.db.update(this.tableName, id, updateData, this.tenantId);
      
      // Get updated record
      const updatedRecord = await this.db.findById(this.tableName, id, this.tenantId);
      
      return { 
        success: true, 
        data: updatedRecord || { id, ...updateData }, 
        message: 'Entity record updated successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to update entity record: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async delete(id: string, userRole?: string): Promise<DeleteResult> {
    try {
      // Check permissions
      if (userRole && !this.checkPermission(userRole, 'delete')) {
        return { success: false, message: 'Permission denied: Cannot delete entity records' };
      }

      // Check if record exists
      const existing = await this.db.findById(this.tableName, id, this.tenantId);
      if (!existing) {
        return { success: false, message: 'Entity record not found' };
      }

      // Delete record
      await this.db.delete(this.tableName, id, this.tenantId);
      
      return { success: true, id, message: 'Entity record deleted successfully' };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to delete entity record: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async findById(id: string, userRole?: string): Promise<any> {
    try {
      // Check permissions
      if (userRole && !this.checkPermission(userRole, 'read')) {
        return null;
      }

      return await this.db.findById(this.tableName, id, this.tenantId);
    } catch (error) {
      return null;
    }
  }

  // === SCHEMA AND VALIDATION ===

  generateJsonSchema(): JSONSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    this.fields.forEach((field: Field, fieldName: string) => {
      properties[fieldName] = {
        type: this.mapFieldTypeToJsonSchema(field.type),
        ...(field.default !== undefined && { default: field.default })
      };

      if (field.validation) {
        const val = field.validation;
        if (val.minLength !== undefined) properties[fieldName].minLength = val.minLength;
        if (val.maxLength !== undefined) properties[fieldName].maxLength = val.maxLength;
        if (val.min !== undefined) properties[fieldName].minimum = val.min;
        if (val.max !== undefined) properties[fieldName].maximum = val.max;
        if (val.pattern) properties[fieldName].pattern = val.pattern;
        if (val.enum) properties[fieldName].enum = val.enum;
      }

      if (field.required) required.push(fieldName);
    });

    return { type: 'object', properties, required };
  }

  validateData(data: Record<string, any>, isCreate = true): ValidationResult {
    const errors: ValidationError[] = [];
    
    this.fields.forEach((field: Field, fieldName: string) => {
      const value = data[fieldName];
      
      // Check required fields (skip ID field on create as it's auto-generated)
      if (isCreate && field.required && fieldName !== 'id' && (value === undefined || value === null || value === '')) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' is required`, value });
        return;
      }
      
      // Validate field if value is provided
      if (value !== undefined && value !== null) {
        // Type validation
        const typeError = this.validateType(fieldName, value, field.type);
        if (typeError) errors.push(typeError);
        
        // Rules validation
        if (field.validation) {
          const ruleError = this.validateRules(fieldName, value, field.validation);
          if (ruleError) errors.push(ruleError);
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  }

  // === PERMISSION CHECKING ===

  checkPermission(role: string, action: string): boolean {
    const permission = this.permissions.get(role);
    if (!permission) return false;
    
    switch (action) {
      case 'create': return permission.create;
      case 'read': return permission.read;
      case 'update': return permission.update;
      case 'delete': return permission.delete;
      default: return false;
    }
  }

  // === UTILITY METHODS ===

  getEntityInfo(): EntityInfo {
    return {
      entityName: this.entityName,
      displayName: this.displayName,
      tableName: this.tableName,
      tenantId: this.tenantId,
      fieldCount: this.fields.size,
      permissionCount: this.permissions.size,
      workflowCount: this.workflows.size,
      viewCount: this.views.size
    };
  }

  getSchema(): JSONSchema {
    return this.generateJsonSchema();
  }

  getFields(): Map<string, Field> {
    return new Map(this.fields);
  }

  getPermissions(): Map<string, Permission> {
    return new Map(this.permissions);
  }

  getWorkflows(): Map<string, Workflow> {
    return new Map(this.workflows);
  }

  getViews(): Map<string, View> {
    return new Map(this.views);
  }

  // === PRIVATE HELPER METHODS ===

  private mapFieldTypeToJsonSchema(type: string): string {
    switch (type.toLowerCase()) {
      case 'number':
      case 'integer':
      case 'decimal':
      case 'float':
        return 'number';
      case 'boolean':
      case 'bool':
        return 'boolean';
      case 'array':
      case 'json':
        return 'array';
      case 'object':
        return 'object';
      case 'date':
      case 'datetime':
      case 'timestamp':
      case 'email':
      case 'url':
      case 'text':
      case 'uuid':
      case 'string':
      default:
        return 'string';
    }
  }

  private validateType(field: string, value: any, type: string): ValidationError | null {
    switch (type.toLowerCase()) {
      case 'string':
      case 'text':
        if (typeof value !== 'string') {
          return { field, message: `Field '${field}' must be a string`, value };
        }
        break;
      case 'number':
      case 'integer':
      case 'decimal':
      case 'float':
        if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
          return { field, message: `Field '${field}' must be a number`, value };
        }
        if (type === 'integer' && !Number.isInteger(Number(value))) {
          return { field, message: `Field '${field}' must be an integer`, value };
        }
        break;
      case 'boolean':
      case 'bool':
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
      case 'url':
        try {
          new URL(value);
        } catch {
          return { field, message: `Field '${field}' must be a valid URL`, value };
        }
        break;
      case 'date':
      case 'datetime':
      case 'timestamp':
        if (!Date.parse(value)) {
          return { field, message: `Field '${field}' must be a valid date`, value };
        }
        break;
      case 'uuid':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          return { field, message: `Field '${field}' must be a valid UUID`, value };
        }
        break;
      case 'json':
      case 'array':
        if (!Array.isArray(value)) {
          return { field, message: `Field '${field}' must be an array`, value };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { field, message: `Field '${field}' must be an object`, value };
        }
        break;
    }
    return null;
  }

  private validateRules(field: string, value: any, rules: any): ValidationError | null {
    if (rules.minLength !== undefined && typeof value === 'string' && value.length < rules.minLength) {
      return { field, message: `Field '${field}' must be at least ${rules.minLength} characters`, value };
    }
    
    if (rules.maxLength !== undefined && typeof value === 'string' && value.length > rules.maxLength) {
      return { field, message: `Field '${field}' must be no more than ${rules.maxLength} characters`, value };
    }
    
    if (rules.min !== undefined && Number(value) < rules.min) {
      return { field, message: `Field '${field}' must be at least ${rules.min}`, value };
    }
    
    if (rules.max !== undefined && Number(value) > rules.max) {
      return { field, message: `Field '${field}' must be no more than ${rules.max}`, value };
    }
    
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return { field, message: `Field '${field}' does not match required pattern`, value };
    }
    
    if (rules.enum && !rules.enum.includes(value)) {
      return { field, message: `Field '${field}' must be one of: ${rules.enum.join(', ')}`, value };
    }
    
    if (rules.custom && typeof rules.custom === 'function') {
      const result = rules.custom(value);
      if (typeof result === 'string') {
        return { field, message: result, value };
      } else if (!result) {
        return { field, message: `Field '${field}' failed custom validation`, value };
      }
    }
    
    return null;
  }

  private prepareCreateData(data: CreateData): any {
    const recordData = { ...data };
    
    // Add default values for fields not provided
    this.fields.forEach((field: Field, fieldName: string) => {
      if (recordData[fieldName] === undefined && field.default !== undefined) {
        recordData[fieldName] = field.default;
      }
    });
    
    // Add system fields
    recordData.id = recordData.id || this.generateId();
    recordData.created_at = new Date().toISOString();
    recordData.updated_at = new Date().toISOString();
    
    return recordData;
  }

  private prepareUpdateData(data: UpdateData): any {
    const updateData = { ...data };
    
    // Remove id field if present
    delete updateData.id;
    
    // Add system fields
    updateData.updated_at = new Date().toISOString();
    
    return updateData;
  }

  private buildQueryFilters(filters: ReadFilters): QueryFilter[] {
    const queryFilters: QueryFilter[] = [];
    
    if (filters.search && filters.searchFields) {
      // Add search filters
      const searchFields = Array.isArray(filters.searchFields) ? filters.searchFields : [filters.searchFields];
      searchFields.forEach(field => {
        if (this.fields.has(field)) {
          queryFilters.push({
            field,
            value: `%${filters.search}%`,
            operator: 'like'
          });
        }
      });
    }
    
    if (filters.filters) {
      // Add custom filters
      Object.entries(filters.filters).forEach(([field, value]) => {
        if (this.fields.has(field)) {
          queryFilters.push({
            field,
            value,
            operator: 'eq'
          });
        }
      });
    }
    
    return queryFilters;
  }

  private buildOrderBy(filters: ReadFilters): { field: string; direction: 'ASC' | 'DESC' }[] {
    const orderBy: { field: string; direction: 'ASC' | 'DESC' }[] = [];
    
    if (filters.sortBy && this.fields.has(filters.sortBy)) {
      orderBy.push({
        field: filters.sortBy,
        direction: filters.sortOrder || 'ASC'
      });
    }
    
    return orderBy;
  }

  private generateId(): string {
    // Simple UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}