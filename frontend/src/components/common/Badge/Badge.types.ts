export type BadgeVariant = 'error' | 'success' | 'warning' | 'info' | 'active' | 'inactive';

export interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}
