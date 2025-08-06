/**
 * Simple Test Suite
 * Basic tests that avoid circular import issues
 */

import { SchemaKitError, ValidationError } from '../src/errors';
import { generateId, generateUUID } from '../src/utils/id-generation';
import { validateEmail } from '../src/utils/validation-helpers';
import { safeJsonParse, safeJsonStringify } from '../src/utils/json-helpers';

describe('SchemaKit Simple Tests', () => {
  describe('Error Classes', () => {
    it('should create SchemaKitError', () => {
      const error = new SchemaKitError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('SchemaKitError');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create ValidationError', () => {
      const errors = [{ field: 'email', code: 'INVALID', message: 'Invalid email' }];
      const error = new ValidationError(errors, 'user');
      expect(error.name).toBe('ValidationError');
      expect(error.entityName).toBe('user');
      expect(error.errors).toEqual(errors);
    });
  });

  describe('ID Generation', () => {
    it('should generate string ID', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate UUID', () => {
      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBeGreaterThan(0);
      // Basic UUID format check
      expect(uuid).toMatch(/^[0-9a-f-]+$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Validation Helpers', () => {
    it('should validate email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should handle non-string email input', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);
    });
  });

  describe('JSON Helpers', () => {
    it('should safely parse JSON', () => {
      const validJson = '{"name": "John", "age": 30}';
      const result = safeJsonParse(validJson, {});
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should return default on invalid JSON', () => {
      const invalidJson = '{"name": "John"';
      const defaultValue = { error: true };
      const result = safeJsonParse(invalidJson, defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should safely stringify objects', () => {
      const obj = { name: 'John', age: 30 };
      const result = safeJsonStringify(obj);
      expect(result).toBe('{"name":"John","age":30}');
    });

    it('should handle circular references in stringify', () => {
      const obj: any = { name: 'John' };
      obj.self = obj; // Create circular reference
      const result = safeJsonStringify(obj);
      expect(result).toBe(''); // Should return empty string for circular refs
    });
  });
});