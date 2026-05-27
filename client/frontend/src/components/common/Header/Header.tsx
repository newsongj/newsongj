import React from 'react';
import { styled } from '@mui/material/styles';
import { AppBar, Toolbar } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { ReactComponent as NewsongLogo } from '@assets/NewsongJ_logo.svg';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
    backgroundColor: theme.custom.colors.primary._900,
    height: 66,
    boxShadow: 'none',
    position: 'fixed',
    zIndex: 1100,
}));

const StyledToolbar = styled(Toolbar)({
    minHeight: '66px !important',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    '@media (max-width: 600px)': {
        padding: '0 12px',
    },
});

const LeftPanel = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    minWidth: 0,
});

const Logo = styled(NewsongLogo)({
    width: 120,
    height: 28,
    flexShrink: 0,
    '@media (max-width: 600px)': {
        width: 96,
        height: 24,
    },
});

const Title = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.h3.fontSize,
    fontWeight: 700,
    color: theme.custom.colors.on.primary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    '@media (max-width: 600px)': {
        fontSize: '16px',
    },
}));

const RightPanel = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
    '@media (max-width: 600px)': {
        gap: 8,
    },
});

const UserName = styled('span')(({ theme }) => ({
    fontSize: theme.custom.typography.body2.fontSize,
    color: 'rgba(255,255,255,0.75)',
    '@media (max-width: 480px)': {
        display: 'none',
    },
}));

const LogoutBtn = styled('button')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 100,
    backgroundColor: 'transparent',
    color: theme.custom.colors.on.primary,
    fontSize: theme.custom.typography.body2.fontSize,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
}));

interface HeaderProps {
    title?: string;
    userName?: string;
    onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title = '수련회 인원조사', userName, onLogout }) => {
    return (
        <StyledAppBar>
            <StyledToolbar>
                <LeftPanel>
                    <Logo />
                    <Title>{title}</Title>
                </LeftPanel>
                <RightPanel>
                    {userName && <UserName>{userName}</UserName>}
                    {onLogout && (
                        <LogoutBtn onClick={onLogout}>
                            <LogoutIcon sx={{ fontSize: 16 }} />
                            로그아웃
                        </LogoutBtn>
                    )}
                </RightPanel>
            </StyledToolbar>
        </StyledAppBar>
    );
};

export default Header;
