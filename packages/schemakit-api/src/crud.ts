/**
 * Shared CRUD operations for SchemaKit entities
 * 
 * These operations provide framework-agnostic business logic that can be
 * reused across all framework adapters (Elysia, Express, Fastify, etc.)
 */

// Note: This would normally import from '@mobtakronio/schemakit' but for build purposes we'll use relative import
import { ResponseHelpers, QueryHelpers, sanitizePayloadKeys } from './helpers';
import type { ApiResponse, PaginatedResponse } from './types';

// Placeholder types for SchemaKit (in real implementation these would be imported)
type SchemaKit = any;
type Entity = any;
type Context = any;

export class CrudOperations {
  /**
   * Create a new record
   */
  static async createRecord(
    entity: Entity,
    data: Record<string, any>,
    context: Context
  ): Promise<ApiResponse> {
    try {
      const record = await entity.insert(sanitizePayloadKeys(data), context);
      return ResponseHelpers.success(record, 'Record created successfully');
    } catch (error) {
      return ResponseHelpers.error(error as Error, 'Failed to create record');
    }
  }

  /**
   * List records with pagination and filtering
   */
  static async listRecords(
    entity: Entity,
    query: Record<string, any>,
    context: Context
  ): Promise<PaginatedResponse> {
    try {
      const { pagination, filters } = QueryHelpers.parseListQuery(query);
      
      // Get records with filters
      const records = await entity.get(filters, context);
      
      // Apply pagination (client-side for now - could be optimized for server-side)
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      const paginatedRecords = records.slice(start, end);

      return ResponseHelpers.paginated(
        paginatedRecords,
        pagination.page,
        pagination.limit,
        records.length,
        `Retrieved ${paginatedRecords.length} records`
      ) as PaginatedResponse;
    } catch (error) {
      return ResponseHelpers.error(error as Error, 'Failed to list records') as any;
    }
  }

  /**
   * Get a single record by ID
   */
  static async getRecord(
    entity: Entity,
    id: string | number,
    context: Context
  ): Promise<ApiResponse> {
    try {
      const record = await entity.getById(id, context);
      if (!record) {
        return ResponseHelpers.error(`Record with ID ${id} not found`, 'Record not found');
      }
      return ResponseHelpers.success(record, 'Record retrieved successfully');
    } catch (error) {
      return ResponseHelpers.error(error as Error, 'Failed to get record');
    }
  }

  /**
   * Update a record
   */
  static async updateRecord(
    entity: Entity,
    id: string | number,
    data: Record<string, any>,
    context: Context
  ): Promise<ApiResponse> {
    try {
      const record = await entity.update(id, sanitizePayloadKeys(data), context);
      return ResponseHelpers.success(record, 'Record updated successfully');
    } catch (error) {
      return ResponseHelpers.error(error as Error, 'Failed to update record');
    }
  }

  /**
   * Delete a record
   */
  static async deleteRecord(
    entity: Entity,
    id: string | number,
    context: Context
  ): Promise<ApiResponse> {
    try {
      const deleted = await entity.delete(id, context);
      if (!deleted) {
        return ResponseHelpers.error(`Failed to delete record with ID ${id}`, 'Delete failed');
      }
      return ResponseHelpers.success(
        { id, deleted: true },
        'Record deleted successfully'
      );
    } catch (error) {
      return ResponseHelpers.error(error as Error, 'Failed to delete record');
    }
  }

  /**
   * Get entity by name (helper for frameworks)
   */
  static async getEntity(
    schemaKit: SchemaKit,
    entityName: string,
    tenantId: string
  ): Promise<Entity> {
    return await schemaKit.entity(entityName, tenantId);
  }
}