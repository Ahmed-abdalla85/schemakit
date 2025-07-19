/**
 * ID Generation Utilities
 * Centralized ID generation functions for SchemaKit
 */

/**
 * Generate a simple UUID v4
 * @returns UUID string in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a proper UUID v4 using crypto if available
 * Falls back to generateId() if crypto is not available
 * @returns UUID string
 */
export function generateUUID(): string {
  // Check if we're in a browser environment with crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Check if we're in Node.js with crypto module
  try {
    const crypto = require('crypto');
    return crypto.randomUUID();
  } catch (e) {
    // Fall back to our simple implementation
    return generateId();
  }
}

/**
 * Generate a short ID (8 characters)
 * Useful for shorter identifiers where full UUID is not needed
 * @returns Short ID string
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Generate a sequential ID for a given table (used by in-memory adapter)
 * @param tableName Table name
 * @param lastIds Map of table names to last used IDs
 * @returns Sequential ID string
 */
export function generateSequentialId(tableName: string, lastIds: Map<string, number>): string {
  const currentId = lastIds.get(tableName) || 0;
  const newId = currentId + 1;
  lastIds.set(tableName, newId);
  return newId.toString();
}

/**
 * Generate a timestamp-based ID
 * Useful for IDs that need to be sortable by creation time
 * @returns Timestamp-based ID string
 */
export function generateTimestampId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Validate if a string is a valid UUID format
 * @param id ID string to validate
 * @returns True if valid UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Generate a prefixed ID with a given prefix
 * @param prefix Prefix for the ID
 * @param separator Separator between prefix and ID (default: '_')
 * @returns Prefixed ID string
 */
export function generatePrefixedId(prefix: string, separator: string = '_'): string {
  return `${prefix}${separator}${generateShortId()}`;
}