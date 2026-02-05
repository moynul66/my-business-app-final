import { supabase, isCloudConfigured } from './supabaseClient';

export const db = {
    /**
     * Fetch settings from cloud
     */
    async loadSettings(userId: string) {
        if (!isCloudConfigured) return null;
        const { data, error } = await supabase
            .from('app_settings')
            .select('settings')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116') console.error(error);
        return data?.settings || null;
    },

    /**
     * Save settings to cloud
     */
    async saveSettings(userId: string, settings: any) {
        if (!isCloudConfigured) return;
        await supabase
            .from('app_settings')
            .upsert({ user_id: userId, settings });
    },

    /**
     * Fetch all items in a collection (e.g. 'customers')
     */
    async fetchCollection(collectionName: string) {
        if (!isCloudConfigured) return [];
        const { data, error } = await supabase
            .from('business_data')
            .select('*')
            .eq('collection_name', collectionName);
        
        if (error) {
            console.error(`Error fetching ${collectionName}:`, error);
            return [];
        }
        
        return (data || []).map(item => ({
            id: item.id,
            ...item.payload
        }));
    },

    /**
     * Save or Update an item in the cloud
     */
    async upsert(collectionName: string, item: any) {
        if (!isCloudConfigured) throw new Error("Cloud Database not configured.");
        const { id, ...payload } = item;
        
        // Use ID if it's a UUID, otherwise let DB create one
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        
        const row: any = {
            collection_name: collectionName,
            payload: payload
        };
        
        if (isUuid) row.id = id;

        const { data, error } = await supabase
            .from('business_data')
            .upsert(row)
            .select()
            .single();

        if (error) throw error;
        return { id: data.id, ...data.payload };
    },

    /**
     * Delete from cloud
     */
    async remove(id: string) {
        if (!isCloudConfigured) return;
        await supabase.from('business_data').delete().eq('id', id);
    },

    // Stub for legacy hooks that aren't migrated yet
    load: <T>(_key: string, initialValue: T): T => initialValue,
    save: <T>(_key: string, _value: T): void => {}
};