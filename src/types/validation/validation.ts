/**
 * Validation types for data integrity and business rules
 */

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

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
  metadata?: Record<string, any>;
}