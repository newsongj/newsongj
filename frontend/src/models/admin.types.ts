// Admin User API Types based on OpenAPI schema

export interface UserListRow {
  user_idx: number;
  name: string;
  role_idx: number | null;
  role_name: string | null;
  chatbot_activated: boolean;
}

export interface UserSearchRow {
  user_idx: number;
  name: string;
  role_idx: number | null;
  role_name: string | null;
  chatbot_activated: boolean;
}
