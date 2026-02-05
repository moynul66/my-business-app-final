import React from 'react';
import { XIcon } from '../icons/XIcon';
import { InvoiceCreationType } from '../../types';
import { TagIcon } from '../icons/TagIcon';
import { RulerIcon } from '../icons/RulerIcon';

interface CreationTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: InvoiceCreationType) => void;
}

export const CreationTypeModal: React.FC<CreationTypeModalProps> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:my-8 w-full max-w-lg mx-4 border border-slate-200">
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                            Choose Document Type
                        </h3>
                        <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close</span>
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-slate-500">
                            Your plan allows for multiple document types. Please select one to continue.
                        </p>
                    </div>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => onSelect('fixed')}
                            className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-lg border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            <TagIcon className="w-10 h-10 text-blue-600 mb-2" />
                            <h4 className="font-semibold text-slate-800">Fixed Price</h4>
                            <p className="text-xs text-slate-500 mt-1">For items with a standard, set price.</p>
                        </button>
                         <button
                            onClick={() => onSelect('measured')}
                            className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-lg border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                            <RulerIcon className="w-10 h-10 text-blue-600 mb-2" />
                            <h4 className="font-semibold text-slate-800">Measured Unit Price</h4>
                            <p className="text-xs text-slate-500 mt-1">For items priced by units like m², m, etc.</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
