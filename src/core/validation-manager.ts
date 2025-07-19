/**
 * ValidationManager
 * Responsible for validating entity data against schemas
 */
import { EntityConfiguration, FieldDefinition } from '../types';
import { validateEmail, validateUrl, validatePattern, sanitizeInput } from '../utils/validation-helpers';
import { safeJsonParse, safeJsonStringify } from '../utils/json-helpers';
import { parseDate } from '../utils/date-helpers';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export type ValidatorFunction = (value: any, field: FieldDefinition, data: Record<string, any>) => ValidationError[];

/**
 * ValidationManager class
 * Single responsibility: Validate entity data against schemas
 */
export class ValidationManager {
  private customValidators: Map<string, ValidatorFunction> = new Map();

  /**
   * Validate entity data against schema
   * @param entityConfig Entity configuration
   * @param data Data to validate
   * @param operation Operation type (create, update)
   * @returns Validation result
   */
  async validate(
    entityConfig: EntityConfiguration, 
    data: Record<string, any>, 
    operation: 'create' | 'update'
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate each field
    for (const field of entityConfig.fields) {
      const fieldResult = await this.validateField(field, data[field.name], operation, data);
      errors.push(...fieldResult.errors);
      if (fieldResult.warnings) {
        warnings.push(...fieldResult.warnings);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate a single field
   * @param fieldConfig Field configuration
   * @param value Field value
   * @param operation Operation type (create, update)
   * @param allData All entity data for context
   * @returns Field validation result
   */
  async validateField(
    fieldConfig: FieldDefinition, 
    value: any, 
    operation: 'create' | 'update' = 'create',
    allData: Record<string, any> = {}
  ): Promise<FieldValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields (only for create operation or if field is present in update)
    if (fieldConfig.is_required && (operation === 'create' || allData.hasOwnProperty(fieldConfig.name))) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: fieldConfig.name,
          code: 'required',
          message: `Field '${fieldConfig.name}' is required`,
          value
        });
        return { isValid: false, errors, warnings };
      }
    }

    // Skip further validation if value is not provided
    if (value === undefined || value === null) {
      return { isValid: true, errors: [], warnings };
    }

    // Type validation
    const typeErrors = this.validateFieldType(fieldConfig, value);
    errors.push(...typeErrors);

    // Custom validation rules
    if (fieldConfig.validation_rules && typeof fieldConfig.validation_rules === 'object') {
      const customErrors = this.validateCustomRules(fieldConfig, value, allData);
      errors.push(...customErrors);
    }

    // Custom validators
    if (fieldConfig.validation_rules && fieldConfig.validation_rules.custom) {
      const validatorName = fieldConfig.validation_rules.custom;
      const validator = this.customValidators.get(validatorName);
      if (validator) {
        const customErrors = validator(value, fieldConfig, allData);
        errors.push(...customErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Register a custom validator
   * @param name Validator name
   * @param validator Validator function
   */
  registerValidator(name: string, validator: ValidatorFunction): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Get a custom validator
   * @param name Validator name
   * @returns Validator function or undefined
   */
  getValidator(name: string): ValidatorFunction | undefined {
    return this.customValidators.get(name);
  }

  /**
   * Validate custom rules
   * @param field Field definition
   * @param value Value to validate
   * @param allData All entity data for context
   * @returns Array of validation errors
   * @private
   */
  private validateCustomRules(field: FieldDefinition, value: any, allData: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = field.validation_rules;

    if (!rules || typeof rules !== 'object') {
      return errors;
    }

    // Email validation
    if (rules.email && typeof value === 'string') {
      if (!validateEmail(value)) {
        errors.push({
          field: field.name,
          code: 'email',
          message: `Field '${field.name}' must be a valid email address`,
          value
        });
      }
    }

    // URL validation
    if (rules.url && typeof value === 'string') {
      if (!validateUrl(value)) {
        errors.push({
          field: field.name,
          code: 'url',
          message: `Field '${field.name}' must be a valid URL`,
          value
        });
      }
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string') {
      if (!validatePattern(value, rules.pattern)) {
        errors.push({
          field: field.name,
          code: 'pattern',
          message: `Field '${field.name}' does not match required pattern`,
          value
        });
      }
    }

    // Length validations for strings
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: field.name,
          code: 'minLength',
          message: `Field '${field.name}' must be at least ${rules.minLength} characters`,
          value
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: field.name,
          code: 'maxLength',
          message: `Field '${field.name}' must be at most ${rules.maxLength} characters`,
          value
        });
      }
    }

    // Numeric validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field: field.name,
          code: 'min',
          message: `Field '${field.name}' must be at least ${rules.min}`,
          value
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field: field.name,
          code: 'max',
          message: `Field '${field.name}' must be at most ${rules.max}`,
          value
        });
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push({
          field: field.name,
          code: 'minItems',
          message: `Field '${field.name}' must have at least ${rules.minItems} items`,
          value
        });
      }

      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push({
          field: field.name,
          code: 'maxItems',
          message: `Field '${field.name}' must have at most ${rules.maxItems} items`,
          value
        });
      }
    }

    return errors;
  }

  /**
   * Validate field type and constraints
   * @param field Field definition
   * @param value Value to validate
   * @returns Array of validation errors
   * @private
   */
  private validateFieldType(field: FieldDefinition, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be a string`,
            value
          });
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be a number`,
            value
          });
        }
        break;
        
      case 'integer':
        if (!Number.isInteger(value)) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be an integer`,
            value
          });
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be a boolean`,
            value
          });
        }
        break;
        
      case 'date':
      case 'datetime':
        const parsedDate = parseDate(value);
        if (!parsedDate) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be a valid date`,
            value
          });
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be an array`,
            value
          });
        }
        break;
        
      case 'json':
      case 'object':
        if (typeof value === 'string') {
          const parsed = safeJsonParse(value, null);
          if (parsed === null && value !== 'null') {
            errors.push({
              field: field.name,
              code: 'type',
              message: `Field '${field.name}' must be valid JSON`,
              value
            });
          }
        } else if (typeof value !== 'object' || value === null) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be an object`,
            value
          });
        }
        break;
        
      case 'reference':
        if (typeof value !== 'string' && typeof value !== 'number') {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be a valid reference ID`,
            value
          });
        }
        break;
    }

    return errors;
  }

}