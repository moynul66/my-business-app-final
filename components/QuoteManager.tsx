import React, { useState, useMemo, useRef } from 'react';
import { QuoteDraft, AppSettings, User, Invoice } from '../types';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { FilterIcon } from './icons/FilterIcon';

interface QuoteManagerProps {
    quotes: QuoteDraft[];
    settings: AppSettings;
    currentUser: User;
    onLoadQuote: (id: string) => void;
    onRemoveQuote: (id:string) => void;
    onConvertToInvoice: (id: string) => void;
    onDownloadQuote: (id: string) => void;
    onOpenEmailModal: (doc: Invoice | QuoteDraft) => void;
}

const QuoteManager: React.FC<QuoteManagerProps> = ({
    quotes,
    settings,
    currentUser,
    onLoadQuote,
    onRemoveQuote,
    onConvertToInvoice,
    onDownloadQuote,
    onOpenEmailModal,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const currency = settings.currencySymbol || '£';

    const customerNames = useMemo(() => {
        const names = new Set(quotes.map(q => q.state.customerName));
        return Array.from(names);
    }, [quotes]);

    const sortedAndFilteredQuotes = useMemo(() => {
        let filtered = [...quotes];
        
        // Customer filter
        if (filterCustomer) {
            filtered = filtered.filter(q => q.state.customerName.toLowerCase().includes(filterCustomer.toLowerCase()));
        }

        // Date range filter
        if (filterStartDate) {
            const start = new Date(filterStartDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(q => new Date(q.state.issueDate) >= start);
        }
        if (filterEndDate) {
            const end = new Date(filterEndDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(q => new Date(q.state.issueDate) <= end);
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(quote =>
                quote.name.toLowerCase().includes(lowercasedTerm) ||
                quote.state.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
                quote.state.reference.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [quotes, searchTerm, filterCustomer, filterStartDate, filterEndDate]);

    const clearFilters = () => {
        setFilterCustomer('');
        setFilterStartDate('');
        setFilterEndDate('');
        setSearchTerm('');
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Manage Quotes</h2>
                <div className="flex gap-2">
                    {!currentUser.subscriptionStatus.startsWith('trial_') && (
                        <>
                            <Button variant="outline" onClick={() => exportToCsv('quotes-backup.csv', quotes)}>
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                Export to CSV
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                        placeholder="Search by quote name, number, or reference..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow"
                    />
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto">
                        <FilterIcon className="w-5 h-5 mr-2" />
                        Filters
                    </Button>
                </div>
                 {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border">
                        <div>
                            <label className="text-sm font-medium text-slate-600">Customer</label>
                            <Input list="customer-names-quote" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} placeholder="All customers" />
                            <datalist id="customer-names-quote">
                                {customerNames.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>
                         <div>
                            <label className="text-sm font-medium text-slate-600">From Date</label>
                            <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600">To Date</label>
                            <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" onClick={clearFilters} className="w-full">
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                )}
            </div>
             <div className="max-h-[65vh] overflow-y-auto pr-2">
                {sortedAndFilteredQuotes.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                         {quotes.length === 0 ? (
                            <>
                                <ChatBubbleBottomCenterTextIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">No quotes saved yet.</p>
                            </>
                         ) : (
                            <p className="text-sm text-slate-500">No quotes found for your search.</p>
                         )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px] space-y-3">
                            {sortedAndFilteredQuotes.map(quote => (
                                <div key={quote.id} className="flex justify-between items-center bg-slate-100 p-4 rounded-md">
                                    <div>
                                        <p className="font-semibold text-slate-800">{quote.name}</p>
                                        <p className="text-sm text-slate-500">
                                            Saved on {new Date(quote.createdAt).toLocaleDateString()}
                                            <span className="mx-2">|</span>
                                            Total: <span className="font-medium text-slate-600">{currency}{quote.total.toFixed(2)}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="primary" onClick={() => onConvertToInvoice(quote.id)}>
                                            Convert to Invoice
                                        </Button>
                                        <Button variant="outline" onClick={() => onLoadQuote(quote.id)}>
                                            Edit
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onOpenEmailModal(quote)} title="Send email" aria-label="Send Email">
                                            <EnvelopeIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDownloadQuote(quote.id)} title="Download PDF" aria-label="Download PDF">
                                            <DownloadIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onRemoveQuote(quote.id)} title="Delete quote">
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

export default QuoteManager;