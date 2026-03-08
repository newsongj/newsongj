export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubMenuItem[];
}

export interface SubMenuItem {
  id: string;
  label: string;
  path: string;
}

export interface SidebarProps {
  menuItems: MenuItem[];
  selectedPath?: string;
  onMenuClick: (path: string) => void;
}
