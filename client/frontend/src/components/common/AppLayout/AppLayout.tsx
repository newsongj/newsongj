import React from 'react';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Header from '@components/common/Header/Header';
import { storage } from '@utils/storage';
import { logout as apiLogout } from '@api/auth';

const Main = styled('main')(({ theme }) => ({
    paddingTop: 66,
    minHeight: '100vh',
    backgroundColor: theme.custom.colors.surface,
}));

const ContentArea = styled('div')(({ theme }) => ({
    padding: theme.custom.spacing.lg,
    '@media (max-width: 600px)': {
        padding: theme.custom.spacing.sm,
    },
}));

interface AppLayoutProps {
    children: React.ReactNode;
    title?: string;
}

const getStoredUser = () => {
    try {
        const raw = localStorage.getItem('client_user');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
    const navigate = useNavigate();
    const user = getStoredUser();

    const roleLabel = !user
        ? undefined
        : user.role === 'admin'
        ? '관리자'
        : user.role === 'team_leader'
        ? `${user.gyogu}교구 ${user.team}팀 팀장`
        : `${user.gyogu}교구 ${user.team}팀 ${user.group_no}그룹 그룹장`;

    const handleLogout = async () => {
        await apiLogout();
        storage.removeToken();
        localStorage.removeItem('client_user');
        navigate('/login');
    };

    return (
        <>
            <Header title={title} userName={roleLabel} onLogout={handleLogout} />
            <Main>
                <ContentArea>{children}</ContentArea>
            </Main>
        </>
    );
};

export default AppLayout;
