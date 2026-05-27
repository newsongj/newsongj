import React, { useState, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import type { BusInfo } from '@models/research.types';

const Wrapper = styled('div')({
    position: 'relative',
    display: 'inline-block',
    minWidth: 120,
});

const Trigger = styled('button')<{ $active: boolean }>(({ theme, $active }) => ({
    width: '100%',
    height: 28,
    padding: '0 8px',
    border: `1px solid ${$active ? theme.custom.colors.on.active : theme.custom.colors.neutral._90}`,
    borderRadius: 4,
    backgroundColor: '#fff',
    fontSize: 12,
    color: $active ? theme.custom.colors.on.active : theme.custom.colors.text.disabled,
    cursor: 'pointer',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
}));

const Dropdown = styled('div')(({ theme }) => ({
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 1000,
    minWidth: '100%',
    backgroundColor: '#fff',
    border: `1px solid ${theme.custom.colors.neutral._90}`,
    borderRadius: 4,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    padding: '4px 0',
}));

const Option = styled('label')<{ $checked: boolean }>(({ $checked }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: 12,
    cursor: 'pointer',
    backgroundColor: $checked ? '#e6f4ff' : 'transparent',
    '&:hover': { backgroundColor: $checked ? '#d0eaff' : '#f5f5f5' },
    userSelect: 'none',
    whiteSpace: 'nowrap',
}));

interface Props {
    buses: BusInfo[];
    value: string[] | null;
    onChange: (next: string[]) => void;
    disabled?: boolean;
}

const BusMultiSelect: React.FC<Props> = ({ buses, value, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selected = value ?? [];

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (busName: string) => {
        const next = selected.includes(busName)
            ? selected.filter((b) => b !== busName)
            : [...selected, busName];
        onChange(next);
    };

    const label = selected.length === 0 ? '미선택' : selected.join(', ');

    return (
        <Wrapper ref={wrapperRef}>
            <Trigger
                $active={selected.length > 0}
                onClick={() => !disabled && setOpen((o) => !o)}
                type="button"
                disabled={disabled}
                title={label}
            >
                {label}
            </Trigger>
            {open && buses.length > 0 && (
                <Dropdown>
                    {buses.map((bus) => {
                        const checked = selected.includes(bus.bus_name);
                        return (
                            <Option key={bus.bus_id} $checked={checked}>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(bus.bus_name)}
                                    style={{ accentColor: '#1677ff' }}
                                />
                                {bus.bus_name}
                            </Option>
                        );
                    })}
                </Dropdown>
            )}
        </Wrapper>
    );
};

export default BusMultiSelect;
