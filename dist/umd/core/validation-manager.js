(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ValidationManager = void 0;
    /**
     * Validation Manager class
     */
    class ValidationManager {
        /**
         * Validate entity data against schema
         * @param entityConfig Entity configuration
         * @param data Data to validate
         * @param operation Operation type (create, update)
         */
        validateEntityData(entityConfig, data, operation) {
            const errors = [];
            // Validate each field
            for (const field of entityConfig.fields) {
                const value = data[field.name];
                // Check required fields (only for create operation or if field is present in update)
                if (field.is_required && (operation === 'create' || data.hasOwnProperty(field.name))) {
                    if (value === undefined || value === null || value === '') {
                        errors.push({
                            field: field.name,
                            code: 'required',
                            message: `Field '${field.name}' is required`,
                            value
                        });
                        continue;
                    }
                }
                // Skip validation if value is not provided
                if (value === undefined || value === null) {
                    continue;
                }
                // Type validation
                const typeErrors = this.validateFieldType(field, value);
                errors.push(...typeErrors);
                // Check uniqueness if required
                if (field.is_unique && value !== undefined && value !== null) {
                    // This would require a database check, which we'll skip for now
                    // In a real implementation, we would check if the value already exists
                }
                // Custom validation rules
                if (field.validation_rules && field.validation_rules.custom) {
                    // In a real implementation, we would execute custom validation functions
                    // This is a placeholder for custom validation
                }
            }
            return {
                isValid: errors.length === 0,
                errors
            };
        }
        /**
         * Validate field type and constraints
         * @param field Field definition
         * @param value Value to validate
         * @private
         */
        validateFieldType(field, value) {
            const errors = [];
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
                    else if (field.validation_rules) {
                        // String-specific validations
                        if (field.validation_rules.minLength && value.length < field.validation_rules.minLength) {
                            errors.push({
                                field: field.name,
                                code: 'minLength',
                                message: `Field '${field.name}' must be at least ${field.validation_rules.minLength} characters`,
                                value
                            });
                        }
                        if (field.validation_rules.maxLength && value.length > field.validation_rules.maxLength) {
                            errors.push({
                                field: field.name,
                                code: 'maxLength',
                                message: `Field '${field.name}' must be at most ${field.validation_rules.maxLength} characters`,
                                value
                            });
                        }
                        if (field.validation_rules.pattern) {
                            const regex = new RegExp(field.validation_rules.pattern);
                            if (!regex.test(value)) {
                                errors.push({
                                    field: field.name,
                                    code: 'pattern',
                                    message: `Field '${field.name}' does not match required pattern`,
                                    value
                                });
                            }
                        }
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
                    else if (field.validation_rules) {
                        // Number-specific validations
                        if (field.validation_rules.min !== undefined && value < field.validation_rules.min) {
                            errors.push({
                                field: field.name,
                                code: 'min',
                                message: `Field '${field.name}' must be at least ${field.validation_rules.min}`,
                                value
                            });
                        }
                        if (field.validation_rules.max !== undefined && value > field.validation_rules.max) {
                            errors.push({
                                field: field.name,
                                code: 'max',
                                message: `Field '${field.name}' must be at most ${field.validation_rules.max}`,
                                value
                            });
                        }
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
                    if (!(value instanceof Date) && isNaN(Date.parse(value))) {
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
                    else if (field.validation_rules) {
                        // Array-specific validations
                        if (field.validation_rules.minItems && value.length < field.validation_rules.minItems) {
                            errors.push({
                                field: field.name,
                                code: 'minItems',
                                message: `Field '${field.name}' must have at least ${field.validation_rules.minItems} items`,
                                value
                            });
                        }
                        if (field.validation_rules.maxItems && value.length > field.validation_rules.maxItems) {
                            errors.push({
                                field: field.name,
                                code: 'maxItems',
                                message: `Field '${field.name}' must have at most ${field.validation_rules.maxItems} items`,
                                value
                            });
                        }
                    }
                    break;
                case 'json':
                    try {
                        if (typeof value === 'string') {
                            JSON.parse(value);
                        }
                        else if (typeof value !== 'object') {
                            throw new Error('Not an object');
                        }
                    }
                    catch (e) {
                        errors.push({
                            field: field.name,
                            code: 'type',
                            message: `Field '${field.name}' must be valid JSON`,
                            value
                        });
                    }
                    break;
                case 'reference':
                    // Reference validation would require checking if the referenced entity exists
                    // This is a simplified version
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
        /**
         * Prepare data for insertion
         * @param entityConfig Entity configuration
         * @param data Data to prepare
         */
        prepareDataForInsert(entityConfig, data) {
            const result = {};
            // Process each field
            for (const field of entityConfig.fields) {
                let value = data[field.name];
                // Apply default value if not provided
                if ((value === undefined || value === null) && field.default_value !== undefined) {
                    value = field.default_value;
                }
                // Skip undefined values
                if (value === undefined) {
                    continue;
                }
                // Convert values based on field type
                result[field.name] = this.convertValueForStorage(field, value);
            }
            return result;
        }
        /**
         * Prepare data for update
         * @param entityConfig Entity configuration
         * @param data Data to prepare
         */
        prepareDataForUpdate(entityConfig, data) {
            const result = {};
            // Process each field
            for (const field of entityConfig.fields) {
                // Skip fields that are not in the update data
                if (!data.hasOwnProperty(field.name)) {
                    continue;
                }
                const value = data[field.name];
                // Skip undefined values
                if (value === undefined) {
                    continue;
                }
                // Convert values based on field type
                result[field.name] = this.convertValueForStorage(field, value);
            }
            return result;
        }
        /**
         * Process entity result from database
         * @param entityConfig Entity configuration
         * @param data Data from database
         */
        processEntityResult(entityConfig, data) {
            const result = { ...data };
            // Process each field
            for (const field of entityConfig.fields) {
                const value = data[field.name];
                // Skip null or undefined values
                if (value === null || value === undefined) {
                    continue;
                }
                // Convert values based on field type
                result[field.name] = this.convertValueFromStorage(field, value);
            }
            return result;
        }
        /**
         * Convert value for storage in database
         * @param field Field definition
         * @param value Value to convert
         * @private
         */
        convertValueForStorage(field, value) {
            switch (field.type) {
                case 'date':
                    if (value instanceof Date) {
                        return value.toISOString();
                    }
                    break;
                case 'json':
                case 'array':
                    if (typeof value === 'object') {
                        return JSON.stringify(value);
                    }
                    break;
            }
            return value;
        }
        /**
         * Convert value from storage format
         * @param field Field definition
         * @param value Value to convert
         * @private
         */
        convertValueFromStorage(field, value) {
            switch (field.type) {
                case 'date':
                    return new Date(value);
                case 'json':
                case 'array':
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value);
                        }
                        catch (e) {
                            // If parsing fails, keep original value
                        }
                    }
                    break;
                case 'number':
                    return Number(value);
                case 'boolean':
                    // Convert various boolean representations
                    if (value === 'true' || value === '1' || value === 1) {
                        return true;
                    }
                    else if (value === 'false' || value === '0' || value === 0) {
                        return false;
                    }
                    break;
            }
            return value;
        }
    }
    exports.ValidationManager = ValidationManager;
});
//# sourceMappingURL=validation-manager.js.map