/**
 * Unit tests for date helper utilities
 */
import {
  getCurrentTimestamp,
  parseDate,
  formatDate,
  isValidDate,
  getStartOfDay,
  getEndOfDay,
  addDays,
  addHours,
  addMinutes,
  getDaysDifference,
  getHoursDifference,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  toUTC,
  fromUTC,
  getAge,
  parseValue
} from '../../../src/utils/date-helpers';

describe('Date Helper Utilities', () => {
  describe('getCurrentTimestamp', () => {
    it('should return current timestamp in ISO format', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return different timestamps when called at different times', async () => {
      const timestamp1 = getCurrentTimestamp();
      await new Promise(resolve => setTimeout(resolve, 10));
      const timestamp2 = getCurrentTimestamp();
      expect(timestamp1).not.toBe(timestamp2);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date strings', () => {
      const testCases = [
        '2023-01-15T10:30:00.000Z',
        '2023-01-15',
        '2023/01/15',
        'January 15, 2023',
        '15 Jan 2023'
      ];

      testCases.forEach(dateStr => {
        const result = parseDate(dateStr);
        expect(result).toBeInstanceOf(Date);
        expect(result).not.toBeNull();
      });
    });

    it('should handle Date objects', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const result = parseDate(date);
      expect(result).toBe(date);
    });

    it('should handle numbers (timestamps)', () => {
      const timestamp = Date.now();
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(timestamp);
    });

    it('should handle special SQL functions', () => {
      const result = parseDate("datetime('now')");
      expect(result).toBeInstanceOf(Date);
      expect(Math.abs(result!.getTime() - Date.now())).toBeLessThan(1000);
    });

    it('should return null for invalid inputs', () => {
      const invalidInputs = [
        null,
        undefined,
        'invalid date',
        'not a date',
        {},
        [],
        new Date('invalid')
      ];

      invalidInputs.forEach(input => {
        const result = parseDate(input);
        expect(result).toBeNull();
      });
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2023-01-15T10:30:45.123Z');

    it('should format date in ISO format by default', () => {
      const result = formatDate(testDate);
      expect(result).toBe('2023-01-15T10:30:45.123Z');
    });

    it('should format date only', () => {
      const result = formatDate(testDate, 'date');
      expect(result).toBe('2023-01-15');
    });

    it('should format time only', () => {
      const result = formatDate(testDate, 'time');
      expect(result).toBe('10:30:45');
    });

    it('should format datetime', () => {
      const result = formatDate(testDate, 'datetime');
      expect(result).toBe('2023-01-15 10:30:45');
    });

    it('should format timestamp', () => {
      const result = formatDate(testDate, 'timestamp');
      expect(result).toBe(testDate.getTime().toString());
    });

    it('should handle custom formats', () => {
      const result = formatDate(testDate, 'YYYY-MM-DD HH:mm:ss');
      expect(result).toBe('2023-01-15 10:30:45');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDate(new Date('invalid'))).toThrow('Invalid date provided');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      const validDates = [
        new Date(),
        '2023-01-15',
        '2023-01-15T10:30:00.000Z',
        Date.now(),
        "datetime('now')"
      ];

      validDates.forEach(date => {
        expect(isValidDate(date)).toBe(true);
      });
    });

    it('should return false for invalid dates', () => {
      const invalidDates = [
        null,
        undefined,
        'invalid date',
        {},
        [],
        new Date('invalid')
      ];

      invalidDates.forEach(date => {
        expect(isValidDate(date)).toBe(false);
      });
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const date = new Date('2023-01-15T10:30:45.123Z');
      const result = getStartOfDay(date);
      
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(result.getDate()).toBe(date.getDate());
    });

    it('should not modify original date', () => {
      const originalDate = new Date('2023-01-15T10:30:45.123Z');
      const originalTime = originalDate.getTime();
      getStartOfDay(originalDate);
      expect(originalDate.getTime()).toBe(originalTime);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const date = new Date('2023-01-15T10:30:45.123Z');
      const result = getEndOfDay(date);
      
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
      expect(result.getDate()).toBe(date.getDate());
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('should subtract negative days', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });

    it('should handle month boundaries', () => {
      const date = new Date('2023-01-30T10:30:00.000Z');
      const result = addDays(date, 5);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });
  });

  describe('addHours', () => {
    it('should add positive hours', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const result = addHours(date, 5);
      expect(result.getUTCHours()).toBe(15);
    });

    it('should subtract negative hours', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const result = addHours(date, -5);
      expect(result.getUTCHours()).toBe(5);
    });

    it('should handle day boundaries', () => {
      const date = new Date('2023-01-15T22:30:00.000Z');
      const result = addHours(date, 5);
      expect(result.getUTCDate()).toBe(16);
      expect(result.getUTCHours()).toBe(3);
    });
  });

  describe('addMinutes', () => {
    it('should add positive minutes', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const result = addMinutes(date, 30);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCHours()).toBe(11);
    });

    it('should subtract negative minutes', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const result = addMinutes(date, -30);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCHours()).toBe(10);
    });
  });

  describe('getDaysDifference', () => {
    it('should calculate positive difference', () => {
      const date1 = new Date('2023-01-15');
      const date2 = new Date('2023-01-20');
      const result = getDaysDifference(date1, date2);
      expect(result).toBe(5);
    });

    it('should calculate negative difference', () => {
      const date1 = new Date('2023-01-20');
      const date2 = new Date('2023-01-15');
      const result = getDaysDifference(date1, date2);
      expect(result).toBe(-5);
    });

    it('should return 0 for same day', () => {
      const date1 = new Date('2023-01-15T10:00:00.000Z');
      const date2 = new Date('2023-01-15T20:00:00.000Z');
      const result = getDaysDifference(date1, date2);
      expect(result).toBe(0);
    });
  });

  describe('getHoursDifference', () => {
    it('should calculate hour difference', () => {
      const date1 = new Date('2023-01-15T10:00:00.000Z');
      const date2 = new Date('2023-01-15T15:00:00.000Z');
      const result = getHoursDifference(date1, date2);
      expect(result).toBe(5);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2023-01-15T10:00:00.000Z');
      const date2 = new Date('2023-01-15T20:00:00.000Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2023-01-15T10:00:00.000Z');
      const date2 = new Date('2023-01-16T10:00:00.000Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = addDays(new Date(), -1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const pastDate = addDays(new Date(), -1);
      expect(isPast(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = addDays(new Date(), 1);
      expect(isPast(futureDate)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = addDays(new Date(), 1);
      expect(isFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = addDays(new Date(), -1);
      expect(isFuture(pastDate)).toBe(false);
    });
  });

  describe('getAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-15');
      const referenceDate = new Date('2023-01-15');
      const age = getAge(birthDate, referenceDate);
      expect(age).toBe(33);
    });

    it('should handle birthday not yet reached this year', () => {
      const birthDate = new Date('1990-06-15');
      const referenceDate = new Date('2023-01-15');
      const age = getAge(birthDate, referenceDate);
      expect(age).toBe(32);
    });

    it('should use current date as default reference', () => {
      const birthDate = new Date('2000-01-01');
      const age = getAge(birthDate);
      expect(age).toBeGreaterThanOrEqual(23);
    });
  });

  describe('parseValue', () => {
    it('should parse quoted strings', () => {
      expect(parseValue("'hello'")).toBe('hello');
      expect(parseValue('"world"')).toBe('world');
    });

    it('should parse numbers', () => {
      expect(parseValue('123')).toBe(123);
      expect(parseValue('123.45')).toBe(123.45);
    });

    it('should parse booleans', () => {
      expect(parseValue('true')).toBe(true);
      expect(parseValue('false')).toBe(false);
      expect(parseValue('1')).toBe(true);
      expect(parseValue('0')).toBe(false);
    });

    it('should handle SQL datetime function', () => {
      const result = parseValue("datetime('now')");
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should parse date strings', () => {
      const result = parseValue('2023-01-15T10:30:00.000Z');
      expect(result).toBe('2023-01-15T10:30:00.000Z');
    });

    it('should return original value for unparseable strings', () => {
      expect(parseValue('hello world')).toBe('hello world');
      expect(parseValue('not a number')).toBe('not a number');
    });
  });

  describe('Integration tests', () => {
    it('should work together for date operations', () => {
      const now = getCurrentTimestamp();
      const parsedDate = parseDate(now);
      expect(parsedDate).not.toBeNull();
      
      const formatted = formatDate(parsedDate!, 'date');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      const startOfDay = getStartOfDay(parsedDate!);
      const endOfDay = getEndOfDay(parsedDate!);
      expect(isSameDay(startOfDay, endOfDay)).toBe(true);
      
      const tomorrow = addDays(parsedDate!, 1);
      expect(getDaysDifference(parsedDate!, tomorrow)).toBe(1);
    });
  });
});