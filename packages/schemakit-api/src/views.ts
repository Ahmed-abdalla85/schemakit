/**
 * Views operations for SchemaKit entities
 */

import { ResponseHelpers, QueryHelpers, ContextHelpers } from './helpers';
import type { ApiResponse, GenericRequest } from './types';

// Placeholder types for SchemaKit (in real implementation import from core)
type SchemaKit = any;
type Entity = any;
type Context = any;

export class ViewsOperations {
  /**
   * Execute a named view for an entity
   */
  static async executeView(
    schemaKit: SchemaKit,
    entityName: string,
    tenantId: string,
    viewName: string,
    request: GenericRequest,
    contextProvider?: (request: GenericRequest) => Context | Promise<Context>
  ): Promise<ApiResponse> {
    try {
      const entity: Entity = await schemaKit.entity(entityName, tenantId);

      const { pagination, filters } = QueryHelpers.parseListQuery(request.query || {});
      const stats = String(request.query?.stats || '').toLowerCase() === 'true';

      const context = await ContextHelpers.extractContext(request, tenantId, contextProvider);

      const viewResult = await entity.view(
        viewName,
        {
          filters,
          pagination,
          stats,
        },
        context
      );

      return ResponseHelpers.success(viewResult, 'View executed successfully');
    } catch (error) {
      return ResponseHelpers.error(error as Error, 'Failed to execute view');
    }
  }
}


