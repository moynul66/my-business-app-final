import React, { useState, useMemo } from 'react';
import { CreditNote, AppSettings } from '../types';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { DocumentMinusIcon } from './icons/DocumentMinusIcon';

interface CreditNoteManagerProps {
    creditNotes: CreditNote[];
    settings: AppSettings;
    onRemoveCreditNote: (id: string) => void;
    onDownloadPdf: (creditNote: CreditNote) => void;
}

const CreditNoteManager: React.FC<CreditNoteManagerProps> = ({
    creditNotes,
    settings,
    onRemoveCreditNote,
    onDownloadPdf,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const currency = settings.currencySymbol || '£';

    const sortedAndFilteredCreditNotes = useMemo(() => {
        const sorted = [...creditNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!searchTerm) {
            return sorted;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return sorted.filter(cn =>
            cn.name.toLowerCase().includes(lowercasedTerm) ||
            cn.state.creditNoteNumber.toLowerCase().includes(lowercasedTerm) ||
            cn.state.originalInvoiceNumber.toLowerCase().includes(lowercasedTerm) ||
            cn.state.customerName.toLowerCase().includes(lowercasedTerm)
        );
    }, [creditNotes, searchTerm]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
             <h2 className="text-3xl font-bold mb-6 text-slate-800">Manage Credit Notes</h2>
             <div className="mb-4">
                <Input
                    placeholder="Search by CN #, original invoice #, or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             <div className="max-h-[65vh] overflow-y-auto pr-2">
                {sortedAndFilteredCreditNotes.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        <DocumentMinusIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">No credit notes created yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px] space-y-3">
                            {sortedAndFilteredCreditNotes.map(cn => (
                                <div key={cn.id} className="flex justify-between items-center bg-slate-100 p-4 rounded-md">
                                    <div>
                                        <p className="font-semibold text-slate-800">{cn.name}</p>
                                        <p className="text-sm text-slate-500">
                                            Created on {new Date(cn.createdAt).toLocaleDateString()}
                                            <span className="mx-2">|</span>
                                            Total: <span className="font-medium text-slate-600">{currency}{cn.total.toFixed(2)}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => onDownloadPdf(cn)} title="Download PDF" aria-label="Download PDF">
                                            <DownloadIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onRemoveCreditNote(cn.id)} title="Delete credit note">
                                            <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreditNoteManager;
