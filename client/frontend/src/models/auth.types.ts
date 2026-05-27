export interface AuthUser {
    token:    string;
    role:     'group_leader' | 'team_leader' | 'admin';
    gyogu:    number;
    team:     number;
    group_no: number;
}
