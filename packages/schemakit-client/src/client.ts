import { SchemaKitError } from './errors';
import { buildQueryString, fetchWithTimeout, joinUrl, mergeHeaders, withRetry } from './utils';
import { entityBasePath, entityByIdPath, entityListPath, entityViewPath } from './endpoints';
import type {
  ApiResponse,
  PaginatedResponse,
  SchemaKitClient,
  SchemaKitClientOptions,
  SchemaKitEntityApi,
  SchemaKitViewApi,
  RequestOptions,
} from './types';

export class ClientImpl implements SchemaKitClient {
  private options: SchemaKitClientOptions;

  constructor(options: SchemaKitClientOptions = {}) {
    this.options = { baseUrl: '/api', timeoutMs: 15000, ...options };
  }

  with(overrides: Partial<SchemaKitClientOptions>): SchemaKitClient {
    return new ClientImpl({ ...this.options, ...overrides });
  }

  async request<T = any>(options: RequestOptions): Promise<T> {
    const { method, path, query, body, signal, headers, timeoutMs } = options;
    const url = joinUrl(this.options.baseUrl || '/api', `${path}${buildQueryString(query)}`);

    const tenantId = this.options.getTenantId ? await this.options.getTenantId() : this.options.tenantId;
    const dynamicHeaders = typeof this.options.headers === 'function' ? await this.options.headers() : this.options.headers;
    const authHeaders = this.options.getAuthHeaders ? await this.options.getAuthHeaders() : undefined;
    const baseHeaders: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (tenantId) baseHeaders['x-tenant-id'] = tenantId;
    if (this.options.tenantKey) baseHeaders['x-tenant-key'] = this.options.tenantKey;

    const requestHeaders = mergeHeaders(baseHeaders, dynamicHeaders, authHeaders, headers);
    const init: RequestInit = {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    };

    if (this.options.interceptors?.onRequest) {
      await this.options.interceptors.onRequest({ ...(init as any), url });
    }

    const exec = async () => {
      const resp = await fetchWithTimeout(
        url,
        { ...(init as any), fetchImpl: this.options.fetch ?? fetch },
        timeoutMs ?? this.options.timeoutMs
      );
      if (this.options.interceptors?.onResponse) {
        await this.options.interceptors.onResponse(resp.clone());
      }
      if (!resp.ok) {
        throw await SchemaKitError.fromResponse(resp);
      }
      // Try JSON
      const data = await resp.json().catch(() => undefined);
      if (data && typeof data === 'object') {
        if (Object.prototype.hasOwnProperty.call(data, 'success')) {
          const api = data as ApiResponse | PaginatedResponse;
          if ((api as ApiResponse).success === false) {
            throw new SchemaKitError(api.message || (api as any).error || 'Operation failed', {
              status: resp.status,
              details: api,
              response: resp,
            });
          }
        }
      }
      return (data as T) ?? (undefined as unknown as T);
    };

    try {
      if (method === 'GET' && this.options.retry) {
        return await withRetry(exec, this.options.retry);
      }
      return await exec();
    } catch (error) {
      if (this.options.interceptors?.onError) {
        await this.options.interceptors.onError(error);
      }
      throw error;
    }
  }

  entity<T = any>(entityName: string): SchemaKitEntityApi<T> {
    return {
      list: async (params, opts) => {
        return await this.request<PaginatedResponse<T>>({
          method: 'GET',
          path: entityListPath(entityName),
          query: params,
          signal: opts?.signal,
        });
      },
      get: async (id, opts) => {
        return await this.request<ApiResponse<T>>({
          method: 'GET',
          path: entityByIdPath(entityName, id),
          signal: opts?.signal,
        });
      },
      create: async (data, opts) => {
        return await this.request<ApiResponse<T>>({
          method: 'POST',
          path: entityBasePath(entityName),
          body: data,
          signal: opts?.signal,
        });
      },
      update: async (id, data, opts) => {
        return await this.request<ApiResponse<T>>({
          method: 'PUT',
          path: entityByIdPath(entityName, id),
          body: data,
          signal: opts?.signal,
        });
      },
      delete: async (id, opts) => {
        return await this.request<ApiResponse<{ id: string | number; deleted: true }>>({
          method: 'DELETE',
          path: entityByIdPath(entityName, id),
          signal: opts?.signal,
        });
      },
    };
  }

  view<T = any>(entityName: string, viewName: string): SchemaKitViewApi<T> {
    return {
      run: async (params, opts) => {
        return await this.request<ApiResponse<T>>({
          method: 'GET',
          path: entityViewPath(entityName, viewName),
          query: params,
          signal: opts?.signal,
        });
      },
    };
  }
}
