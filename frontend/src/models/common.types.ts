// Common API Types

export interface PageMeta {
  current_page: number;
  page_size: number;
  total_items: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface CommonResponse {
  success: boolean;
  message: string;
}