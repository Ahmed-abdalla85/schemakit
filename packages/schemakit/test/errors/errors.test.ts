import {
  SchemaKitError,
  ValidationError,
  SchemaError,
  EntityNotFoundError,
  PermissionError,
  WorkflowError,
  SchemaLoadError,
  DatabaseError,
  ErrorCode,
  isSchemaKitError,
  isValidationError,
  isSchemaError,
  isEntityNotFoundError,
  isPermissionError,
  isWorkflowError,
  isSchemaLoadError,
  isDatabaseError,
  getHttpStatus
} from '../../src/errors';

describe('Error Classes', () => {
  // Test SchemaKitError
  describe('SchemaKitError', () => {
    it('should create a basic error with message', () => {
      const error = new SchemaKitError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SchemaKitError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.UNEXPECTED_ERROR);
      expect(error.context).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should create an error with code and context', () => {
      const context = { userId: 123 };
      const error = new SchemaKitError('Test error', {
        code: ErrorCode.CONFIGURATION_ERROR,
        context
      });
      
      expect(error.code).toBe(ErrorCode.CONFIGURATION_ERROR);
      expect(error.context).toEqual(context);
    });

    it('should create an error with cause', () => {
      const cause = new Error('Original error');
      const error = new SchemaKitError('Test error', { cause });
      
      expect(error.cause).toBe(cause);
    });

    it('should serialize to JSON correctly', () => {
      const cause = new Error('Original error');
      const error = new SchemaKitError('Test error', {
        code: ErrorCode.VALIDATION_FAILED,
        context: { field: 'email' },
        cause
      });
      
      const json = JSON.parse(JSON.stringify(error));
      expect(json.name).toBe('SchemaKitError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(json.context).toEqual({ field: 'email' });
      expect(json.cause).toBeDefined();
      expect(json.cause.message).toBe('Original error');
    });
  });

  // Test ValidationError
  describe('ValidationError', () => {
    it('should create a validation error with details', () => {
      const errors = [
        { field: 'email', code: 'INVALID_EMAIL', message: 'Invalid email' },
        { field: 'password', code: 'TOO_SHORT', message: 'Password too short' }
      ];
      
      const error = new ValidationError(errors, 'User', {
        context: { requestId: '12345' }
      });
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.errors).toEqual(errors);
      expect(error.entityName).toBe('User');
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.context).toMatchObject({
        entityName: 'User',
        errorCount: 2,
        requestId: '12345'
      });
    });
  });

  // Test type guards
  describe('Type Guards', () => {
    it('should correctly identify error types', () => {
      const errors = {
        schemaKit: new SchemaKitError('Test'),
        validation: new ValidationError([], 'Test'),
        schema: new SchemaError('Test', 'Test'),
        notFound: new EntityNotFoundError('Test', '123'),
        permission: new PermissionError('read', 'User'),
        workflow: new WorkflowError('test-workflow', 'step1', {}),
        schemaLoad: new SchemaLoadError('User', {}),
        database: new DatabaseError('query', {})
      };

      expect(isSchemaKitError(errors.schemaKit)).toBe(true);
      expect(isValidationError(errors.validation)).toBe(true);
      expect(isSchemaError(errors.schema)).toBe(true);
      expect(isEntityNotFoundError(errors.notFound)).toBe(true);
      expect(isPermissionError(errors.permission)).toBe(true);
      expect(isWorkflowError(errors.workflow)).toBe(true);
      expect(isSchemaLoadError(errors.schemaLoad)).toBe(true);
      expect(isDatabaseError(errors.database)).toBe(true);

      // Test negative cases
      expect(isValidationError(errors.schemaKit)).toBe(false);
      expect(isSchemaError(errors.validation)).toBe(false);
    });
  });

  // Test HTTP status mapping
  describe('HTTP Status Mapping', () => {
    it('should map error codes to correct HTTP statuses', () => {
      expect(getHttpStatus(ErrorCode.VALIDATION_FAILED)).toBe(422);
      expect(getHttpStatus(ErrorCode.PERMISSION_DENIED)).toBe(403);
      expect(getHttpStatus(ErrorCode.NOT_FOUND)).toBe(404);
      expect(getHttpStatus(ErrorCode.DUPLICATE_ENTRY)).toBe(409);
      
      // Default to 500 for server errors
      expect(getHttpStatus(ErrorCode.DATABASE_ERROR)).toBe(500);
      expect(getHttpStatus(ErrorCode.SCHEMA_LOAD_ERROR)).toBe(500);
      expect(getHttpStatus(ErrorCode.WORKFLOW_ERROR)).toBe(500);
      expect(getHttpStatus(ErrorCode.CONFIGURATION_ERROR)).toBe(500);
      
      // Unknown code should default to 500
      expect(getHttpStatus('UNKNOWN_CODE' as ErrorCode)).toBe(500);
    });
  });

  // Test error inheritance
  describe('Error Inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const error = new ValidationError([], 'Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SchemaKitError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  // Test error context
  describe('Error Context', () => {
    it('should preserve context in error chain', () => {
      const innerError = new SchemaKitError('Inner error', {
        context: { userId: 123 }
      });
      
      const outerError = new SchemaKitError('Outer error', {
        cause: innerError,
        context: { requestId: 'abc123' }
      });
      
      expect(outerError.context).toMatchObject({ requestId: 'abc123' });
      
      if (outerError.cause && isSchemaKitError(outerError.cause)) {
        expect(outerError.cause.context).toMatchObject({ userId: 123 });
      } else {
        fail('Cause should be a SchemaKitError');
      }
    });
  });

  // Test error messages
  describe('Error Messages', () => {
    it('should include relevant information in error messages', () => {
      const notFoundError = new EntityNotFoundError('User', '123');
      expect(notFoundError.message).toContain('User');
      expect(notFoundError.message).toContain('123');
      
      const permissionError = new PermissionError('delete', 'Document');
      expect(permissionError.message).toContain('delete');
      expect(permissionError.message).toContain('Document');
      
      const dbError = new DatabaseError('query', {
        cause: new Error('Connection timeout')
      });
      expect(dbError.message).toContain('query');
      expect(dbError.message).toContain('Connection timeout');
    });
  });
});
