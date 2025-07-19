/**
 * ValidationManager
 * Responsible for validating entity data against schemas
 */
import { EntityConfiguration, FieldDefinition } from '../types';
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
export declare class ValidationManager {
    private customValidators;
    /**
     * Validate entity data against schema
     * @param entityConfig Entity configuration
     * @param data Data to validate
     * @param operation Operation type (create, update)
     * @returns Validation result
     */
    validate(entityConfig: EntityConfiguration, data: Record<string, any>, operation: 'create' | 'update'): Promise<ValidationResult>;
    /**
     * Validate a single field
     * @param fieldConfig Field configuration
     * @param value Field value
     * @param operation Operation type (create, update)
     * @param allData All entity data for context
     * @returns Field validation result
     */
    validateField(fieldConfig: FieldDefinition, value: any, operation?: 'create' | 'update', allData?: Record<string, any>): Promise<FieldValidationResult>;
    /**
     * Register a custom validator
     * @param name Validator name
     * @param validator Validator function
     */
    registerValidator(name: string, validator: ValidatorFunction): void;
    /**
     * Get a custom validator
     * @param name Validator name
     * @returns Validator function or undefined
     */
    getValidator(name: string): ValidatorFunction | undefined;
    /**
     * Validate custom rules
     * @param field Field definition
     * @param value Value to validate
     * @param allData All entity data for context
     * @returns Array of validation errors
     * @private
     */
    private validateCustomRules;
    /**
     * Validate field type and constraints
     * @param field Field definition
     * @param value Value to validate
     * @returns Array of validation errors
     * @private
     */
    private validateFieldType;
}
