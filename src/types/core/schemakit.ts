/**
 * Core SchemaKit configuration and context types
 */

export interface SchemaKitOptions {
  adapter?: {
    type?: string;
    config?: Record<string, any>;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
}

export interface Context {
  user?: {
    id?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: any;
  };
  tenantId?: string;
  request?: {
    ip?: string;
    userAgent?: string;
    timestamp?: string;
    [key: string]: any;
  };
  session?: {
    id?: string;
    expires?: string;
    [key: string]: any;
  };
  [key: string]: any;
}