// Role API Types based on OpenAPI schema
export interface RoleListRow {
  role_idx: number;
  name: string;
  description: string;
  created_at: string;
  is_activated: boolean;
  access_menus: string[];
}

export interface RoleMenuResponse {
  menu_idx: number;
  name: string;
  description: string | null;
  created_at: string;
  is_activated: boolean;
}

export interface RoleSelectedMenusResponse {
  role_idx: number;
  name: string;
  description: string;
  is_activated: boolean;
  selected_menu_ids: number[];
}

export interface RoleCreateRequest {
  name: string;
  description: string;
  menu_ids: number[];
}

export interface RoleCreateResponse {
  success: boolean;
  message: string;
}

export interface RoleUpdateRequest {
  is_activated?: boolean | null;
  menu_ids: number[];
}

export interface RoleUpdateResponse {
  success: boolean;
  message: string;
}

export interface RoleDeleteRequest {
  role_idx: number;
}

export interface RoleDeleteResponse {
  success: boolean;
  message: string;
}
