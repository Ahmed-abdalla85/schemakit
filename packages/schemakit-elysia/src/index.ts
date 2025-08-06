/**
 * @mobtakronio/schemakit-elysia
 * 
 * Elysia adapter for SchemaKit with auto-generated REST endpoints
 * 
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { SchemaKit } from '@mobtakronio/schemakit';
 * import { schemaKitElysia } from '@mobtakronio/schemakit-elysia';
 * 
 * const app = new Elysia();
 * const kit = new SchemaKit();
 * 
 * app.use(schemaKitElysia(kit, {
 *   basePath: '/api',
 *   enableDocs: true,
 *   docsPath: '/docs'
 * }));
 * 
 * app.listen(3000);
 * ```
 */

// Main plugin export
export { schemaKitElysia } from './plugin';

// Type exports
export type {
  SchemaKitElysiaOptions,
  CrudOperation,
  RouteMetadata,
  ApiResponse,
  PaginationMeta,
  PaginatedResponse,
  ListQueryParams,
} from './types';

// Utility exports
export {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  parseListQuery,
  extractContext,
  shouldIncludeEntity,
  sanitizeEntityName,
  handleAsync,
} from './utils';

// Default export for convenience
export { schemaKitElysia as default } from './plugin';