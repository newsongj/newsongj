export interface RoleCreateModalProps {
  onSuccess?: () => void;
}

export interface RoleFormData {
  name: string;
  description: string;
  selectedMenuIds: number[];
}
