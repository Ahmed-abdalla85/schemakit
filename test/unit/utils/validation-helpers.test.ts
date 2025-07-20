/**
 * Unit tests for validation helper utilities
 */
import {
  validateEmail,
  validateUrl,
  validatePattern,
  sanitizeInput,
  validatePhone,
  validateCreditCard,
  validatePassword,
  validateIPv4,
  validateIPv6,
  validateMacAddress,
  validateUUID,
  validateHexColor,
  validateJSON,
  validateBase64,
  validateSlug,
  validateUsername,
  validateRange,
  validateLength,
  validateArrayLength,
  validateEnum,
  validateField
} from '../../../src/utils/validation-helpers';

describe('Validation Helper Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com',
        '',
        123 as any
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it('should handle emails with whitespace', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URL formats', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://sub.domain.com/path?query=value',
        'ftp://files.example.com',
        'https://localhost:3000'
      ];

      validUrls.forEach(url => {
        expect(validateUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://.com',
        '',
        123 as any
      ];

      invalidUrls.forEach(url => {
        expect(validateUrl(url)).toBe(false);
      });
    });
  });

  describe('validatePattern', () => {
    it('should validate against string patterns', () => {
      expect(validatePattern('abc123', '^[a-z]+[0-9]+$')).toBe(true);
      expect(validatePattern('ABC123', '^[a-z]+[0-9]+$')).toBe(false);
    });

    it('should validate against RegExp patterns', () => {
      const pattern = /^[A-Z]{2}[0-9]{4}$/;
      expect(validatePattern('AB1234', pattern)).toBe(true);
      expect(validatePattern('ab1234', pattern)).toBe(false);
    });

    it('should handle invalid patterns gracefully', () => {
      expect(validatePattern('test', '[invalid')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validatePattern(123 as any, '^[0-9]+$')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('script>alert("xss")/script>');
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeInput('<div onclick="alert()">test</div>')).toBe('div"alert()">test/div>');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(123 as any)).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
    });
  });

  describe('validatePhone', () => {
    it('should validate phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '(555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+44 20 7946 0958'
      ];

      validPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123', // Too short
        '12345678901234567890', // Too long
        'not-a-phone',
        '',
        123 as any
      ];

      invalidPhones.forEach(phone => {
        expect(validatePhone(phone)).toBe(false);
      });
    });
  });

  describe('validateCreditCard', () => {
    it('should validate valid credit card numbers', () => {
      const validCards = [
        '4532015112830366', // Visa
        '5555555555554444', // MasterCard
        '378282246310005'   // American Express
      ];

      validCards.forEach(card => {
        expect(validateCreditCard(card)).toBe(true);
      });
    });

    it('should reject invalid credit card numbers', () => {
      const invalidCards = [
        '1234567890123456', // Invalid Luhn
        '123', // Too short
        '12345678901234567890', // Too long
        'not-a-card',
        '',
        123 as any
      ];

      invalidCards.forEach(card => {
        expect(validateCreditCard(card)).toBe(false);
      });
    });

    it('should handle cards with spaces and dashes', () => {
      expect(validateCreditCard('4532-0151-1283-0366')).toBe(true);
      expect(validateCreditCard('4532 0151 1283 0366')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(3);
      expect(result.feedback).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should provide detailed feedback', () => {
      const result = validatePassword('password');
      expect(result.feedback).toContain('Password must contain at least one uppercase letter');
      expect(result.feedback).toContain('Password must contain at least one number');
    });

    it('should handle custom options', () => {
      const result = validatePassword('simple', {
        minLength: 4,
        requireUppercase: false,
        requireNumbers: false,
        requireSpecialChars: false
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateIPv4', () => {
    it('should validate correct IPv4 addresses', () => {
      const validIPs = [
        '192.168.1.1',
        '10.0.0.1',
        '255.255.255.255',
        '0.0.0.0'
      ];

      validIPs.forEach(ip => {
        expect(validateIPv4(ip)).toBe(true);
      });
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIPs = [
        '256.1.1.1', // Out of range
        '192.168.1', // Missing octet
        '192.168.1.1.1', // Extra octet
        'not.an.ip.address',
        '',
        123 as any
      ];

      invalidIPs.forEach(ip => {
        expect(validateIPv4(ip)).toBe(false);
      });
    });
  });

  describe('validateIPv6', () => {
    it('should validate correct IPv6 addresses', () => {
      const validIPs = [
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '::1', // Loopback
        '::'  // All zeros
      ];

      validIPs.forEach(ip => {
        expect(validateIPv6(ip)).toBe(true);
      });
    });

    it('should reject invalid IPv6 addresses', () => {
      const invalidIPs = [
        '192.168.1.1', // IPv4
        'not:an:ipv6:address',
        '',
        123 as any
      ];

      invalidIPs.forEach(ip => {
        expect(validateIPv6(ip)).toBe(false);
      });
    });
  });

  describe('validateMacAddress', () => {
    it('should validate correct MAC addresses', () => {
      const validMACs = [
        '00:1B:44:11:3A:B7',
        '00-1B-44-11-3A-B7',
        'AA:BB:CC:DD:EE:FF'
      ];

      validMACs.forEach(mac => {
        expect(validateMacAddress(mac)).toBe(true);
      });
    });

    it('should reject invalid MAC addresses', () => {
      const invalidMACs = [
        '00:1B:44:11:3A', // Too short
        '00:1B:44:11:3A:B7:FF', // Too long
        'GG:HH:II:JJ:KK:LL', // Invalid characters
        '',
        123 as any
      ];

      invalidMACs.forEach(mac => {
        expect(validateMacAddress(mac)).toBe(false);
      });
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];

      validUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        'not-a-uuid',
        '',
        123 as any
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validateUUID(uuid)).toBe(false);
      });
    });
  });

  describe('validateHexColor', () => {
    it('should validate correct hex colors', () => {
      const validColors = [
        '#FF0000',
        '#00ff00',
        '#0000FF',
        '#fff',
        '#ABC'
      ];

      validColors.forEach(color => {
        expect(validateHexColor(color)).toBe(true);
      });
    });

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000', // Missing #
        '#GG0000', // Invalid character
        '#FF00', // Wrong length
        '',
        123 as any
      ];

      invalidColors.forEach(color => {
        expect(validateHexColor(color)).toBe(false);
      });
    });
  });

  describe('validateJSON', () => {
    it('should validate correct JSON', () => {
      const validJSON = [
        '{}',
        '[]',
        '{"name": "test"}',
        '"string"',
        '123',
        'true'
      ];

      validJSON.forEach(json => {
        expect(validateJSON(json)).toBe(true);
      });
    });

    it('should reject invalid JSON', () => {
      const invalidJSON = [
        '{name: "test"}', // Missing quotes
        'undefined',
        '',
        123 as any
      ];

      invalidJSON.forEach(json => {
        expect(validateJSON(json)).toBe(false);
      });
    });
  });

  describe('validateBase64', () => {
    it('should validate correct base64', () => {
      const validBase64 = [
        'SGVsbG8gV29ybGQ=',
        'dGVzdA==',
        'YWJjZA=='
      ];

      validBase64.forEach(b64 => {
        expect(validateBase64(b64)).toBe(true);
      });
    });

    it('should reject invalid base64', () => {
      const invalidBase64 = [
        'Invalid!@#',
        'SGVsbG8', // Missing padding
        '',
        123 as any
      ];

      invalidBase64.forEach(b64 => {
        expect(validateBase64(b64)).toBe(false);
      });
    });
  });

  describe('validateSlug', () => {
    it('should validate correct slugs', () => {
      const validSlugs = [
        'hello-world',
        'test-slug-123',
        'simple'
      ];

      validSlugs.forEach(slug => {
        expect(validateSlug(slug)).toBe(true);
      });
    });

    it('should reject invalid slugs', () => {
      const invalidSlugs = [
        'Hello World', // Spaces and uppercase
        'test_slug', // Underscore
        'test--slug', // Double dash
        '',
        123 as any
      ];

      invalidSlugs.forEach(slug => {
        expect(validateSlug(slug)).toBe(false);
      });
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      const validUsernames = [
        'john_doe',
        'user123',
        'testUser'
      ];

      validUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(true);
      });
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab', // Too short
        'a'.repeat(25), // Too long
        'user@name', // Invalid character
        '',
        123 as any
      ];

      invalidUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(false);
      });
    });

    it('should respect custom options', () => {
      expect(validateUsername('user-name', { allowDash: true })).toBe(true);
      expect(validateUsername('user-name', { allowDash: false })).toBe(false);
    });
  });

  describe('validateRange', () => {
    it('should validate numbers within range', () => {
      expect(validateRange(5, 1, 10)).toBe(true);
      expect(validateRange(1, 1, 10)).toBe(true);
      expect(validateRange(10, 1, 10)).toBe(true);
    });

    it('should reject numbers outside range', () => {
      expect(validateRange(0, 1, 10)).toBe(false);
      expect(validateRange(11, 1, 10)).toBe(false);
      expect(validateRange(NaN, 1, 10)).toBe(false);
      expect(validateRange('5' as any, 1, 10)).toBe(false);
    });
  });

  describe('validateLength', () => {
    it('should validate strings within length bounds', () => {
      expect(validateLength('hello', 3, 10)).toBe(true);
      expect(validateLength('hi', 2, 5)).toBe(true);
    });

    it('should reject strings outside length bounds', () => {
      expect(validateLength('hi', 3, 10)).toBe(false);
      expect(validateLength('very long string', 3, 10)).toBe(false);
      expect(validateLength(123 as any, 3, 10)).toBe(false);
    });
  });

  describe('validateArrayLength', () => {
    it('should validate arrays within length bounds', () => {
      expect(validateArrayLength([1, 2, 3], 2, 5)).toBe(true);
      expect(validateArrayLength([], 0, 5)).toBe(true);
    });

    it('should reject arrays outside length bounds', () => {
      expect(validateArrayLength([1], 2, 5)).toBe(false);
      expect(validateArrayLength([1, 2, 3, 4, 5, 6], 2, 5)).toBe(false);
      expect(validateArrayLength('not array' as any, 2, 5)).toBe(false);
    });
  });

  describe('validateEnum', () => {
    it('should validate values in enum', () => {
      expect(validateEnum('red', ['red', 'green', 'blue'])).toBe(true);
      expect(validateEnum(1, [1, 2, 3])).toBe(true);
    });

    it('should reject values not in enum', () => {
      expect(validateEnum('yellow', ['red', 'green', 'blue'])).toBe(false);
      expect(validateEnum(4, [1, 2, 3])).toBe(false);
    });
  });

  describe('validateField', () => {
    it('should validate required fields', () => {
      const result = validateField('test', { required: true });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty required fields', () => {
      const result = validateField('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field is required');
    });

    it('should validate field types', () => {
      expect(validateField('test', { type: 'string' }).isValid).toBe(true);
      expect(validateField(123, { type: 'number' }).isValid).toBe(true);
      expect(validateField(true, { type: 'boolean' }).isValid).toBe(true);
      expect(validateField('test@example.com', { type: 'email' }).isValid).toBe(true);
    });

    it('should validate string length', () => {
      const result = validateField('hi', { type: 'string', minLength: 3 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at least 3 characters long');
    });

    it('should validate number range', () => {
      const result = validateField(5, { type: 'number', min: 10 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at least 10');
    });

    it('should validate patterns', () => {
      const result = validateField('abc', { pattern: '^[0-9]+$' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value does not match required pattern');
    });

    it('should validate enums', () => {
      const result = validateField('yellow', { enum: ['red', 'green', 'blue'] });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be one of: red, green, blue');
    });

    it('should use custom validation', () => {
      const customValidator = (value: any) => value === 'special';
      const result = validateField('normal', { custom: customValidator });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value failed custom validation');
    });

    it('should skip validation for empty non-required fields', () => {
      const result = validateField('', { type: 'email', required: false });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Integration tests', () => {
    it('should work together for comprehensive validation', () => {
      // Test email validation with field validator
      const emailResult = validateField('test@example.com', {
        required: true,
        type: 'email',
        maxLength: 50
      });
      expect(emailResult.isValid).toBe(true);

      // Test password validation
      const passwordResult = validatePassword('StrongP@ss123');
      expect(passwordResult.isValid).toBe(true);
      expect(passwordResult.score).toBeGreaterThan(3);

      // Test URL validation
      expect(validateUrl('https://example.com')).toBe(true);

      // Test pattern validation
      expect(validatePattern('ABC123', '^[A-Z]{3}[0-9]{3}$')).toBe(true);
    });
  });
});