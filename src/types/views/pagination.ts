/**
 * Pagination types for queries and views
 */

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult<T = any> {
  data: T[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_previous: boolean;
    has_next: boolean;
  };
  meta?: {
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
    total_pages: number;
  };
}