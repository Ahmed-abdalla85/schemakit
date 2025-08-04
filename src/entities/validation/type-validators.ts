/**
 * TypeValidators
 * Handles type-specific validation logic
 */
import { FieldDefinition } from '../../types/core';
import { ValidationError } from '../../types/validation';

export class TypeValidators {
  /**
   * Validate field type
   */
  static validateFieldType(field: FieldDefinition, value: any): ValidationError[] {
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
      case 'integer':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be a number`,
            value
          });
        }
        if (field.type === 'integer' && !Number.isInteger(value)) {
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
        if (!this.isValidDate(value)) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be a valid date`,
            value
          });
        }
        break;

      case 'json':
      case 'object':
        if (!this.isValidJson(value)) {
          errors.push({
            field: field.name,
            code: 'type',
            message: `Field '${field.name}' must be valid JSON`,
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

      default:
        // Unknown type, skip validation
        break;
    }

    return errors;
  }

  /**
   * Check if value is a valid date
   */
  private static isValidDate(value: any): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return false;
  }

  /**
   * Check if value is valid JSON
   */
  private static isValidJson(value: any): boolean {
    if (typeof value === 'object' && value !== null) return true;
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}