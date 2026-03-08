import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
    // 초기값 설정
    const [storedValue, setStoredValue] = useState<T>(() => {
        return storage.get<T>(key) ?? initialValue;
    });

    // 값이 변경될 때마다 로컬 스토리지 업데이트
    useEffect(() => {
        storage.set(key, storedValue);
    }, [key, storedValue]);

    return [storedValue, setStoredValue] as const;
} 