
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';

/**
 * A custom hook to manage state that persists to the "database".
 * Currently uses localStorage via the db service, but keeps the API 
 * consistent for future migrations.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    // Initialize state by loading from the DB
    const [storedValue, setStoredValue] = useState<T>(() => {
        return db.load<T>(key, initialValue);
    });

    // Save to DB whenever the key or value changes
    useEffect(() => {
        db.save<T>(key, storedValue);
    }, [key, storedValue]);

    // Listen for changes from other tabs/windows to keep state in sync
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.log(error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);

    return [storedValue, setStoredValue];
}