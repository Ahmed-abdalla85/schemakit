/**
 * Unit tests for JSON helper utilities
 */
import {
  safeJsonParse,
  safeJsonStringify,
  isValidJson,
  parseJsonField,
  deepClone,
  deepMerge,
  isPlainObject,
  getNestedProperty,
  setNestedProperty,
  removeUndefinedValues,
  toCamelCase,
  toSnakeCase,
  pick,
  omit,
  deepEqual,
  flattenObject,
  unflattenObject
} from '../../../src/utils/json-helpers';

describe('JSON Helper Utilities', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"name": "test"}', {});
      expect(result).toEqual({ name: 'test' });
    });

    it('should return default value for invalid JSON', () => {
      const defaultValue = { error: true };
      const result = safeJsonParse('invalid json', defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('should return default value for non-string input', () => {
      const defaultValue = { error: true };
      const result = safeJsonParse(123 as any, defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('should handle complex objects', () => {
      const obj = { users: [{ id: 1, name: 'John' }], meta: { count: 1 } };
      const json = JSON.stringify(obj);
      const result = safeJsonParse(json, {});
      expect(result).toEqual(obj);
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify valid objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = safeJsonStringify(obj);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should stringify with pretty formatting', () => {
      const obj = { name: 'test' };
      const result = safeJsonStringify(obj, true);
      expect(result).toBe('{\n  "name": "test"\n}');
    });

    it('should return empty string for circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference
      const result = safeJsonStringify(obj);
      expect(result).toBe('');
    });

    it('should handle primitive values', () => {
      expect(safeJsonStringify('string')).toBe('"string"');
      expect(safeJsonStringify(123)).toBe('123');
      expect(safeJsonStringify(true)).toBe('true');
      expect(safeJsonStringify(null)).toBe('null');
    });
  });

  describe('isValidJson', () => {
    it('should return true for valid JSON strings', () => {
      const validJson = [
        '{}',
        '[]',
        '{"name": "test"}',
        '[1, 2, 3]',
        '"string"',
        '123',
        'true',
        'null'
      ];

      validJson.forEach(json => {
        expect(isValidJson(json)).toBe(true);
      });
    });

    it('should return false for invalid JSON strings', () => {
      const invalidJson = [
        '{name: "test"}', // Missing quotes
        '[1, 2, 3,]', // Trailing comma
        'undefined',
        'function() {}',
        '{',
        ''
      ];

      invalidJson.forEach(json => {
        expect(isValidJson(json)).toBe(false);
      });
    });

    it('should return false for non-string input', () => {
      expect(isValidJson(123 as any)).toBe(false);
      expect(isValidJson({} as any)).toBe(false);
      expect(isValidJson(null as any)).toBe(false);
    });
  });

  describe('parseJsonField', () => {
    it('should parse string JSON field', () => {
      const result = parseJsonField('{"name": "test"}', {});
      expect(result).toEqual({ name: 'test' });
    });

    it('should return object field as-is', () => {
      const obj = { name: 'test' };
      const result = parseJsonField(obj, {});
      expect(result).toBe(obj);
    });

    it('should return default for null/undefined', () => {
      const defaultValue = { default: true };
      expect(parseJsonField(null, defaultValue)).toBe(defaultValue);
      expect(parseJsonField(undefined, defaultValue)).toBe(defaultValue);
    });

    it('should return default for invalid JSON', () => {
      const defaultValue = { default: true };
      const result = parseJsonField('invalid json', defaultValue);
      expect(result).toBe(defaultValue);
    });
  });

  describe('deepClone', () => {
    it('should clone simple objects', () => {
      const obj = { name: 'test', value: 123 };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { user: { name: 'John', profile: { age: 30 } } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.user).not.toBe(obj.user);
      expect(cloned.user.profile).not.toBe(obj.user.profile);
    });

    it('should clone arrays', () => {
      const arr = [1, { name: 'test' }, [2, 3]];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
    });

    it('should handle primitive values', () => {
      expect(deepClone('string')).toBe('string');
      expect(deepClone(123)).toBe(123);
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });
  });

  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const target = { user: { name: 'John', age: 30 } };
      const source = { user: { age: 31, city: 'NYC' } as any };
      const result = deepMerge(target, source);
      expect(result).toEqual({ user: { name: 'John', age: 31, city: 'NYC' } });
    });

    it('should not modify original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 } as any;
      const result = deepMerge(target, source);
      expect(target).toEqual({ a: 1 });
      expect(source).toEqual({ b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ name: 'test' })).toBe(true);
    });

    it('should return false for non-plain objects', () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
    });
  });

  describe('getNestedProperty', () => {
    const obj = {
      user: {
        profile: {
          name: 'John',
          age: 30
        },
        settings: {
          theme: 'dark'
        }
      }
    };

    it('should get nested properties', () => {
      expect(getNestedProperty(obj, 'user.profile.name', '')).toBe('John');
      expect(getNestedProperty(obj, 'user.settings.theme', '')).toBe('dark');
    });

    it('should return default for non-existent properties', () => {
      expect(getNestedProperty(obj, 'user.profile.email', 'default')).toBe('default');
      expect(getNestedProperty(obj, 'nonexistent.path', 'default')).toBe('default');
    });

    it('should handle null/undefined objects', () => {
      expect(getNestedProperty(null, 'path', 'default')).toBe('default');
      expect(getNestedProperty(undefined, 'path', 'default')).toBe('default');
    });
  });

  describe('setNestedProperty', () => {
    it('should set nested properties', () => {
      const obj = {};
      setNestedProperty(obj, 'user.profile.name', 'John');
      expect(obj).toEqual({ user: { profile: { name: 'John' } } });
    });

    it('should overwrite existing properties', () => {
      const obj = { user: { name: 'Jane' } };
      setNestedProperty(obj, 'user.name', 'John');
      expect(obj.user.name).toBe('John');
    });

    it('should create intermediate objects', () => {
      const obj = {};
      setNestedProperty(obj, 'a.b.c.d', 'value');
      expect(obj).toEqual({ a: { b: { c: { d: 'value' } } } });
    });
  });

  describe('removeUndefinedValues', () => {
    it('should remove undefined values', () => {
      const obj = { a: 1, b: undefined, c: 'test' };
      const result = removeUndefinedValues(obj);
      expect(result).toEqual({ a: 1, c: 'test' });
    });

    it('should optionally remove null values', () => {
      const obj = { a: 1, b: null, c: undefined };
      const result = removeUndefinedValues(obj, true);
      expect(result).toEqual({ a: 1 });
    });

    it('should handle nested objects', () => {
      const obj = { user: { name: 'John', age: undefined }, meta: undefined };
      const result = removeUndefinedValues(obj);
      expect(result).toEqual({ user: { name: 'John' } });
    });
  });

  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      const obj = { user_name: 'John', user_age: 30 };
      const result = toCamelCase(obj);
      expect(result).toEqual({ userName: 'John', userAge: 30 });
    });

    it('should handle nested objects', () => {
      const obj = { user_profile: { first_name: 'John', last_name: 'Doe' } };
      const result = toCamelCase(obj);
      expect(result).toEqual({ userProfile: { firstName: 'John', lastName: 'Doe' } });
    });

    it('should handle arrays', () => {
      const obj = { user_list: [{ user_name: 'John' }, { user_name: 'Jane' }] };
      const result = toCamelCase(obj);
      expect(result).toEqual({ userList: [{ userName: 'John' }, { userName: 'Jane' }] });
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      const obj = { userName: 'John', userAge: 30 };
      const result = toSnakeCase(obj);
      expect(result).toEqual({ user_name: 'John', user_age: 30 });
    });

    it('should handle nested objects', () => {
      const obj = { userProfile: { firstName: 'John', lastName: 'Doe' } };
      const result = toSnakeCase(obj);
      expect(result).toEqual({ user_profile: { first_name: 'John', last_name: 'Doe' } });
    });
  });

  describe('pick', () => {
    it('should pick specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should ignore non-existent properties', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ['a', 'c' as any]);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('omit', () => {
    it('should omit specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should ignore non-existent properties', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ['c' as any]);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('deepEqual', () => {
    it('should return true for equal objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should return false for different objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 3 } };
      expect(deepEqual(obj1, obj2)).toBe(false);
    });

    it('should handle arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('should handle primitive values', () => {
      expect(deepEqual('test', 'test')).toBe(true);
      expect(deepEqual(123, 123)).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
    });
  });

  describe('flattenObject', () => {
    it('should flatten nested objects', () => {
      const obj = { a: { b: { c: 1 } }, d: 2 };
      const result = flattenObject(obj);
      expect(result).toEqual({ 'a.b.c': 1, d: 2 });
    });

    it('should handle arrays as values', () => {
      const obj = { a: { b: [1, 2, 3] } };
      const result = flattenObject(obj);
      expect(result).toEqual({ 'a.b': [1, 2, 3] });
    });
  });

  describe('unflattenObject', () => {
    it('should unflatten dot notation keys', () => {
      const obj = { 'a.b.c': 1, 'd': 2 };
      const result = unflattenObject(obj);
      expect(result).toEqual({ a: { b: { c: 1 } }, d: 2 });
    });

    it('should handle complex nested structures', () => {
      const obj = { 'user.profile.name': 'John', 'user.profile.age': 30, 'user.settings.theme': 'dark' };
      const result = unflattenObject(obj);
      expect(result).toEqual({
        user: {
          profile: { name: 'John', age: 30 },
          settings: { theme: 'dark' }
        }
      });
    });
  });

  describe('Integration tests', () => {
    it('should work together for complex operations', () => {
      const originalObj = {
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          settings: {
            theme_preference: 'dark',
            notification_enabled: true
          }
        }
      };

      // Convert to camelCase
      const camelCased = toCamelCase(originalObj);
      expect(camelCased.userProfile.firstName).toBe('John');

      // Clone the object
      const cloned = deepClone(camelCased);
      expect(cloned).not.toBe(camelCased);

      // Flatten and unflatten
      const flattened = flattenObject(cloned);
      const unflattened = unflattenObject(flattened);
      expect(deepEqual(cloned, unflattened)).toBe(true);

      // JSON round trip
      const jsonString = safeJsonStringify(unflattened);
      const parsed = safeJsonParse(jsonString, {});
      expect(deepEqual(unflattened, parsed)).toBe(true);
    });
  });
});