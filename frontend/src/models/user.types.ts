export interface UserInfo {
    user_idx: number,
    idno: string,
    email: string;
    name: string;
    dept_name: string;
    status: string;
    created_at: Date;
    rank: string;
    dept_idx: number;
}

export interface UserResponse {
  user_idx: number;
  name: string;
  email: string;
  auth_mode: string;
  status?: string;
  rank?: string;
  dept_name: string;
  roles: string[];
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role_names?: string[];
  dept_name: string;
}

export interface UserCreateResponse {
  success: boolean;
  message: string;
}

export interface UserUpdateRequest {
  password?: string;
  role_names?: string[];
  dept_name?: string;
}

export interface UserUpdateResponse {
  success: boolean;
  message: string;
}

export interface UserDeleteResponse {
  success: boolean;
  message: string;
}
