/**
 * JSON and Data Manipulation Utilities
 * Centralized JSON handling functions for SchemaKit
 */

/**
 * Safely parse JSON string with fallback to default value
 * @param value JSON string to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(value: string, defaultValue: T): T {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  try {
    return JSON.parse(value) as T;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Safely stringify an object to JSON
 * @param value Value to stringify
 * @param pretty Whether to format with indentation
 * @returns JSON string or empty string if stringify fails
 */
export function safeJsonStringify(value: any, pretty = false): string {
  try {
    return JSON.stringify(value, null, pretty ? 2 : 0);
  } catch (e) {
    return '';
  }
}

/**
 * Check if a string is valid JSON
 * @param value String to check
 * @returns True if string is valid JSON
 */
export function isValidJson(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Parse JSON field with type checking and fallback
 * Common pattern used throughout SchemaKit for parsing JSON fields from database
 * @param field Field value (string or already parsed object)
 * @param defaultValue Default value if parsing fails
 * @returns Parsed object or default value
 */
export function parseJsonField<T>(field: any, defaultValue: T): T {
  if (field === null || field === undefined) {
    return defaultValue;
  }

  if (typeof field === 'string') {
    return safeJsonParse(field, defaultValue);
  }

  // If it's already an object, return it
  if (typeof field === 'object') {
    return field as T;
  }

  return defaultValue;
}

/**
 * Deep clone an object using JSON serialization
 * Note: This method has limitations (functions, undefined, symbols are lost)
 * @param obj Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    // Fallback for objects that can't be serialized
    return obj;
  }
}

/**
 * Merge two objects deeply
 * @param target Target object
 * @param source Source object
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue as any);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Check if a value is a plain object (not array, date, etc.)
 * @param value Value to check
 * @returns True if value is a plain object
 */
export function isPlainObject(value: any): boolean {
  return value !== null && 
         typeof value === 'object' && 
         value.constructor === Object &&
         Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Get nested property from object using dot notation
 * @param obj Object to get property from
 * @param path Dot-separated path (e.g., 'user.profile.name')
 * @param defaultValue Default value if property doesn't exist
 * @returns Property value or default value
 */
export function getNestedProperty<T>(obj: any, path: string, defaultValue: T): T {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current as T;
}

/**
 * Set nested property in object using dot notation
 * @param obj Object to set property in
 * @param path Dot-separated path (e.g., 'user.profile.name')
 * @param value Value to set
 * @returns Modified object
 */
export function setNestedProperty<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || !isPlainObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Remove undefined and null values from object
 * @param obj Object to clean
 * @param removeNull Whether to remove null values (default: false)
 * @returns Cleaned object
 */
export function removeUndefinedValues<T extends Record<string, any>>(obj: T, removeNull = false): Partial<T> {
  const result: Partial<T> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (value === undefined) {
        continue; // Skip undefined values
      }
      
      if (removeNull && value === null) {
        continue; // Skip null values if requested
      }
      
      if (isPlainObject(value)) {
        const cleaned = removeUndefinedValues(value, removeNull);
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned as T[Extract<keyof T, string>];
        }
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Convert object keys to camelCase
 * @param obj Object to convert
 * @returns Object with camelCase keys
 */
export function toCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!isPlainObject(obj)) {
    return obj;
  }

  const result: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      
      if (isPlainObject(value)) {
        result[camelKey] = toCamelCase(value);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map((item: any) => isPlainObject(item) ? toCamelCase(item) : item);
      } else {
        result[camelKey] = value;
      }
    }
  }

  return result;
}

/**
 * Convert object keys to snake_case
 * @param obj Object to convert
 * @returns Object with snake_case keys
 */
export function toSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!isPlainObject(obj)) {
    return obj;
  }

  const result: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const value = obj[key];
      
      if (isPlainObject(value)) {
        result[snakeKey] = toSnakeCase(value);
      } else if (Array.isArray(value)) {
        result[snakeKey] = value.map((item: any) => isPlainObject(item) ? toSnakeCase(item) : item);
      } else {
        result[snakeKey] = value;
      }
    }
  }

  return result;
}

/**
 * Pick specific properties from an object
 * @param obj Source object
 * @param keys Keys to pick
 * @returns Object with only picked properties
 */
export function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Omit specific properties from an object
 * @param obj Source object
 * @param keys Keys to omit
 * @returns Object without omitted properties
 */
export function omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  
  for (const key of keys) {
    delete result[key];
  }
  
  return result;
}

/**
 * Check if two objects are deeply equal
 * @param obj1 First object
 * @param obj2 Second object
 * @returns True if objects are deeply equal
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 === null || obj2 === null || obj1 === undefined || obj2 === undefined) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }

    if (!deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Flatten a nested object into a single level with dot notation keys
 * @param obj Object to flatten
 * @param prefix Prefix for keys
 * @returns Flattened object
 */
export function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (isPlainObject(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
  }

  return result;
}

/**
 * Unflatten an object with dot notation keys back to nested structure
 * @param obj Flattened object
 * @returns Nested object
 */
export function unflattenObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      setNestedProperty(result, key, obj[key]);
    }
  }

  return result;
}