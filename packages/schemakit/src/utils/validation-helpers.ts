/**
 * Validation Helper Utilities
 * Common validation functions for SchemaKit
 */

/**
 * Validate email address format
 * @param email Email address to validate
 * @returns True if email format is valid
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate URL format
 * @param url URL to validate
 * @returns True if URL format is valid
 */
export function validateUrl(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Additional validation: must have a proper hostname (not just a dot)
    if (!urlObj.hostname || urlObj.hostname === '.' || urlObj.hostname.startsWith('.')) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate string against a regex pattern
 * @param value String to validate
 * @param pattern Regex pattern (string or RegExp)
 * @returns True if string matches pattern
 */
export function validatePattern(value: string, pattern: string | RegExp): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return regex.test(value);
  } catch (e) {
    return false;
  }
}

/**
 * Sanitize input string by removing potentially harmful characters
 * @param input Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<\//g, '/') // Replace closing tags </tag> with /tag first
    .replace(/</g, '') // Remove opening angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/\s*on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Validate phone number format (basic validation)
 * @param phone Phone number to validate
 * @returns True if phone format is valid
 */
export function validatePhone(phone: string): boolean {
  if (typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it has 10-15 digits (international range)
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Validate credit card number using Luhn algorithm
 * @param cardNumber Credit card number to validate
 * @returns True if card number is valid
 */
export function validateCreditCard(cardNumber: string): boolean {
  if (typeof cardNumber !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digits = cardNumber.replace(/\D/g, '');
  
  // Check if it has valid length
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate password strength
 * @param password Password to validate
 * @param options Validation options
 * @returns Validation result with score and feedback
 */
export function validatePassword(password: string, options: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
} = {}): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true
  } = options;

  const feedback: string[] = [];
  let score = 0;

  if (typeof password !== 'string') {
    return { isValid: false, score: 0, feedback: ['Password must be a string'] };
  }

  // Length check
  if (password.length < minLength) {
    feedback.push(`Password must be at least ${minLength} characters long`);
  } else {
    score += 1;
  }

  // Uppercase check
  if (requireUppercase && !/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  // Lowercase check
  if (requireLowercase && !/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  // Numbers check
  if (requireNumbers && !/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 1;
  }

  // Special characters check
  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  }

  // Additional score for length
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  return {
    isValid: feedback.length === 0,
    score: Math.min(score, 5), // Max score of 5
    feedback
  };
}

/**
 * Validate IPv4 address
 * @param ip IP address to validate
 * @returns True if IP address is valid
 */
export function validateIPv4(ip: string): boolean {
  if (typeof ip !== 'string') {
    return false;
  }

  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }

  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Validate IPv6 address (basic validation)
 * @param ip IPv6 address to validate
 * @returns True if IPv6 address is valid
 */
export function validateIPv6(ip: string): boolean {
  if (typeof ip !== 'string') {
    return false;
  }

  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  return ipv6Regex.test(ip);
}

/**
 * Validate MAC address
 * @param mac MAC address to validate
 * @returns True if MAC address is valid
 */
export function validateMacAddress(mac: string): boolean {
  if (typeof mac !== 'string') {
    return false;
  }

  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * Validate UUID format
 * @param uuid UUID to validate
 * @returns True if UUID format is valid
 */
export function validateUUID(uuid: string): boolean {
  if (typeof uuid !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate hexadecimal color code
 * @param color Color code to validate
 * @returns True if color code is valid
 */
export function validateHexColor(color: string): boolean {
  if (typeof color !== 'string') {
    return false;
  }

  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * Validate JSON string
 * @param json JSON string to validate
 * @returns True if JSON is valid
 */
export function validateJSON(json: string): boolean {
  if (typeof json !== 'string') {
    return false;
  }

  try {
    JSON.parse(json);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate base64 string
 * @param base64 Base64 string to validate
 * @returns True if base64 is valid
 */
export function validateBase64(base64: string): boolean {
  if (typeof base64 !== 'string' || base64.length === 0) {
    return false;
  }

  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64) || base64.length % 4 !== 0) {
    return false;
  }

  // Additional validation: try to decode to ensure it's actually valid
  try {
    // In Node.js environment, use Buffer
    if (typeof Buffer !== 'undefined') {
      Buffer.from(base64, 'base64');
    } else {
      // In browser environment, use atob
      atob(base64);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate slug format (URL-friendly string)
 * @param slug Slug to validate
 * @returns True if slug format is valid
 */
export function validateSlug(slug: string): boolean {
  if (typeof slug !== 'string') {
    return false;
  }

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Validate username format
 * @param username Username to validate
 * @param options Validation options
 * @returns True if username format is valid
 */
export function validateUsername(username: string, options: {
  minLength?: number;
  maxLength?: number;
  allowNumbers?: boolean;
  allowUnderscore?: boolean;
  allowDash?: boolean;
} = {}): boolean {
  if (typeof username !== 'string') {
    return false;
  }

  const {
    minLength = 3,
    maxLength = 20,
    allowNumbers = true,
    allowUnderscore = true,
    allowDash = false
  } = options;

  if (username.length < minLength || username.length > maxLength) {
    return false;
  }

  let pattern = 'a-zA-Z';
  if (allowNumbers) pattern += '0-9';
  if (allowUnderscore) pattern += '_';
  if (allowDash) pattern += '-';

  const regex = new RegExp(`^[${pattern}]+$`);
  return regex.test(username);
}

/**
 * Validate that a value is within a numeric range
 * @param value Value to validate
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns True if value is within range
 */
export function validateRange(value: number, min: number, max: number): boolean {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }

  return value >= min && value <= max;
}

/**
 * Validate that a string length is within specified bounds
 * @param value String to validate
 * @param minLength Minimum length (inclusive)
 * @param maxLength Maximum length (inclusive)
 * @returns True if string length is within bounds
 */
export function validateLength(value: string, minLength: number, maxLength: number): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  return value.length >= minLength && value.length <= maxLength;
}

/**
 * Validate that an array has the correct number of items
 * @param array Array to validate
 * @param minItems Minimum number of items
 * @param maxItems Maximum number of items
 * @returns True if array length is within bounds
 */
export function validateArrayLength(array: any[], minItems: number, maxItems: number): boolean {
  if (!Array.isArray(array)) {
    return false;
  }

  return array.length >= minItems && array.length <= maxItems;
}

/**
 * Validate that a value is one of the allowed values
 * @param value Value to validate
 * @param allowedValues Array of allowed values
 * @returns True if value is in allowed values
 */
export function validateEnum(value: any, allowedValues: any[]): boolean {
  return allowedValues.includes(value);
}

/**
 * Comprehensive field validation function
 * @param value Value to validate
 * @param rules Validation rules
 * @returns Validation result
 */
export function validateField(value: any, rules: {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'phone' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string | RegExp;
  enum?: any[];
  custom?: (value: any) => boolean;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push('Field is required');
    return { isValid: false, errors };
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return { isValid: true, errors: [] };
  }

  // Type validation
  if (rules.type) {
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push('Value must be a string');
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push('Value must be a number');
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push('Value must be a boolean');
        }
        break;
      case 'email':
        if (!validateEmail(value)) {
          errors.push('Value must be a valid email address');
        }
        break;
      case 'url':
        if (!validateUrl(value)) {
          errors.push('Value must be a valid URL');
        }
        break;
      case 'phone':
        if (!validatePhone(value)) {
          errors.push('Value must be a valid phone number');
        }
        break;
      case 'uuid':
        if (!validateUUID(value)) {
          errors.push('Value must be a valid UUID');
        }
        break;
    }
  }

  // Length validation for strings
  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      errors.push(`Value must be at least ${rules.minLength} characters long`);
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      errors.push(`Value must be at most ${rules.maxLength} characters long`);
    }
  }

  // Range validation for numbers
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`Value must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`Value must be at most ${rules.max}`);
    }
  }

  // Pattern validation
  if (rules.pattern && typeof value === 'string') {
    if (!validatePattern(value, rules.pattern)) {
      errors.push('Value does not match required pattern');
    }
  }

  // Enum validation
  if (rules.enum && !validateEnum(value, rules.enum)) {
    errors.push(`Value must be one of: ${rules.enum.join(', ')}`);
  }

  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    errors.push('Value failed custom validation');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}