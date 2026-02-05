import React, { useState, useMemo } from 'react';
import { InvoiceDraft } from '../types';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { Input } from './ui/Input';

interface DraftsManagerProps {
    drafts: InvoiceDraft[];
    onLoadDraft: (id: string) => void;
    onRemoveDraft: (id: string) => void;
}

const DraftsManager: React.FC<DraftsManagerProps> = ({
    drafts,
    onLoadDraft,
    onRemoveDraft
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const sortedAndFilteredDrafts = useMemo(() => {
        const sorted = [...drafts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!searchTerm) {
            return sorted;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return sorted.filter(draft =>
            draft.name.toLowerCase().includes(lowercasedTerm) ||
            draft.state.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
            draft.state.reference.toLowerCase().includes(lowercasedTerm) ||
            draft.state.customerName.toLowerCase().includes(lowercasedTerm)
        );
    }, [drafts, searchTerm]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">Manage Drafts</h2>
            <div className="mb-4">
                <Input
                    placeholder="Search by draft name, number, reference, or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="max-h-[65vh] overflow-y-auto pr-2">
                {sortedAndFilteredDrafts.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        {drafts.length === 0 ? (
                            <>
                                <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">No drafts saved yet.</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No drafts found for your search.</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[500px] space-y-3">
                            {sortedAndFilteredDrafts.map(draft => (
                                <div key={draft.id} className="flex justify-between items-center bg-slate-100 p-4 rounded-md">
                                    <div>
                                        <p className="font-semibold text-slate-800">{draft.name}</p>
                                        <p className="text-sm text-slate-500">
                                            Saved on {new Date(draft.createdAt).toLocaleDateString()}
                                            <span className="mx-2">|</span>
                                            Total: <span className="font-medium text-slate-600">£{draft.total.toFixed(2)}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={() => onLoadDraft(draft.id)}>
                                            Edit
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onRemoveDraft(draft.id)}>
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

export default DraftsManager;