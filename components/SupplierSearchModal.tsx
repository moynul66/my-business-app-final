
import React, { useState, useMemo } from 'react';
import { Supplier } from '../types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';

interface SupplierSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    suppliers: Supplier[];
    onSelectSupplier: (supplier: Supplier) => void;
}

const SupplierSearchModal: React.FC<SupplierSearchModalProps> = ({ isOpen, onClose, suppliers, onSelectSupplier }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSuppliers = useMemo(() => {
        if (!searchTerm) return suppliers;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return suppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(lowercasedTerm) ||
            supplier.address.toLowerCase().includes(lowercasedTerm)
        );
    }, [suppliers, searchTerm]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Search Suppliers">
            <div className="mb-4">
                <Input
                    placeholder="Search by name or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                {filteredSuppliers.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No suppliers found.</p>
                ) : (
                    filteredSuppliers.map(supplier => (
                        <button
                            key={supplier.id}
                            onClick={() => onSelectSupplier(supplier)}
                            className="w-full text-left p-3 bg-slate-100 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <p className="font-medium text-slate-800">{supplier.name}</p>
                            <p className="text-sm text-slate-500 whitespace-pre-wrap">{supplier.address}</p>
                        </button>
                    ))
                )}
            </div>
        </Modal>
    );
};

export default SupplierSearchModal;
