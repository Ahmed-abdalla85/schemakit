/**
 * Unified Entity Handler - Example usage pattern for SchemaKit
 * 
 * This is an example of how to create an EntityKit-style entity handler
 * using SchemaKit. This is NOT part of the core library.
 * 
 * Usage:
 * const entityHandler = new UnifiedEntityHandler(schemaKit, config, tenantId);
 * await entityHandler.create(data, userRole);
 */
import { SchemaKit } from '../src/schemakit';
import { EntityConfiguration, Context } from '../src/types';
import { ValidationResult as BaseValidationResult, ValidationError } from '../src/core/validation-manager';
import { QueryFilter, QueryOptions } from '../src/database/adapter';
import { QueryManager } from '../src/core/query-manager';
import { ValidationManager } from '../src/core/validation-manager';
import { PermissionManager } from '../src/core/permission-manager';
import { generateId } from '../src/utils/id-generation';
import { getCurrentTimestamp } from '../src/utils/date-helpers';

/**
 * EntityKit-style interfaces for CRUD operations
 */
export interface CreateData { [key: string]: any; }
export interface UpdateData { [key: string]: any; }

export interface ReadFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  searchFields?: string | string[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
  [key: string]: any;
}

export interface CreateResult {
  success: boolean;
  data?: any;
  message: string;
  errors?: ValidationError[];
}

export interface ReadResult {
  success: boolean;
  data?: any[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  message: string;
}

export interface UpdateResult {
  success: boolean;
  data?: any;
  message: string;
  errors?: ValidationError[];
}

export interface DeleteResult {
  success: boolean;
  id?: string;
  message: string;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, any>;
  required: string[];
}

export interface Field {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'url' | 'text' | 'uuid';
  required?: boolean;
  default?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  weight?: number;
}

// Types for the UnifiedEntityHandler
export interface EntityResult {
  success: boolean;
  data?: any;
  total?: number;
  id?: string | number;
  message: string;
  errors?: any[];
}

/**
 * Unified Entity Handler - Example EntityKit-style implementation
 * 
 * This demonstrates how to create an EntityKit-style entity handler
 * using SchemaKit's core managers. This is a usage pattern, not core library code.
 */
export class UnifiedEntityHandler {
  // Database and context
  protected schemaKit: SchemaKit;
  protected tenantId: string;
  
  // Entity configuration
  public readonly entityName: string;
  public readonly displayName: string;
  public readonly tableName: string;
  protected entityConfig: EntityConfiguration;
  
  // Managers for delegation
  protected validationManager: ValidationManager;
  protected permissionManager: PermissionManager;
  protected queryManager: QueryManager;

  constructor(
    schemaKit: SchemaKit,
    config: EntityConfiguration,
    tenantId: string
  ) {
    this.schemaKit = schemaKit;
    this.tenantId = tenantId;
    
    // Entity properties
    this.entityName = config.entity.name;
    this.displayName = config.entity.display_name;
    this.tableName = config.entity.table_name;
    this.entityConfig = config;
    
    // Initialize managers for delegation
    this.validationManager = new ValidationManager();
    this.permissionManager = new PermissionManager((schemaKit as any).databaseAdapter);
    this.queryManager = new QueryManager((schemaKit as any).databaseAdapter);
  }

  // === CRUD OPERATIONS ===

  /**
   * Create a new entity record
   * @param recordData The data to create
   * @param userRole The user role for permission checking
   * @returns Promise<EntityResult>
   */
  async create(recordData: Record<string, any>, userRole: string): Promise<EntityResult> {
    try {
      const context = { user: { role: userRole }, tenantId: this.tenantId };
      
      // Use the new entity() method pattern
      const entityHandler = this.schemaKit.entity(this.entityName);
      const result = await entityHandler.create(recordData, context);
      
      return {
        success: true,
        data: result,
        message: 'Entity record created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errors: error instanceof Error && error.message.includes('Validation failed') 
          ? this.parseValidationErrors(error.message)
          : undefined
      };
    }
  }

