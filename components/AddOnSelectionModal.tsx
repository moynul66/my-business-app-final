import React, { useState, useEffect } from 'react';
import { AddOnOption, AppSettings } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface AddOnSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    addOnOptions: AddOnOption[];
    initiallySelectedIds: string[];
    onConfirm: (selectedIds: string[]) => void;
    settings: AppSettings;
    itemName: string;
}

const AddOnSelectionModal: React.FC<AddOnSelectionModalProps> = ({ 
    isOpen, 
    onClose, 
    addOnOptions, 
    initiallySelectedIds, 
    onConfirm, 
    settings,
    itemName 
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const currency = settings.currencySymbol || '£';

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(initiallySelectedIds));
        }
    }, [isOpen, initiallySelectedIds]);

    const handleToggle = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedIds));
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Optional Add-ons for ${itemName}`}
            size="md"
            footer={
                <div className="flex justify-end gap-2 w-full">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirm}>Confirm Selection</Button>
                </div>
            }
        >
            <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-4">Select any additional options to add to the unit price.</p>
                {addOnOptions.map(option => (
                    <label 
                        key={option.id} 
                        className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedIds.has(option.id) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(option.id)}
                                onChange={() => handleToggle(option.id)}
                                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="font-medium text-slate-800">{option.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">+{currency}{option.price.toFixed(2)}</span>
                    </label>
                ))}
                {addOnOptions.length === 0 && (
                    <p className="text-center py-8 text-slate-500 italic">No add-on options available for this item.</p>
                )}
            </div>
        </Modal>
    );
};

export default AddOnSelectionModal;
