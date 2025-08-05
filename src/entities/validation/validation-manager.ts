/**
 * ValidationManager - Simplified
 * Essential validation functionality only
 */
import { EntityConfiguration, FieldDefinition } from '../../types/core';
import { ValidationResult, ValidationError } from '../../types/validation';

/**
 * Simplified ValidationManager class
 * Essential validation only
 */
export class ValidationManager {
  /**
   * Validate entity data against schema
   */
  async validate(
    entityConfig: EntityConfiguration, 
    data: Record<string, any>, 
    operation: 'create' | 'update'
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Validate each field
    for (const field of entityConfig.fields) {
      const fieldErrors = this.validateField(field, data[field.field_name], operation, data);
      errors.push(...fieldErrors);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a single field
   */
  private validateField(
    fieldConfig: FieldDefinition, 
    value: any, 
    operation: 'create' | 'update' = 'create',
    allData: Record<string, any> = {}
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required fields
    if (fieldConfig.is_required && (operation === 'create' || allData.hasOwnProperty(fieldConfig.name))) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: fieldConfig.name,
          code: 'required',
          message: `Field '${fieldConfig.name}' is required`,
          value
        });
        return errors; // No need to validate type if required field is missing
      }
    }

    // Skip validation if value is not provided (for optional fields)
    if (value === undefined || value === null) {
      return errors;
    }

    // Type validation
    const typeErrors = this.validateFieldType(fieldConfig, value);
    errors.push(...typeErrors);

    // Custom validation rules
    if (fieldConfig.validation_rules) {
      const customErrors = this.validateCustomRules(fieldConfig, value, allData);
      errors.push(...customErrors);
    }

    return errors;
  }

  /**
   * Validate field type
   */
  private validateFieldType(field: FieldDefinition, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (field.field_type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: field.field_name,
            code: 'type',
            message: `Field '${field.field_name}' must be a string`,
            value
          });
        }
        break;

      case 'number':
      case 'integer':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: field.field_name,
            code: 'type',
            message: `Field '${field.field_name}' must be a number`,
            value
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: field.field_name,
            code: 'type',
            message: `Field '${field.field_name}' must be a boolean`,
            value
          });
        }
        break;

      case 'date':
      case 'datetime':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          errors.push({
            field: field.field_name,
            code: 'type',
            message: `Field '${field.field_name}' must be a valid date`,
            value
          });
        }
        break;

      case 'json':
      case 'object':
        if (typeof value !== 'object' || value === null) {
          errors.push({
            field: field.field_name,
            code: 'type',
            message: `Field '${field.field_name}' must be an object`,
            value
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: field.field_name,
            code: 'type',
            message: `Field '${field.field_name}' must be an array`,
            value
          });
        }
        break;
    }

    return errors;
  }

  /**
   * Validate custom rules
   */
  private validateCustomRules(field: FieldDefinition, value: any, allData: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      const rules = typeof field.field_validation_rules === 'string' 
        ? JSON.parse(field.field_validation_rules) 
        : field.field_validation_rules;

      // Min length
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push({
          field: field.name,
          code: 'minLength',
                      message: `Field '${field.field_name}' must be at least ${rules.minLength} characters`,
          value
        });
      }

      // Max length
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push({
          field: field.name,
          code: 'maxLength',
                      message: `Field '${field.field_name}' must be at most ${rules.maxLength} characters`,
          value
        });
      }

      // Min value
      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push({
          field: field.name,
          code: 'min',
                      message: `Field '${field.field_name}' must be at least ${rules.min}`,
          value
        });
      }

      // Max value
      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push({
          field: field.name,
          code: 'max',
                      message: `Field '${field.field_name}' must be at most ${rules.max}`,
          value
        });
      }

      // Pattern (regex)
      if (rules.pattern && typeof value === 'string') {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: field.field_name,
            code: 'pattern',
            message: `Field '${field.field_name}' does not match required pattern`,
            value
          });
        }
      }

      // Email validation
      if (rules.email && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({
            field: field.field_name,
            code: 'email',
            message: `Field '${field.field_name}' must be a valid email address`,
            value
          });
        }
      }

    } catch (error) {
      errors.push({
        field: field.name,
        code: 'validation_error',
                    message: `Invalid validation rules for field '${field.field_name}'`,
        value
      });
    }

    return errors;
  }
}