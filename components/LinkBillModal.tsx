import React, { useState, useMemo, useEffect } from 'react';
// fix: Add AppSettings to imports to support dynamic currency.
import { Bill, AppSettings } from '../types';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface LinkBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    unlinkedBills: Bill[];
    initiallySelectedIds: string[];
    // fix: Added settings prop to get currency symbol.
    settings: AppSettings;
    onLinkBills: (selectedIds: string[]) => void;
}

const LinkBillModal: React.FC<LinkBillModalProps> = ({ isOpen, onClose, unlinkedBills, initiallySelectedIds, settings, onLinkBills }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const currency = settings.currencySymbol || '£';

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(initiallySelectedIds));
        }
    }, [isOpen, initiallySelectedIds]);
    
    const filteredBills = useMemo(() => {
        if (!searchTerm) return unlinkedBills;
        const lowercasedTerm = searchTerm.toLowerCase();
        return unlinkedBills.filter(bill =>
            bill.state.supplierName.toLowerCase().includes(lowercasedTerm) ||
            (bill.state.reference && bill.state.reference.toLowerCase().includes(lowercasedTerm))
        );
    }, [unlinkedBills, searchTerm]);

    const handleToggleSelection = (billId: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(billId)) {
            newSelection.delete(billId);
        } else {
            newSelection.add(billId);
        }
        setSelectedIds(newSelection);
    };

    const handleConfirm = () => {
        onLinkBills(Array.from(selectedIds));
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:my-8 w-full max-w-2xl mx-4 border border-slate-200">
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                            Link Bills to Invoice
                        </h3>
                        <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
                             <span className="sr-only">Close</span>
                             <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="mt-4">
                        <Input
                            placeholder="Search by supplier or reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                     <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                        {filteredBills.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No unlinked bills found.</p>
                        ) : (
                            filteredBills.map(bill => {
                                const isSelected = selectedIds.has(bill.id);
                                return (
                                    <div
                                        key={bill.id}
                                        onClick={() => handleToggleSelection(bill.id)}
                                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                            isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-slate-100 hover:bg-slate-200'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                        />
                                        <div className="ml-3 text-sm">
                                            <p className="font-medium text-slate-900">
                                                {bill.state.supplierName} - Ref: {bill.state.reference}
                                            </p>
                                            <p className="text-slate-500">
                                                {new Date(bill.state.issueDate).toLocaleDateString()} - {currency}{bill.total.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                    <Button variant="primary" onClick={handleConfirm}>
                        Link {selectedIds.size} Bill(s)
                    </Button>
                     <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LinkBillModal;