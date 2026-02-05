import React, { useState, useMemo } from 'react';
import { InventoryItem, Category, AppSettings, ItemType, InvoiceCreationType } from '../types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface InventorySearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventory: InventoryItem[];
    categories: Category[];
    settings: AppSettings;
    onSelectItem: (item: InventoryItem) => void;
    invoiceType: InvoiceCreationType;
}

const InventorySearchModal: React.FC<InventorySearchModalProps> = ({ isOpen, onClose, inventory, categories, settings, onSelectItem, invoiceType }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string | null>>(new Set());
    
    const currency = settings.currencySymbol || '£';

    const filteredInventory = useMemo(() => {
        let items = inventory;
        if (invoiceType === 'fixed') {
            items = inventory.filter(item => item.type === ItemType.FIXED);
        }

        if (!searchTerm) return items;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return items.filter(item =>
            item.name.toLowerCase().includes(lowercasedTerm) ||
            (item.sku && item.sku.toLowerCase().includes(lowercasedTerm))
        );
    }, [inventory, searchTerm, invoiceType]);
    
    const categorizedItems = useMemo(() => {
        const result: { category: Category | null; items: InventoryItem[] }[] = [];
        const itemsByCat: Record<string, InventoryItem[]> = {};

        for (const item of filteredInventory) {
            const catId = item.categoryId || 'uncategorized';
            
            // Apply category filter if one is selected via dropdown
            if (selectedCategoryId !== 'all') {
                if (catId !== selectedCategoryId) continue;
            }

            if (!itemsByCat[catId]) {
                itemsByCat[catId] = [];
            }
            itemsByCat[catId].push(item);
        }
        
        // Add categorized items in the order of the categories array
        for (const category of categories) {
            if (itemsByCat[category.id]) {
                result.push({ category, items: itemsByCat[category.id] });
            }
        }
        
        // Add uncategorized items at the end
        if (itemsByCat['uncategorized']) {
            result.push({ category: null, items: itemsByCat['uncategorized'] });
        }

        return result;
    }, [filteredInventory, categories, selectedCategoryId]);

    const toggleCategory = (id: string | null) => {
        setExpandedCategoryIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Search Inventory">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Search Items</label>
                    <Input
                        placeholder="Search by name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                    <Select 
                        value={selectedCategoryId} 
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        <option value="uncategorized">Uncategorized</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </Select>
                </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                {categorizedItems.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <p className="text-slate-500">No items found matching your criteria.</p>
                        {(searchTerm || selectedCategoryId !== 'all') && (
                            <button 
                                onClick={() => { setSearchTerm(''); setSelectedCategoryId('all'); }}
                                className="mt-2 text-sm text-blue-600 hover:underline"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    categorizedItems.map(({ category, items }) => {
                        const categoryId = category?.id || null;
                        // Auto-expand if searching or if a specific category is filtered in the dropdown
                        const isExpanded = selectedCategoryId !== 'all' || searchTerm.trim().length > 0 || expandedCategoryIds.has(categoryId);

                        return (
                            <div key={categoryId || 'uncategorized'} className="border border-slate-100 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleCategory(categoryId)}
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                                            {category?.name || 'Uncategorized'}
                                        </h3>
                                        <span className="text-[10px] text-slate-400 lowercase">({items.length} items)</span>
                                    </div>
                                    <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isExpanded && (
                                    <div className="p-2 grid grid-cols-1 gap-2 bg-white">
                                        {items.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => onSelectItem(item)}
                                                className="w-full text-left p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-grow pr-4">
                                                        <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{item.name}</p>
                                                        {item.sku && <p className="text-[10px] text-slate-400 mt-0.5">SKU: {item.sku}</p>}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-bold text-slate-900">
                                                            {currency}{item.price.toFixed(2)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">
                                                            {item.type === ItemType.MEASURED ? `per ${item.measurementUnit}` : 'Fixed Price'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
};

export default InventorySearchModal;