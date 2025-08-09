/**
 * Shared generators for OpenAPI specs and route definitions
 * 
 * These provide framework-agnostic generation of API documentation
 * and route metadata that can be adapted to any framework.
 */

import type { RouteMetadata } from './types';

/**
 * OpenAPI specification generator
 */
export class OpenAPIGenerator {
  /**
   * Generate OpenAPI specification for SchemaKit entities
   */
  static generateSpec(options?: {
    title?: string;
    version?: string;
    description?: string;
    entities?: string[];
  }): any {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: options?.title || 'SchemaKit API',
        version: options?.version || '1.0.0',
        description: options?.description || 'Auto-generated REST API for SchemaKit entities',
      },
      paths: {} as any,
      components: {
        schemas: {
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              error: { type: 'string' },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
            required: ['success', 'timestamp'],
          },
          PaginatedResponse: {
            allOf: [
              { $ref: '#/components/schemas/ApiResponse' },
              {
                type: 'object',
                properties: {
                  meta: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                      hasNext: { type: 'boolean' },
                      hasPrev: { type: 'boolean' },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };

    // Generate paths for entities
    if (options?.entities) {
      for (const entityName of options.entities) {
        this.addEntityPaths(spec, entityName);
      }
    }

    return spec;
  }

  /**
   * Add entity CRUD paths to OpenAPI spec
   */
  private static addEntityPaths(spec: any, entityName: string): void {
    const basePath = `/entity/${entityName}`;

    // List entities
    spec.paths[basePath] = {
      get: {
        tags: ['Entities'],
        summary: `List ${entityName} records`,
        description: `Get a paginated list of ${entityName} records`,
        parameters: [
          { name: 'x-tenant-id', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant ID' },
          { name: 'x-tenant-key', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant access key' },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
            description: 'Items per page',
          },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string' },
            description: 'Field to sort by',
          },
          {
            name: 'order',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'] },
            description: 'Sort order',
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Entities'],
        summary: `Create ${entityName} record`,
        description: `Create a new ${entityName} record`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Record created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    };

    // Single record operations
    spec.paths[`${basePath}/{id}`] = {
      get: {
        tags: ['Entities'],
        summary: `Get ${entityName} record by ID`,
        parameters: [
          { name: 'x-tenant-id', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant ID' },
          { name: 'x-tenant-key', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant access key' },
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Record retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Entities'],
        summary: `Update ${entityName} record`,
        parameters: [
          { name: 'x-tenant-id', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant ID' },
          { name: 'x-tenant-key', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant access key' },
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Record updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Entities'],
        summary: `Delete ${entityName} record`,
        parameters: [
          { name: 'x-tenant-id', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant ID' },
          { name: 'x-tenant-key', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant access key' },
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Record deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    };

    // Views endpoint
    spec.paths[`${basePath}/views/{viewName}`] = {
      get: {
        tags: ['Views'],
        summary: `Execute view for ${entityName}`,
        parameters: [
          { name: 'x-tenant-id', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant ID' },
          { name: 'x-tenant-key', in: 'header', schema: { type: 'string' }, required: false, description: 'Tenant access key' },
          { name: 'viewName', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'stats', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': {
            description: 'View executed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    };
  }
}

/**
 * Route metadata generator
 */
export class RouteGenerator {
  /**
   * Generate route metadata for an entity
   */
  static generateEntityRoutes(entityName: string, basePath = '/api'): RouteMetadata[] {
    return [
      {
        entityName,
        operation: 'read',
        method: 'GET',
        path: `${basePath}/entity/${entityName}`,
        description: `List ${entityName} records`,
        tags: ['Entities'],
      },
      {
        entityName,
        operation: 'create',
        method: 'POST',
        path: `${basePath}/entity/${entityName}`,
        description: `Create ${entityName} record`,
        tags: ['Entities'],
      },
      {
        entityName,
        operation: 'read',
        method: 'GET',
        path: `${basePath}/entity/${entityName}/:id`,
        description: `Get ${entityName} record by ID`,
        tags: ['Entities'],
      },
      {
        entityName,
        operation: 'update',
        method: 'PUT',
        path: `${basePath}/entity/${entityName}/:id`,
        description: `Update ${entityName} record`,
        tags: ['Entities'],
      },
      {
        entityName,
        operation: 'delete',
        method: 'DELETE',
        path: `${basePath}/entity/${entityName}/:id`,
        description: `Delete ${entityName} record`,
        tags: ['Entities'],
      },
    ];
  }

  /**
   * Generate all routes for multiple entities
   */
  static generateAllRoutes(entities: string[], basePath = '/api'): RouteMetadata[] {
    const routes: RouteMetadata[] = [];
    
    for (const entity of entities) {
      routes.push(...this.generateEntityRoutes(entity, basePath));
    }
    
    return routes;
  }
}