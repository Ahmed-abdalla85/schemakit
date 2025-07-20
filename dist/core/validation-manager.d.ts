/**
 * ValidationManager - Simplified
 * Essential validation functionality only
 */
import { EntityConfiguration } from '../types';
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
export interface ValidationError {
    field: string;
    code: string;
    message: string;
    value?: any;
}
/**
 * Simplified ValidationManager class
 * Essential validation only
 */
export declare class ValidationManager {
    /**
     * Validate entity data against schema
     */
    validate(entityConfig: EntityConfiguration, data: Record<string, any>, operation: 'create' | 'update'): Promise<ValidationResult>;
    /**
     * Validate a single field
     */
    private validateField;
    /**
     * Validate field type
     */
    private validateFieldType;
    /**
     * Validate custom rules
     */
    private validateCustomRules;
}
