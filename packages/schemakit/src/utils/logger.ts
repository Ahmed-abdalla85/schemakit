/**
 * Centralized Logging System for SchemaKit
 * Provides consistent logging with levels and conditional output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
  module?: string;
}

export class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  private static isTest = process.env.NODE_ENV === 'test';
  private static logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  /**
   * Debug logging - only in development
   */
  static debug(message: string, data?: any, module?: string): void {
    if (this.isDevelopment && this.shouldLog('debug')) {
      this.log('debug', message, data, module);
    }
  }

  /**
   * Info logging - general information
   */
  static info(message: string, data?: any, module?: string): void {
    if (this.shouldLog('info')) {
      this.log('info', message, data, module);
    }
  }

  /**
   * Warning logging - potential issues
   */
  static warn(message: string, data?: any, module?: string): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, data, module);
    }
  }

  /**
   * Error logging - errors and exceptions
   */
  static error(message: string, error?: any, module?: string): void {
    if (this.shouldLog('error')) {
      this.log('error', message, error, module);
    }
  }

  /**
   * Database operation logging
   */
  static database(operation: string, sql: string, params?: any[], adapter?: string): void {
    this.debug(
      `Database ${operation}`,
      { sql, params, adapter },
      'database'
    );
  }

  /**
   * Workflow action logging
   */
  static workflow(action: string, data?: any): void {
    this.debug(
      `Workflow action: ${action}`,
      data,
      'workflow'
    );
  }

  /**
   * Performance timing logging
   */
  static timing(operation: string, startTime: number, data?: any): void {
    const duration = Date.now() - startTime;
    this.debug(
      `${operation} completed in ${duration}ms`,
      { duration, ...data },
      'performance'
    );
  }

  /**
   * Check if logging level should be output
   */
  private static shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false; // Suppress logs in tests
    
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Internal logging method
   */
  private static log(level: LogLevel, message: string, data?: any, module?: string): void {
    const timestamp = new Date().toISOString();
    const prefix = module ? `[${module.toUpperCase()}]` : '';
    const levelPrefix = `[${level.toUpperCase()}]`;
    
    const fullMessage = `${levelPrefix} ${prefix} ${message}`;
    
    switch (level) {
      case 'debug':
      case 'info':
        if (data !== undefined) {
          console.log(fullMessage, data);
        } else {
          console.log(fullMessage);
        }
        break;
      case 'warn':
        if (data !== undefined) {
          console.warn(fullMessage, data);
        } else {
          console.warn(fullMessage);
        }
        break;
      case 'error':
        if (data !== undefined) {
          console.error(fullMessage, data);
        } else {
          console.error(fullMessage);
        }
        break;
    }
  }

  /**
   * Set log level dynamically
   */
  static setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  static getLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Create a module-specific logger
   */
  static module(moduleName: string) {
    return {
      debug: (message: string, data?: any) => Logger.debug(message, data, moduleName),
      info: (message: string, data?: any) => Logger.info(message, data, moduleName),
      warn: (message: string, data?: any) => Logger.warn(message, data, moduleName),
      error: (message: string, error?: any) => Logger.error(message, error, moduleName),
    };
  }
}