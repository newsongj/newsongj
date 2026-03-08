export interface DocumentListRow {
  document_idx: number;
  name: string;
  doc_version_idx: number;
  version: string;
  file_size: string;
  created_at: string;
  uploader_name: string | null;
}

export interface DocumentSearchRow {
  document_idx: number;
  name: string;
  doc_version_idx: number;
  version: string;
  file_size: string;
  created_at: string;
  uploader_name: string | null;
}

export interface VersionItem {
  document_version_idx: number;
  version: string;
}

export interface DocumentVersionResponse {
  document_idx: number;
  name: string;
  version_item: VersionItem[];
  active_doc_version_idx: number;
}

export interface DocumentActiveVersionResponse {
  document_idx: number;
  doc_version_idx: number;
  version: string;
  file_size: string;
  description: string | null;
  updated_at: string;
  uploader_name: string | null;
  is_activated: boolean;
  meta_company: string;
  meta_dept_names: string;
}
export interface DocumentUploadRequest {
  files: File[];
  description: string;
  dept_names: string[];
}

export interface DocumentUploadResponse {
  success: boolean;
  uploaded_count: number;
  message: string;
  duplicate_files: string[];
}

export interface DocumentVersionUploadRequest {
  file: File | null;
  description: string;
  dept_names: string[];
}

export interface DocumentVersionUploadResponse {
  success: boolean;
  uploaded_count: number;
  message: string;
}

export interface DocumentRenameRequest {
  name: string;
}

export interface DocumentRenameResponse {
  success: boolean;
  message: string;
}

export interface DocumentUpdateRequest {
  description?: string | null;
  dept_names?: string[] | null;
  is_activated?: boolean | null;
}

export interface DocumentUpdateResponse {
  success: boolean;
  message: string;
}

export interface DocumentUploadVersionResponse {
  success: boolean;
  uploaded_count: number;
  message: string;
}
