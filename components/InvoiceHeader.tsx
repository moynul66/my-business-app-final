
import React from 'react';
import { Input } from './ui/Input';
import { Customer } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { PlusIcon } from './icons/PlusIcon';
import { Button } from './ui/Button';

interface InvoiceHeaderProps {
    mode: 'invoice' | 'quote';
    customers: Customer[];
    customerName: string;
    setCustomerName: (name: string) => void;
    invoiceNumber: string;
    reference: string;
    setReference: (ref: string) => void;
    issueDate: string;
    setIssueDate: (date: string) => void;
    completionDate: string;
    setCompletionDate: (date: string) => void;
    dueDate: string;
    setDueDate: (date: string) => void;
    onOpenSearch: () => void;
    onOpenNewCustomerModal: () => void;
    onSaveCustomer: (name: string) => void;
}


const InvoiceHeader: React.FC<InvoiceHeaderProps> = ({
    mode,
    customers,
    customerName,
    setCustomerName,
    invoiceNumber,
    reference,
    setReference,
    issueDate,
    setIssueDate,
    completionDate,
    setCompletionDate,
    dueDate,
    setDueDate,
    onOpenSearch,
    onOpenNewCustomerModal,
    onSaveCustomer,
}) => {
    
    // Check if the current customerName is new and savable.
    const isNewCustomer = customerName.trim() !== '' && !customers.some(c => c.name.toLowerCase() === customerName.toLowerCase().trim());
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-slate-600 mb-1">Customer / Business Name</label>
                <div className="flex items-start gap-2">
                     <div className="flex-grow">
                        <Input 
                            id="customerName" 
                            value={customerName} 
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Search or type a new name..."
                        />
                        {isNewCustomer && (
                            <p className="text-xs text-slate-500 mt-1">New customer. Click '+' to save.</p>
                        )}
                     </div>
                    <Button type="button" size="icon" variant="outline" onClick={onOpenSearch} title="Search for existing customer">
                        <SearchIcon className="w-5 h-5" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={onOpenNewCustomerModal} title="Add detailed new customer">
                        <PlusIcon className="w-5 h-5" />
                    </Button>
                    {isNewCustomer && (
                         <Button type="button" size="icon" variant="primary" onClick={() => onSaveCustomer(customerName)} title="Quick save name only">
                            <PlusIcon className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </div>
             <div className="grid grid-cols-1 gap-6">
                <div>
                    <label htmlFor="invoiceNumber" className="block text-sm font-medium text-slate-600 mb-1">{mode === 'invoice' ? 'Invoice Number' : 'Quote Number'}</label>
                    <Input id="invoiceNumber" value={invoiceNumber} readOnly disabled className="bg-slate-200 cursor-not-allowed" />
                </div>
                <div>
                    <label htmlFor="reference" className="block text-sm font-medium text-slate-600 mb-1">Reference (PO #)</label>
                    <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
            </div>
             <div>
                <div className="mb-6">
                    <label htmlFor="issueDate" className="block text-sm font-medium text-slate-600 mb-1">Issue Date</label>
                    <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="completionDate" className="block text-sm font-medium text-slate-600 mb-1">Completion of Order</label>
                    <Input id="completionDate" type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
                </div>
            </div>
             <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-slate-600 mb-1">Payment Due Date</label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
        </div>
    );
};

export default InvoiceHeader;
