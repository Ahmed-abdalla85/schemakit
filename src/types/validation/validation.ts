/**
 * Validation types for data integrity and business rules
 * 
 * SchemaKit provides comprehensive validation for entity fields,
 * supporting both built-in validators and custom business rules.
 * 
 * @since 0.1.0
 */

/**
 * Single validation error for a field
 * 
 * @example
 * ```typescript
 * const error: ValidationError = {
 *   field: 'email',
 *   code: 'INVALID_FORMAT',
 *   message: 'Email address must be valid',
 *   value: 'invalid-email'
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** The value that failed validation */
  value?: any;
}

/**
 * Non-blocking validation warning
 * 
 * @example
 * ```typescript
 * const warning: ValidationWarning = {
 *   field: 'phone',
 *   message: 'Phone number format may not be recognized internationally',
 *   value: '555-1234'
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface ValidationWarning {
  /** Field name with the warning */
  field: string;
  /** Warning message */
  message: string;
  /** The value that triggered the warning */
  value?: any;
}

/**
 * Complete validation result for data
 * 
 * @example
 * ```typescript
 * // Successful validation
 * const result: ValidationResult = {
 *   isValid: true,
 *   errors: [],
 *   warnings: []
 * };
 * 
 * // Failed validation
 * const failedResult: ValidationResult = {
 *   isValid: false,
 *   errors: [
 *     {
 *       field: 'email',
 *       code: 'REQUIRED',
 *       message: 'Email is required',
 *       value: undefined
 *     }
 *   ],
 *   warnings: [
 *     {
 *       field: 'phone',
 *       message: 'Consider using international format',
 *       value: '555-1234'
 *     }
 *   ]
 * };
 * 
 * // Usage in entity operations
 * const validation = await entity.validate(data);
 * if (!validation.isValid) {
 *   throw new ValidationError('Data validation failed', validation.errors);
 * }
 * ```
 * 
 * @since 0.1.0
 */
export interface ValidationResult {
  /** Whether all validations passed */
  isValid: boolean;
  /** Array of validation errors (blocks operation if any) */
  errors: ValidationError[];
  /** Array of validation warnings (informational only) */
  warnings?: ValidationWarning[];
}

/**
 * Detailed validation error with metadata
 * 
 * Extended error information for complex validation scenarios
 * and integration with external validation systems.
 * 
 * @example
 * ```typescript
 * const detailedError: ValidationErrorDetail = {
 *   field: 'age',
 *   message: 'Age must be between 18 and 65',
 *   code: 'OUT_OF_RANGE',
 *   value: 17,
 *   metadata: {
 *     min: 18,
 *     max: 65,
 *     validationType: 'range'
 *   }
 * };
 * ```
 * 
 * @since 0.1.0
 */
export interface ValidationErrorDetail {
  /** Field name that failed validation */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** The value that failed validation */
  value?: any;
  /** Additional metadata about the validation failure */
  metadata?: Record<string, any>;
}