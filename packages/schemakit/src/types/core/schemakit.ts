/**
 * Core SchemaKit configuration and context types
 * 
 * These types define how SchemaKit is configured and how execution context
 * is passed throughout the system for permissions and multi-tenancy.
 * 
 * @since 0.1.0
 */

/**
 * Configuration options for initializing SchemaKit
 * 
 * @example
 * ```typescript
 * const schemaKit = new SchemaKit({
 *   adapter: {
 *     type: 'postgres',
 *     config: {
 *       connectionString: process.env.DATABASE_URL
 *     }
 *   },
 *   cache: {
 *     enabled: true,
 *     ttl: 300 // 5 minutes
 *   }
 * });
 * ```
 * 
 * @since 0.1.0
 */
export interface SchemaKitOptions {
  /** Database adapter configuration */
  adapter?: {
    /** Adapter type: 'postgres', 'sqlite' */
    type?: string;
    /** Adapter-specific configuration options */
    config?: Record<string, any>;
  };
  /** Entity caching configuration */
  cache?: {
    /** Whether to enable entity definition caching */
    enabled?: boolean;
    /** Cache time-to-live in seconds */
    ttl?: number;
  };
}

/**
 * Execution context for operations, permissions, and multi-tenancy
 * 
 * Context flows through all SchemaKit operations to provide user information,
 * tenant isolation, and request metadata for permissions and auditing.
 * 
 * @example
 * ```typescript
 * const context: Context = {
 *   user: {
 *     id: 'user-123',
 *     roles: ['manager', 'user'],
 *     department: 'sales'
 *   },
 *   tenantId: 'company-abc',
 *   request: {
 *     ip: '192.168.1.1',
 *     userAgent: 'Mozilla/5.0...'
 *   }
 * };
 * 
 * // Context is used throughout operations
 * await entity.create(data, context);
 * await entity.view('sales-report', {}, context);
 * ```
 * 
 * @since 0.1.0
 */
export interface Context {
  /** Current user information for permissions and RLS */
  user?: {
    /** Unique user identifier */
    id?: string;
    /** User roles for permission checking */
    roles?: string[];
    /** Direct permissions granted to user */
    permissions?: string[];
    /** Additional user properties (department, etc.) */
    [key: string]: any;
  };
  /** Tenant ID for multi-tenant data isolation */
  tenantId?: string;
  /** HTTP request information for auditing */
  request?: {
    /** Client IP address */
    ip?: string;
    /** Client user agent string */
    userAgent?: string;
    /** Request timestamp */
    timestamp?: string;
    /** Additional request metadata */
    [key: string]: any;
  };
  /** User session information */
  session?: {
    /** Session identifier */
    id?: string;
    /** Session expiration time */
    expires?: string;
    /** Additional session data */
    [key: string]: any;
  };
  /** Additional context properties */
  [key: string]: any;
}