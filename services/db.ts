
/**
 * A mock database service that wraps localStorage.
 * This structure is designed to be easily replaced by a real database client
 * (e.g., Supabase, Firebase, or a custom API) in the future.
 */
export const db = {
    /**
     * Loads data from the database.
     * @param key The unique identifier for the data collection (e.g., 'user_123_inventory')
     * @param initialValue The default value to return if no data exists
     */
    load: <T>(key: string, initialValue: T): T => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error loading from DB [${key}]:`, error);
            return initialValue;
        }
    },

    /**
     * Saves data to the database.
     * @param key The unique identifier for the data collection
     * @param value The data to save
     */
    save: <T>(key: string, value: T): void => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error saving to DB [${key}]:`, error);
        }
    },
    
    /**
     * Removes data from the database.
     * @param key The unique identifier for the data collection
     */
    remove: (key: string): void => {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from DB [${key}]:`, error);
        }
    }
};
