export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  [key: string]: any;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RetryPolicy {
  retries: number;
  factor?: number;
  min?: number;
  max?: number;
  retryOn?: (error: unknown, attempt: number) => boolean | Promise<boolean>;
}

export interface Interceptors {
  onRequest?: (init: RequestInit & { url: string }) => Promise<void> | void;
  onResponse?: (response: Response) => Promise<void> | void;
  onError?: (error: unknown) => Promise<void> | void;
}

export interface SchemaKitClientOptions {
  baseUrl?: string;
  tenantId?: string;
  getTenantId?: () => string | Promise<string>;
  tenantKey?: string;
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  fetch?: typeof fetch;
  timeoutMs?: number;
  retry?: RetryPolicy;
  interceptors?: Interceptors;
}

export interface RequestOptions {
  method: HttpMethod;
  path: string; // relative to baseUrl e.g. /entity/User
  query?: Record<string, any>;
  body?: any;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface EntityListParams extends Partial<ListQueryParams> {
  [key: string]: any;
}

export interface ViewParams extends Partial<ListQueryParams> {
  stats?: boolean;
  [key: string]: any;
}

export interface SchemaKitEntityApi<T = any> {
  list(params?: EntityListParams, options?: { signal?: AbortSignal }): Promise<PaginatedResponse<T>>;
  get(id: string | number, options?: { signal?: AbortSignal }): Promise<ApiResponse<T>>;
  create(data: Record<string, any>, options?: { signal?: AbortSignal }): Promise<ApiResponse<T>>;
  update(id: string | number, data: Record<string, any>, options?: { signal?: AbortSignal }): Promise<ApiResponse<T>>;
  delete(id: string | number, options?: { signal?: AbortSignal }): Promise<ApiResponse<{ id: string | number; deleted: true }>>;
}

export interface SchemaKitViewApi<T = any> {
  run(params?: ViewParams, options?: { signal?: AbortSignal }): Promise<ApiResponse<T>>;
}

export interface SchemaKitClient {
  request<T = any>(options: RequestOptions): Promise<T>;
  entity<T = any>(entityName: string): SchemaKitEntityApi<T>;
  view<T = any>(entityName: string, viewName: string): SchemaKitViewApi<T>;
  with(overrides: Partial<SchemaKitClientOptions>): SchemaKitClient;
}
