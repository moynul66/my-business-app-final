import React, { useState, useMemo } from 'react';
import { SupplierInventoryItem } from '../types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';

interface SupplierInventorySearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: SupplierInventoryItem[];
    onSelectItem: (item: SupplierInventoryItem) => void;
}

const SupplierInventorySearchModal: React.FC<SupplierInventorySearchModalProps> = ({ isOpen, onClose, items, onSelectItem }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const lowercasedTerm = searchTerm.toLowerCase();
        return items.filter(item =>
            item.name.toLowerCase().includes(lowercasedTerm) ||
            (item.itemCode && item.itemCode.toLowerCase().includes(lowercasedTerm))
        );
    }, [items, searchTerm]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Search Supplier Inventory">
            <div className="mb-4">
                <Input
                    placeholder="Search for an item by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                {items.length === 0 ? (
                     <p className="text-slate-500 text-center py-8">No items found for this supplier.</p>
                ) : filteredItems.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No matching items found.</p>
                ) : (
                    filteredItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onSelectItem(item)}
                            className="w-full text-left p-3 bg-slate-100 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <p className="font-medium text-slate-800">{item.name}</p>
                            <p className="text-sm text-slate-500">Price: £{item.price.toFixed(2)}</p>
                            {item.itemCode && <p className="text-sm text-slate-500">Code: {item.itemCode}</p>}
                        </button>
                    ))
                )}
            </div>
        </Modal>
    );
};

export default SupplierInventorySearchModal;