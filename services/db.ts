
import { supabase, isCloudActive } from './supabase';

/**
 * Hybrid database service.
 * Automatically uses Supabase if configured, otherwise falls back to localStorage.
 */
export const db = {
    /**
     * Loads data from the cloud database or local storage.
     */
    load: async <T>(key: string, initialValue: T): Promise<T> => {
        try {
            if (isCloudActive && supabase) {
                const { data, error } = await supabase
                    .from('user_persistence')
                    .select('value')
                    .eq('key', key)
                    .single();

                if (!error && data) {
                    return data.value as T;
                }
                
                // If cloud load fails but we have local data, migrate it
                const localItem = window.localStorage.getItem(key);
                if (localItem) {
                    const parsed = JSON.parse(localItem);
                    await db.save(key, parsed);
                    return parsed;
                }
            } else {
                // Fallback to local storage if cloud is not configured
                const localItem = window.localStorage.getItem(key);
                return localItem ? JSON.parse(localItem) : initialValue;
            }
            
            return initialValue;
        } catch (error) {
            console.warn(`Load failed for [${key}], returning initial value.`, error);
            return initialValue;
        }
    },

    /**
     * Saves data to the cloud database or local storage.
     */
    save: async <T>(key: string, value: T): Promise<void> => {
        try {
            // Always save to local storage for speed and offline availability
            window.localStorage.setItem(key, JSON.stringify(value));

            if (isCloudActive && supabase) {
                const { error } = await supabase
                    .from('user_persistence')
                    .upsert({ 
                        key, 
                        value, 
                        updated_at: new Date().toISOString() 
                    }, { onConflict: 'key' });

                if (error) console.error("Cloud sync error:", error);
            }
        } catch (error) {
            console.error(`Save failed for [${key}]:`, error);
        }
    },
    
    /**
     * Removes data from both the cloud and local storage.
     */
    remove: async (key: string): Promise<void> => {
        try {
            window.localStorage.removeItem(key);

            if (isCloudActive && supabase) {
                await supabase
                    .from('user_persistence')
                    .delete()
                    .eq('key', key);
            }
        } catch (error) {
            console.error(`Remove failed for [${key}]:`, error);
        }
    }
};
