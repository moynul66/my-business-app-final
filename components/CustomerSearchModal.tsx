import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';

interface CustomerSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    onSelectCustomer: (customer: Customer) => void;
}

const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({ isOpen, onClose, customers, onSelectCustomer }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(lowercasedTerm) ||
            (customer.contactName && customer.contactName.toLowerCase().includes(lowercasedTerm)) ||
            customer.address.toLowerCase().includes(lowercasedTerm)
        );
    }, [customers, searchTerm]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Search Customers">
            <div className="mb-4">
                <Input
                    placeholder="Search by name, contact, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                {filteredCustomers.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No customers found.</p>
                ) : (
                    filteredCustomers.map(customer => (
                        <button
                            key={customer.id}
                            onClick={() => onSelectCustomer(customer)}
                            className="w-full text-left p-3 bg-slate-100 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <p className="font-medium text-slate-800">{customer.name}</p>
                            <p className="text-sm text-slate-500 whitespace-pre-wrap">{customer.address}</p>
                        </button>
                    ))
                )}
            </div>
        </Modal>
    );
};

export default CustomerSearchModal;
