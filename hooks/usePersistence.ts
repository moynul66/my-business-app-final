
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';

/**
 * A custom hook to manage state that persists to the Cloud Database.
 * Returns [value, setValue, isLoading]
 */
export function usePersistence<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isLoading, setIsLoading] = useState(true);
    const isFirstLoad = useRef(true);

    // Initial load from Cloud DB
    useEffect(() => {
        async function fetchInitial() {
            setIsLoading(true);
            const data = await db.load<T>(key, initialValue);
            setStoredValue(data);
            setIsLoading(false);
            isFirstLoad.current = false;
        }
        fetchInitial();
    }, [key]);

    // Save to DB whenever the value changes (skipping the very first mount)
    useEffect(() => {
        if (!isFirstLoad.current) {
            db.save<T>(key, storedValue);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue, isLoading];
}