  /**
   * Read entity records with optional filters
   * @param filters Query filters
   * @param userRole The user role for permission checking
   * @returns Promise<EntityResult>
   */
  async read(filters: Record<string, any> = {}, userRole: string): Promise<EntityResult> {
    try {
      const context = { user: { role: userRole }, tenantId: this.tenantId };
      
      // Use the new entity() method pattern
      const entityHandler = this.schemaKit.entity(this.entityName);
      const result = await entityHandler.read(filters, context);
      
      return {
        success: true,
        data: result.data || [],
        total: result.total || 0,
        message: 'Entity records retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update an entity record
   * @param id The record ID
   * @param updateData The data to update
   * @param userRole The user role for permission checking
   * @returns Promise<EntityResult>
   */
  async update(id: string | number, updateData: Record<string, any>, userRole: string): Promise<EntityResult> {
    try {
      const context = { user: { role: userRole }, tenantId: this.tenantId };
      
      // Use the new entity() method pattern
      const entityHandler = this.schemaKit.entity(this.entityName);
      const result = await entityHandler.update(id, updateData, context);
      
      return {
        success: true,
        data: result,
        message: 'Entity record updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errors: error instanceof Error && error.message.includes('Validation failed') 
          ? this.parseValidationErrors(error.message)
          : undefined
      };
    }
  }

  /**
   * Delete an entity record
   * @param id The record ID
   * @param userRole The user role for permission checking
   * @returns Promise<EntityResult>
   */
  async delete(id: string | number, userRole: string): Promise<EntityResult> {
    try {
      const context = { user: { role: userRole }, tenantId: this.tenantId };
      
      // Use the new entity() method pattern
      const entityHandler = this.schemaKit.entity(this.entityName);
      const result = await entityHandler.delete(id, context);
      
      return {
        success: true,
        id: id,
        message: 'Entity record deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Find entity record by ID
   * @param id The record ID
   * @param userRole The user role for permission checking
   * @returns Promise<Record<string, any> | null>
   */
  async findById(id: string | number, userRole: string): Promise<Record<string, any> | null> {
    try {
      const context = { user: { role: userRole }, tenantId: this.tenantId };
      
      // Use the new entity() method pattern
      const entityHandler = this.schemaKit.entity(this.entityName);
      return await entityHandler.findById(id, context);
    } catch (error) {
      console.error(`Error finding ${this.entityName} by ID:`, error);
      return null;
    }
  }

  // === SCHEMA AND VALIDATION ===

  generateJsonSchema(): JSONSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    this.entityConfig.fields.forEach((fieldRecord: any) => {
      const fieldName = fieldRecord.name;
      properties[fieldName] = {
        type: this.mapFieldTypeToJsonSchema(fieldRecord.type),
        ...(fieldRecord.default_value !== undefined && { default: fieldRecord.default_value })
      };

      if (fieldRecord.validation_rules) {
        const validationRules = typeof fieldRecord.validation_rules === 'string' 
          ? JSON.parse(fieldRecord.validation_rules) 
          : fieldRecord.validation_rules;
        
        if (validationRules.minLength) properties[fieldName].minLength = validationRules.minLength;
        if (validationRules.maxLength) properties[fieldName].maxLength = validationRules.maxLength;
        if (validationRules.min) properties[fieldName].minimum = validationRules.min;
        if (validationRules.max) properties[fieldName].maximum = validationRules.max;
        if (validationRules.pattern) properties[fieldName].pattern = validationRules.pattern;
        if (validationRules.enum) properties[fieldName].enum = validationRules.enum;
      }

      if (fieldRecord.is_required) required.push(fieldName);
    });

    return { type: 'object', properties, required };
  }

  // === UTILITY METHODS ===

  getEntityInfo() {
    return {
      entityName: this.entityName,
      displayName: this.displayName,
      tableName: this.tableName,
      tenantId: this.tenantId,
      fieldCount: this.entityConfig.fields.length,
      permissionCount: this.entityConfig.permissions.length,
      workflowCount: this.entityConfig.workflows.length,
      viewCount: this.entityConfig.views.length
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

  /**
   * Parse validation errors from error message
   * @param errorMessage The error message containing validation errors
   * @returns Array of validation errors
   */
  private parseValidationErrors(errorMessage: string): any[] {
    try {
      // Extract JSON from error message like "Validation failed: [{"field": "name", "message": "Required"}]"
      const jsonMatch = errorMessage.match(/Validation failed: (.+)/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return [];
    } catch {
      return [];
    }
  }

  private prepareCreateData(data: CreateData): any {
    const recordData = { ...data };
    
    // Add default values for fields not provided
    this.entityConfig.fields.forEach((fieldRecord: any) => {
      if (recordData[fieldRecord.name] === undefined && fieldRecord.default_value !== undefined) {
        recordData[fieldRecord.name] = fieldRecord.default_value;
      }
    });
    
    // Add system fields
    recordData.id = recordData.id || generateId();
    recordData.created_at = getCurrentTimestamp();
    recordData.updated_at = getCurrentTimestamp();
    
    return recordData;
  }

  private prepareUpdateData(data: UpdateData): any {
    const updateData = { ...data };
    
    // Add system fields
    updateData.updated_at = getCurrentTimestamp();
    
    return updateData;
  }

  private buildQueryFilters(filters: ReadFilters): QueryFilter[] {
    const queryFilters: QueryFilter[] = [];
    
    if (filters.search && filters.searchFields) {
      // Add search filters
      const searchFields = Array.isArray(filters.searchFields) ? filters.searchFields : [filters.searchFields];
      searchFields.forEach(field => {
        const fieldExists = this.entityConfig.fields.some((f: any) => f.name === field);
        if (fieldExists) {
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
        const fieldExists = this.entityConfig.fields.some((f: any) => f.name === field);
        if (fieldExists) {
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
    
    if (filters.sortBy) {
      const fieldExists = this.entityConfig.fields.some((f: any) => f.name === filters.sortBy);
      if (fieldExists) {
        orderBy.push({
          field: filters.sortBy,
          direction: filters.sortOrder || 'ASC'
        });
      }
    }
    
    return orderBy;
  }

  private convertFiltersToConditions(filters: QueryFilter[]): any[] {
    return filters.map(filter => ({
      field: filter.field,
      operator: filter.operator || 'eq',
      value: filter.value
    }));
  }
} 