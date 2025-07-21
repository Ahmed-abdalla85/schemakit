/**
 * Date and Time Utilities
 * Centralized date handling functions for SchemaKit
 */

/**
 * Get current timestamp in ISO string format
 * @returns Current timestamp as ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse a value to a Date object
 * Handles various input formats and returns null for invalid dates
 * @param value Value to parse (string, number, Date, or any)
 * @returns Date object or null if invalid
 */
export function parseDate(value: any): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    // Handle special SQL functions
    if (value.toLowerCase() === "datetime('now')") {
      return new Date();
    }

    // Try to parse the string
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Format a date according to a specified format
 * @param date Date to format
 * @param format Format string (default: 'iso')
 * @returns Formatted date string
 */
export function formatDate(date: Date, format = 'iso'): string {
  if (!date || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  switch (format.toLowerCase()) {
    case 'iso':
      return date.toISOString();
    case 'date':
      return date.toISOString().split('T')[0];
    case 'time':
      return date.toISOString().split('T')[1].split('.')[0];
    case 'datetime':
      return date.toISOString().replace('T', ' ').split('.')[0];
    case 'timestamp':
      return date.getTime().toString();
    case 'locale':
      return date.toLocaleString();
    case 'localedate':
      return date.toLocaleDateString();
    case 'localetime':
      return date.toLocaleTimeString();
    default:
      // For custom formats, use a simple replacement system
      return formatDateCustom(date, format);
  }
}

/**
 * Custom date formatting with placeholders
 * @param date Date to format
 * @param format Format string with placeholders
 * @returns Formatted date string
 */
function formatDateCustom(date: Date, format: string): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return format
    .replace(/YYYY/g, year.toString())
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
}

/**
 * Check if a value is a valid date
 * @param value Value to check
 * @returns True if value is a valid date
 */
export function isValidDate(value: any): boolean {
  return parseDate(value) !== null;
}

/**
 * Get the start of day for a given date
 * @param date Date to get start of day for
 * @returns New Date object set to start of day
 */
export function getStartOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Get the end of day for a given date
 * @param date Date to get end of day for
 * @returns New Date object set to end of day
 */
export function getEndOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

/**
 * Add days to a date
 * @param date Base date
 * @param days Number of days to add (can be negative)
 * @returns New Date object with days added
 */
export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

/**
 * Add hours to a date
 * @param date Base date
 * @param hours Number of hours to add (can be negative)
 * @returns New Date object with hours added
 */
export function addHours(date: Date, hours: number): Date {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

/**
 * Add minutes to a date
 * @param date Base date
 * @param minutes Number of minutes to add (can be negative)
 * @returns New Date object with minutes added
 */
export function addMinutes(date: Date, minutes: number): Date {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
}

/**
 * Get the difference between two dates in days
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of days between dates (positive if date2 is after date1)
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const timeDiff = date2.getTime() - date1.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Get the difference between two dates in hours
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of hours between dates (positive if date2 is after date1)
 */
export function getHoursDifference(date1: Date, date2: Date): number {
  const timeDiff = date2.getTime() - date1.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60));
}

/**
 * Check if two dates are on the same day
 * @param date1 First date
 * @param date2 Second date
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Check if a date is today
 * @param date Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is in the past
 * @param date Date to check
 * @returns True if date is in the past
 */
export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 * @param date Date to check
 * @returns True if date is in the future
 */
export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Convert a date to UTC
 * @param date Date to convert
 * @returns New Date object in UTC
 */
export function toUTC(date: Date): Date {
  return new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
}

/**
 * Convert a UTC date to local time
 * @param date UTC date to convert
 * @returns New Date object in local time
 */
export function fromUTC(date: Date): Date {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
}

/**
 * Get age in years from a birth date
 * @param birthDate Birth date
 * @param referenceDate Reference date (default: now)
 * @returns Age in years
 */
export function getAge(birthDate: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Parse a value from string to appropriate type, handling dates
 * @param value String value to parse
 * @returns Parsed value (Date for date strings, original for others)
 */
export function parseValue(value: string): any {
  // Remove quotes
  if ((value.startsWith("'") && value.endsWith("'")) || 
      (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  
  // Handle special SQL functions
  if (value.toLowerCase() === "datetime('now')") {
    return getCurrentTimestamp();
  }
  
  // Handle booleans first (before numbers)
  if (value === '1' || value.toLowerCase() === 'true') {
    return true;
  }
  
  if (value === '0' || value.toLowerCase() === 'false') {
    return false;
  }
  
  // Handle numbers
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  
  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  
  // Try to parse as date
  const parsedDate = parseDate(value);
  if (parsedDate) {
    return parsedDate.toISOString();
  }
  
  return value;
}