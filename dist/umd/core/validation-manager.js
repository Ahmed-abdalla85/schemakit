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
     * Simplified ValidationManager class
     * Essential validation only
     */
    class ValidationManager {
        /**
         * Validate entity data against schema
         */
        async validate(entityConfig, data, operation) {
            const errors = [];
            // Validate each field
            for (const field of entityConfig.fields) {
                const fieldErrors = this.validateField(field, data[field.name], operation, data);
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
        validateField(fieldConfig, value, operation = 'create', allData = {}) {
            const errors = [];
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
                    if (!(value instanceof Date) && isNaN(Date.parse(value))) {
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
                    if (typeof value !== 'object' || value === null) {
                        errors.push({
                            field: field.name,
                            code: 'type',
                            message: `Field '${field.name}' must be an object`,
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
            }
            return errors;
        }
        /**
         * Validate custom rules
         */
        validateCustomRules(field, value, allData) {
            const errors = [];
            try {
                const rules = typeof field.validation_rules === 'string'
                    ? JSON.parse(field.validation_rules)
                    : field.validation_rules;
                // Min length
                if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
                    errors.push({
                        field: field.name,
                        code: 'minLength',
                        message: `Field '${field.name}' must be at least ${rules.minLength} characters`,
                        value
                    });
                }
                // Max length
                if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                    errors.push({
                        field: field.name,
                        code: 'maxLength',
                        message: `Field '${field.name}' must be at most ${rules.maxLength} characters`,
                        value
                    });
                }
                // Min value
                if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
                    errors.push({
                        field: field.name,
                        code: 'min',
                        message: `Field '${field.name}' must be at least ${rules.min}`,
                        value
                    });
                }
                // Max value
                if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
                    errors.push({
                        field: field.name,
                        code: 'max',
                        message: `Field '${field.name}' must be at most ${rules.max}`,
                        value
                    });
                }
                // Pattern (regex)
                if (rules.pattern && typeof value === 'string') {
                    const regex = new RegExp(rules.pattern);
                    if (!regex.test(value)) {
                        errors.push({
                            field: field.name,
                            code: 'pattern',
                            message: `Field '${field.name}' does not match required pattern`,
                            value
                        });
                    }
                }
                // Email validation
                if (rules.email && typeof value === 'string') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errors.push({
                            field: field.name,
                            code: 'email',
                            message: `Field '${field.name}' must be a valid email address`,
                            value
                        });
                    }
                }
            }
            catch (error) {
                errors.push({
                    field: field.name,
                    code: 'validation_error',
                    message: `Invalid validation rules for field '${field.name}'`,
                    value
                });
            }
            return errors;
        }
    }
    exports.ValidationManager = ValidationManager;
});
//# sourceMappingURL=validation-manager.js.map