import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import type { SchemaKit, Entity, Context } from '@mobtakronio/schemakit';
import type { SchemaKitElysiaOptions, RouteMetadata } from './types';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  parseListQuery,
  extractContext,
  shouldIncludeEntity,
  sanitizeEntityName,
  handleAsync,
} from './utils';

/**
 * SchemaKit Elysia Plugin
 * 
 * Auto-generates REST endpoints for all SchemaKit entities with:
 * - CRUD operations
 * - Permission handling
 * - Validation
 * - Workflow execution
 * - OpenAPI/Swagger documentation
 */
export function schemaKitElysia(
  schemaKit: SchemaKit,
  options: SchemaKitElysiaOptions = {}
) {
  const config = {
    basePath: '/api',
    tenantId: 'default',
    enableDocs: true,
    docsPath: '/docs',
    enableCors: true,
    ...options,
  };

  const plugin = new Elysia({ name: 'schemakit' });

  // Add CORS if enabled
  if (config.enableCors) {
    plugin.use(
      new Elysia().all('*', ({ set }) => {
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-User-Id, X-User-Role';
      })
    );
  }

  // Add Swagger/OpenAPI documentation if enabled
  if (config.enableDocs) {
    plugin.use(
      swagger({
        path: config.docsPath,
        documentation: {
          info: {
            title: 'SchemaKit API',
            description: 'Auto-generated REST API for SchemaKit entities',
            version: '1.0.0',
          },
          tags: [
            {
              name: 'Entities',
              description: 'CRUD operations for dynamic entities',
            },
            {
              name: 'Views',
              description: 'View execution endpoints for dynamic entities',
            },
          ],
        },
      })
    );
  }

  // Error handler
  const handleError = (error: Error, entityName?: string, operation?: string) => {
    if (config.errorHandler) {
      return config.errorHandler(error, entityName, operation);
    }
    
    console.error(`SchemaKit Error [${entityName}:${operation}]:`, error);
    return createErrorResponse(error);
  };

  // Helper to get entity
  const getEntity = async (entityName: string): Promise<Entity> => {
    return await schemaKit.entity(entityName, config.tenantId);
  };

  // Helper to get context from request
  const getContext = async (request: Request): Promise<Context> => {
    const context = extractContext(request, config.tenantId, config.contextProvider);
    return context instanceof Promise ? await context : context;
  };

  // Register CRUD routes for entities
  plugin.group(config.basePath, (app) => {
    
    // List entities endpoint
    app.get('/entities', async () => {
      try {
        // This would require a method to list all entities in SchemaKit
        // For now, return a placeholder
        return createSuccessResponse([], 'Available entities');
      } catch (error) {
        return handleError(error as Error, 'system', 'list-entities');
      }
    }, {
      detail: {
        tags: ['Entities'],
        summary: 'List all available entities',
        description: 'Get a list of all entities registered in SchemaKit',
      },
    });

    // Dynamic entity routes
    app.group('/entity', (entityApp) => {
      
      // GET /entity/:entityName - List records
      entityApp.get('/:entityName', async ({ params, query, request }) => {
        const { entityName } = params;
        
        if (!shouldIncludeEntity(entityName, config)) {
          return createErrorResponse('Entity not accessible', 'Access denied');
        }

        const result = await handleAsync(async () => {
          const entity = await getEntity(entityName);
          const context = await getContext(request);
          const { pagination, filters } = parseListQuery(query);

          // Get records with filters
          const records = await entity.get(filters, context);
          
          // For now, we'll do client-side pagination
          // In a real implementation, you'd want server-side pagination
          const start = (pagination.page - 1) * pagination.limit;
          const end = start + pagination.limit;
          const paginatedRecords = records.slice(start, end);

          return createPaginatedResponse(
            paginatedRecords,
            pagination.page,
            pagination.limit,
            records.length,
            `Retrieved ${paginatedRecords.length} records`
          );
        }, entityName, 'list');

        if (!result.success) {
          return handleError(result.error, entityName, 'list');
        }

        return result.data;
      }, {
        detail: {
          tags: ['Entities'],
          summary: 'List entity records',
          description: 'Get a paginated list of entity records with optional filtering',
        },
        query: t.Object({
          page: t.Optional(t.Number({ minimum: 1 })),
          limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
          sort: t.Optional(t.String()),
          order: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
          search: t.Optional(t.String()),
        }),
      });

      // POST /entity/:entityName - Create record
      entityApp.post('/:entityName', async ({ params, body, request }) => {
        const { entityName } = params;
        
        if (!shouldIncludeEntity(entityName, config)) {
          return createErrorResponse('Entity not accessible', 'Access denied');
        }

        const result = await handleAsync(async () => {
          const entity = await getEntity(entityName);
          const context = await getContext(request);

          const record = await entity.insert(body as Record<string, any>, context);
          return createSuccessResponse(record, 'Record created successfully');
        }, entityName, 'create');

        if (!result.success) {
          return handleError(result.error, entityName, 'create');
        }

        return result.data;
      }, {
        detail: {
          tags: ['Entities'],
          summary: 'Create entity record',
          description: 'Create a new entity record',
        },
        body: t.Record(t.String(), t.Any()),
      });

      // GET /entity/:entityName/:id - Get single record
      entityApp.get('/:entityName/:id', async ({ params, request }) => {
        const { entityName, id } = params;
        
        if (!shouldIncludeEntity(entityName, config)) {
          return createErrorResponse('Entity not accessible', 'Access denied');
        }

        const result = await handleAsync(async () => {
          const entity = await getEntity(entityName);
          const context = await getContext(request);

          const record = await entity.getById(id, context);
          if (!record) {
            throw new Error(`Record with ID ${id} not found`);
          }

          return createSuccessResponse(record, 'Record retrieved');
        }, entityName, 'read');

        if (!result.success) {
          return handleError(result.error, entityName, 'read');
        }

        return result.data;
      }, {
        detail: {
          tags: ['Entities'],
          summary: 'Get entity record by ID',
          description: 'Retrieve a specific entity record by its ID',
        },
        params: t.Object({
          entityName: t.String(),
          id: t.Union([t.String(), t.Number()]),
        }),
      });

      // GET /entity/:entityName/views/:viewName - Execute a view
      entityApp.get('/:entityName/views/:viewName', async ({ params, query, request }) => {
        const { entityName, viewName } = params as any;

        if (!shouldIncludeEntity(entityName, config)) {
          return createErrorResponse('Entity not accessible', 'Access denied');
        }

        const result = await handleAsync(async () => {
          const entity = await getEntity(entityName);
          const context = await getContext(request);
          const { pagination, filters } = parseListQuery(query);
          const stats = String((query as any).stats || '').toLowerCase() === 'true';

          const viewResult = await entity.view(
            viewName,
            { filters, pagination, stats },
            context
          );

          return createSuccessResponse(viewResult, 'View executed successfully');
        }, entityName, 'view');

        if (!result.success) {
          return handleError(result.error, entityName, 'view');
        }

        return result.data;
      }, {
        detail: {
          tags: ['Views'],
          summary: 'Execute view',
          description: 'Execute a named view for the entity with optional pagination and filters',
        },
        params: t.Object({
          entityName: t.String(),
          viewName: t.String(),
        }),
        query: t.Object({
          page: t.Optional(t.Number({ minimum: 1 })),
          limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
          stats: t.Optional(t.Union([t.Literal('true'), t.Literal('false')])),
        }),
      });

      // PUT /entity/:entityName/:id - Update record
      entityApp.put('/:entityName/:id', async ({ params, body, request }) => {
        const { entityName, id } = params;
        
        if (!shouldIncludeEntity(entityName, config)) {
          return createErrorResponse('Entity not accessible', 'Access denied');
        }

        const result = await handleAsync(async () => {
          const entity = await getEntity(entityName);
          const context = await getContext(request);

          const record = await entity.update(id, body as Record<string, any>, context);
          return createSuccessResponse(record, 'Record updated successfully');
        }, entityName, 'update');

        if (!result.success) {
          return handleError(result.error, entityName, 'update');
        }

        return result.data;
      }, {
        detail: {
          tags: ['Entities'],
          summary: 'Update entity record',
          description: 'Update an existing entity record',
        },
        params: t.Object({
          entityName: t.String(),
          id: t.Union([t.String(), t.Number()]),
        }),
        body: t.Record(t.String(), t.Any()),
      });

      // DELETE /entity/:entityName/:id - Delete record
      entityApp.delete('/:entityName/:id', async ({ params, request }) => {
        const { entityName, id } = params;
        
        if (!shouldIncludeEntity(entityName, config)) {
          return createErrorResponse('Entity not accessible', 'Access denied');
        }

        const result = await handleAsync(async () => {
          const entity = await getEntity(entityName);
          const context = await getContext(request);

          const deleted = await entity.delete(id, context);
          if (!deleted) {
            throw new Error(`Failed to delete record with ID ${id}`);
          }

          return createSuccessResponse(
            { id, deleted: true },
            'Record deleted successfully'
          );
        }, entityName, 'delete');

        if (!result.success) {
          return handleError(result.error, entityName, 'delete');
        }

        return result.data;
      }, {
        detail: {
          tags: ['Entities'],
          summary: 'Delete entity record',
          description: 'Delete an entity record by its ID',
        },
        params: t.Object({
          entityName: t.String(),
          id: t.Union([t.String(), t.Number()]),
        }),
      });

      return entityApp;
    });

    return app;
  });

  return plugin;
}