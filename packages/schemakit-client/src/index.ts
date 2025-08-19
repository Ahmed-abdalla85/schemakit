import type { SchemaKitClient, SchemaKitClientOptions } from './types';
import { ClientImpl } from './client';

export type {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
  ListQueryParams,
  SchemaKitClientOptions,
  SchemaKitClient,
} from './types';

export { SchemaKitError } from './errors';

export function createSchemaKitClient(options: SchemaKitClientOptions = {}): SchemaKitClient {
  return new ClientImpl(options);
}
