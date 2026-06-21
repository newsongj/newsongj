export interface AuthUser {
    token:                   string;
    data_scope:              'all' | 'team' | 'group' | 'member';
    member_id:               number | null;
    gyogu:                   number | null;
    team:                    number | null;
    group_no:                number | null;
    requires_password_change: boolean;
    menus:                   string[];
    leader_names:            string[];
}
