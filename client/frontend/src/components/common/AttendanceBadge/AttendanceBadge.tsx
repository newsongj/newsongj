import React from 'react';
import { styled } from '@mui/material/styles';
import type { AttendanceStatus } from '@models/research.types';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; color: string }> = {
    미정: { label: '미정', bg: '#f0f0f0', color: '#8c8c8c' },
    정상: { label: '정상', bg: '#f6ffed', color: '#52c41a' },
    참석: { label: '참석', bg: '#e6f4ff', color: '#1677ff' },
    후발: { label: '후발', bg: '#fff7e6', color: '#fa8c16' },
    불참: { label: '불참', bg: '#fff1f0', color: '#ff4d4f' },
};

const ORDER: AttendanceStatus[] = ['미정', '정상', '참석', '후발', '불참'];

const Badge = styled('button')<{ $status: AttendanceStatus }>(({ $status }) => {
    const cfg = STATUS_CONFIG[$status];
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
        height: 26,
        padding: '0 8px',
        borderRadius: 13,
        border: `1.5px solid ${cfg.color}`,
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        whiteSpace: 'nowrap',
        '&:hover': { opacity: 0.75 },
    };
});

interface Props {
    value: AttendanceStatus | null;
    onChange: (next: AttendanceStatus) => void;
    disabled?: boolean;
}

const AttendanceBadge: React.FC<Props> = ({ value, onChange, disabled }) => {
    const current = value ?? '미정';

    const handleClick = () => {
        if (disabled) return;
        const idx = ORDER.indexOf(current);
        const next = ORDER[(idx + 1) % ORDER.length];
        onChange(next);
    };

    return (
        <Badge $status={current} onClick={handleClick} type="button" disabled={disabled}>
            {STATUS_CONFIG[current].label}
        </Badge>
    );
};

export default AttendanceBadge;
