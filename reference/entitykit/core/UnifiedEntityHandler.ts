// UnifiedEntityHandler - Combines SchemaBuilder, CrudHandler, and DynamicEntityHandler

import { DbAdapter, QueryFilter, QueryOptions } from '../adapters';
import { 
  EntityConfig,
  Field,
  CreateData, 
  UpdateData, 
  ReadFilters, 
  CreateResult, 
  ReadResult, 
  UpdateResult, 
  DeleteResult,
  ValidationResult,
  ValidationError,
  JSONSchema
} from '../types';

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
  protected permissions: Map<string, any>;
  protected workflows: Map<string, any>;
  protected views: Map<string, any>;

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
      const result = await this.db.insert(this.tableName, recordData);
      
      return { success: true, data: result, message: 'Entity record created successfully' };
    } catch (error) {
      return { success: false, message: `Failed to create entity record: ${error instanceof Error ? error.message : 'Unknown error'}` };
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

      // Execute queries
      const dataResult = await this.db.select(this.tableName, queryFilters, options, this.tenantId);
      const totalResult = 0; // TODO: Enable count queries

      // Extract data from results
      const data = Array.isArray(dataResult) ? dataResult : [];
      const total = typeof totalResult === 'number' ? totalResult : 0;

      return {
        success: true,
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        message: `Retrieved ${data.length} records`
      };
    } catch (error) {
      return { success: false, message: `Failed to read entity records: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
      const result = await this.db.update(this.tableName, id, updateData, this.tenantId);
      
      return { success: true, data: result, message: 'Entity record updated successfully' };
    } catch (error) {
      return { success: false, message: `Failed to update entity record: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
      return { success: false, message: `Failed to delete entity record: ${error instanceof Error ? error.message : 'Unknown error'}` };
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

  validateData(data: Record<string, any>, isCreate = true): ValidationResult {
    const errors: ValidationError[] = [];
    
    this.fields.forEach((field: Field, fieldName: string) => {
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

  // === PERMISSION CHECKING ===

  checkPermission(role: string, action: string): boolean {
    const permission = this.permissions.get(role);
    if (!permission) return false;
    return permission[action] === true;
  }

  // === UTILITY METHODS ===

  getEntityInfo() {
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

  // === PRIVATE HELPER METHODS ===

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

  private prepareCreateData(data: CreateData): any {
    const recordData = { ...data };
    
    // Add default values for fields not provided
    this.fields.forEach((field: Field, fieldName: string) => {
      if (recordData[fieldName] === undefined && field.default !== undefined) {
        recordData[fieldName] = field.default;
      }
    });
    
    // Add system fields
    recordData.id = recordData.id || crypto.randomUUID();
    recordData.created_at = new Date().toISOString();
    recordData.updated_at = new Date().toISOString();
    
    return recordData;
  }

  private prepareUpdateData(data: UpdateData): any {
    const updateData = { ...data };
    
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
    } else {
      // Default sorting
    //   orderBy.push({
    //     field: 'created_at',
    //     direction: 'DESC'
    //   });
    }
    
    return orderBy;
  }
} 