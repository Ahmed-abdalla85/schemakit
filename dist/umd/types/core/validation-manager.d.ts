/**
 * Validation Manager - Handles data validation against entity schemas
 */
import { EntityConfiguration } from '../types';
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
/**
 * Validation Manager class
 */
export declare class ValidationManager {
    /**
     * Validate entity data against schema
     * @param entityConfig Entity configuration
     * @param data Data to validate
     * @param operation Operation type (create, update)
     */
    validateEntityData(entityConfig: EntityConfiguration, data: Record<string, any>, operation: 'create' | 'update'): ValidationResult;
    /**
     * Validate field type and constraints
     * @param field Field definition
     * @param value Value to validate
     * @private
     */
    private validateFieldType;
    /**
     * Prepare data for insertion
     * @param entityConfig Entity configuration
     * @param data Data to prepare
     */
    prepareDataForInsert(entityConfig: EntityConfiguration, data: Record<string, any>): Record<string, any>;
    /**
     * Prepare data for update
     * @param entityConfig Entity configuration
     * @param data Data to prepare
     */
    prepareDataForUpdate(entityConfig: EntityConfiguration, data: Record<string, any>): Record<string, any>;
    /**
     * Process entity result from database
     * @param entityConfig Entity configuration
     * @param data Data from database
     */
    processEntityResult(entityConfig: EntityConfiguration, data: Record<string, any>): Record<string, any>;
    /**
     * Convert value for storage in database
     * @param field Field definition
     * @param value Value to convert
     * @private
     */
    private convertValueForStorage;
    /**
     * Convert value from storage format
     * @param field Field definition
     * @param value Value to convert
     * @private
     */
    private convertValueFromStorage;
}
