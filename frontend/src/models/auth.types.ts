export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  requires_password_change: boolean;
  message?: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface TicketExchangeRequest {
  ticket: string;
}

export interface MenuInfo {
  menu_idx: number;
  name: string;
  description?: string;
  code: string;
  is_activated: boolean;
}

export interface MeResponse {
  user_idx: number;
  email: string;
  name: string;
  dept_idx?: number;
  roles: string[];
  menus: MenuInfo[];
  requires_password_change: boolean;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}