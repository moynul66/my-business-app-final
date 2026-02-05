
import React, { useState, useMemo, useRef } from 'react';
import { Invoice, Payment, AppSettings, User, PaymentMethod, QuoteDraft, CreditNote, InvoiceDraft } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { TrashIcon } from './icons/TrashIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { StatusBadge } from './ui/StatusBadge';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';
import { Select } from './ui/Select';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { PencilIcon } from './icons/PencilIcon';
import { FilterIcon } from './icons/FilterIcon';

interface InvoicesManagerProps {
    invoices: Invoice[];
    drafts: InvoiceDraft[];
    creditNotes: CreditNote[];
    settings: AppSettings;
    currentUser: User;
    onAddPayment: (invoiceId: string, payment: Omit<Payment, 'id'>) => void;
    onRemovePayment: (invoiceId: string, paymentId: string) => void;
    onRemoveInvoice: (invoiceId: string) => void;
    onApplyCreditNote: (invoiceId: string, creditNoteId: string, amount: number) => void;
    onLoadInvoiceForEdit: (invoiceId: string) => void;
    onLoadInvoiceForCredit: (invoiceId: string) => void;
    onLoadDraft: (id: string) => void;
    onRemoveDraft: (id: string) => void;
    selectedInvoiceId: string | null;
    setSelectedInvoiceId: (id: string | null) => void;
    fromCustomerHistory: boolean;
    onBackToCustomerHistory: () => void;
    onDownloadInvoice: (invoiceId: string) => void;
    onOpenEmailModal: (doc: Invoice | QuoteDraft) => void;
}

const initialPaymentState = {
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: '',
    method: 'Bank Transfer' as PaymentMethod,
};

const InvoicesManager: React.FC<InvoicesManagerProps> = ({
    invoices,
    drafts,
    creditNotes,
    settings,
    currentUser,
    onAddPayment,
    onRemovePayment,
    onRemoveInvoice,
    onApplyCreditNote,
    onLoadInvoiceForEdit,
    onLoadInvoiceForCredit,
    onLoadDraft,
    onRemoveDraft,
    selectedInvoiceId,
    setSelectedInvoiceId,
    fromCustomerHistory,
    onBackToCustomerHistory,
    onDownloadInvoice,
    onOpenEmailModal
}) => {
    const [paymentFormData, setPaymentFormData] = useState(initialPaymentState);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState<'saved' | 'pending' | 'paid'>('pending');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [creditAmounts, setCreditAmounts] = useState<Record<string, number>>({});
    const currency = settings.currencySymbol || '£';

    const selectedInvoice = useMemo(() =>
        invoices.find(inv => inv.id === selectedInvoiceId) || null,
        [invoices, selectedInvoiceId]
    );

    const handleFormChange = (field: keyof typeof paymentFormData, value: string | number) => {
        setPaymentFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedInvoiceId && paymentFormData.amount > 0) {
            onAddPayment(selectedInvoiceId, {
                date: paymentFormData.date,
                amount: Number(paymentFormData.amount),
                notes: paymentFormData.notes,
                method: paymentFormData.method,
            });
            setPaymentFormData(initialPaymentState);
        }
    };
    
    const getAppliedCreditsTotal = (invoiceId: string) => {
        let total = 0;
        creditNotes.forEach(cn => {
            (cn.applications || []).forEach(app => {
                if (app.invoiceId === invoiceId) {
                    total += app.amount;
                }
            });
        });
        return total;
    };

    const getInvoiceStatus = (invoice: Invoice) => {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const totalCredited = getAppliedCreditsTotal(invoice.id);
        const netTotalDue = invoice.total - totalCredited;

        if (netTotalDue <= 0.001) return 'Paid';
        if (totalPaid >= netTotalDue - 0.001) return 'Paid';
        if (totalPaid > 0) return 'Partially Paid';
        return 'Unpaid';
    };

    const customerNames = useMemo(() => {
        const names = new Set(invoices.map(inv => inv.state.customerName));
        drafts.forEach(d => names.add(d.state.customerName));
        return Array.from(names);
    }, [invoices, drafts]);

    const sortedAndFilteredDocuments = useMemo(() => {
        let docsToFilter: (Invoice | (InvoiceDraft & { isDraft: true }))[];

        if (activeTab === 'saved') {
            docsToFilter = drafts.map(d => ({ ...d, isDraft: true as const }));
        } else {
            const finalizedInvoices = invoices;
            if (activeTab === 'pending') {
                docsToFilter = finalizedInvoices.filter(inv => {
                    const status = getInvoiceStatus(inv);
                    return status === 'Unpaid' || status === 'Partially Paid';
                });
            } else { // 'paid'
                docsToFilter = finalizedInvoices.filter(inv => getInvoiceStatus(inv) === 'Paid');
            }
        }
        
        let filtered = docsToFilter;

        // Apply shared filters
        if (filterCustomer) {
            filtered = filtered.filter(doc => doc.state.customerName.toLowerCase().includes(filterCustomer.toLowerCase()));
        }

        if (filterStartDate) {
            const start = new Date(filterStartDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(doc => new Date(doc.state.issueDate) >= start);
        }
        if (filterEndDate) {
            const end = new Date(filterEndDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(doc => new Date(doc.state.issueDate) <= end);
        }
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(doc =>
                doc.name.toLowerCase().includes(lowercasedTerm) ||
                doc.state.invoiceNumber.toLowerCase().includes(lowercasedTerm) ||
                doc.state.reference.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    }, [invoices, drafts, creditNotes, searchTerm, activeTab, filterCustomer, filterStartDate, filterEndDate]);

    const clearFilters = () => {
        setFilterCustomer('');
        setFilterStartDate('');
        setFilterEndDate('');
        setSearchTerm('');
    };

    const TabButton: React.FC<{
        tab: 'saved' | 'pending' | 'paid';
        label: string;
    }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
            {label}
        </button>
    );

    const renderInvoiceList = () => (
        <>
            <div className="border-b border-slate-200 mb-4">
                <div className="flex -mb-px">
                    <TabButton tab="saved" label="Saved" />
                    <TabButton tab="pending" label="Payment Pending" />
                    <TabButton tab="paid" label="Paid" />
                </div>
            </div>

            <div className="mb-4">
                 <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                        placeholder="Search by invoice #, reference, or customer name..."
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
                            <Input list="customer-names" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} placeholder="All customers" />
                            <datalist id="customer-names">
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
            <div className="max-h-[65vh] overflow-y-auto space-y-3 pr-2">
                {sortedAndFilteredDocuments.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        {invoices.length === 0 && drafts.length === 0 ? (
                             <>
                                <CreditCardIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">No finalized invoices or drafts yet.</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No documents found for the selected filters.</p>
                        )}
                    </div>
                ) : (
                    sortedAndFilteredDocuments.map(doc => {
                        const isDraft = 'isDraft' in doc && doc.isDraft;

                        if (isDraft) {
                            return (
                                <div key={doc.id} className="bg-slate-100 p-4 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-800">{doc.name}</p>
                                            <p className="text-sm text-slate-500">
                                                Saved on {new Date(doc.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status="Draft" />
                                            <Button variant="outline" onClick={() => onLoadDraft(doc.id)}>
                                                <PencilIcon className="w-4 h-4 mr-2"/> Edit
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onRemoveDraft(doc.id)} title="Delete draft">
                                                <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm">
                                        <p className="text-slate-800 col-span-3"><strong>Total:</strong> <span className="font-medium text-slate-600">{currency}{doc.total.toFixed(2)}</span></p>
                                    </div>
                                </div>
                            );
                        }
                        
                        const invoice = doc as Invoice;
                        const status = getInvoiceStatus(invoice);
                        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
                        const totalCredited = getAppliedCreditsTotal(invoice.id);
                        const balanceDue = invoice.total - totalCredited - totalPaid;
                        return (
                            <div key={invoice.id} className="bg-slate-100 p-4 rounded-md">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-y-3">
                                    <div>
                                        <p className="font-semibold text-slate-800">{invoice.name}</p>
                                        <p className="text-sm text-slate-500">
                                            Created on {new Date(invoice.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
                                        <StatusBadge status={status} />
                                        <Button variant="outline" className="!py-1 !px-2 text-xs" onClick={() => onLoadInvoiceForCredit(invoice.id)}>Credit Note</Button>
                                        <Button variant="outline" className="!py-1 !px-2 text-xs" onClick={() => onLoadInvoiceForEdit(invoice.id)}>
                                            <PencilIcon className="w-4 h-4 mr-1.5"/> Edit
                                        </Button>
                                        <Button variant="outline" className="!py-1 !px-2 text-xs" onClick={() => onOpenEmailModal(invoice)}>
                                            <EnvelopeIcon className="w-4 h-4 mr-1.5"/> Email
                                        </Button>
                                        <Button variant="outline" className="!py-1 !px-2 text-xs" onClick={() => onDownloadInvoice(invoice.id)}>
                                            <DownloadIcon className="w-4 h-4 mr-1.5"/> PDF
                                        </Button>
                                        <Button variant="primary" className="!py-1 !px-2 text-xs" onClick={() => setSelectedInvoiceId(invoice.id)}>
                                            Manage Payments
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onRemoveInvoice(invoice.id)} title="Delete invoice">
                                            <TrashIcon className="w-5 h-5 text-slate-400 hover:text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm">
                                    <p className="text-slate-800"><strong>Total:</strong> <span className="font-medium text-slate-600">{currency}{invoice.total.toFixed(2)}</span></p>
                                    <p className="text-slate-800"><strong>Paid:</strong> <span className="font-medium text-green-600">{currency}{totalPaid.toFixed(2)}</span></p>
                                    <p className="text-slate-800"><strong>Balance:</strong> <span className="font-medium text-red-600">{currency}{balanceDue.toFixed(2)}</span></p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );

    const renderPaymentManager = () => {
        if (!selectedInvoice) return null;
        
        const totalPaid = selectedInvoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const totalCredited = getAppliedCreditsTotal(selectedInvoice.id);
        const balanceDue = selectedInvoice.total - totalCredited - totalPaid;

        const availableCreditNotes = creditNotes
            .filter(cn => cn.state.customerName === selectedInvoice.state.customerName)
            .map(cn => {
                const applied = (cn.applications || []).reduce((sum, app) => sum + app.amount, 0);
                const remaining = cn.total - applied;
                return { ...cn, remaining };
            })
            .filter(cn => cn.remaining > 0.001);

        const handleApply = (creditNoteId: string) => {
            const amountToApply = creditAmounts[creditNoteId] || 0;
            if (amountToApply <= 0) return;
            
            const creditNote = availableCreditNotes.find(cn => cn.id === creditNoteId);
            if (!creditNote) return;

            if (amountToApply > creditNote.remaining) {
                alert('Amount to apply cannot exceed the remaining credit on the note.');
                return;
            }
            if (amountToApply > balanceDue) {
                alert('Amount to apply cannot exceed the invoice balance due.');
                return;
            }

            onApplyCreditNote(selectedInvoice.id, creditNoteId, amountToApply);
            setCreditAmounts(prev => ({ ...prev, [creditNoteId]: 0 }));
        };


        return (
            <div>
                 {fromCustomerHistory ? (
                    <Button variant="outline" onClick={onBackToCustomerHistory} className="mb-4">
                        &larr; Back to Statements
                    </Button>
                ) : (
                    <Button variant="outline" onClick={() => setSelectedInvoiceId(null)} className="mb-4">
                        &larr; Back to All Invoices
                    </Button>
                )}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{selectedInvoice.name}</h3>
                <div className="mb-4 flex items-center gap-4 text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <span>Total: <span className="font-medium text-slate-800">{currency}{selectedInvoice.total.toFixed(2)}</span></span>
                    <span className="w-px h-4 bg-slate-200"></span>
                    <span>Paid: <span className="font-medium text-green-600">{currency}{totalPaid.toFixed(2)}</span></span>
                     <span className="w-px h-4 bg-slate-200"></span>
                    <span>Credited: <span className="font-medium text-orange-600">{currency}{totalCredited.toFixed(2)}</span></span>
                    <span className="w-px h-4 bg-slate-200"></span>
                    <span>Balance: <span className="font-medium text-red-600">{currency}{balanceDue.toFixed(2)}</span></span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-6">
                        <div>
                            <h4 className="font-medium mb-4">Record a New Payment</h4>
                            <form onSubmit={handleAddPayment} className="space-y-4 bg-slate-50 p-4 rounded-lg">
                                <div>
                                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-slate-600">Amount ({currency})</label>
                                    <Input id="paymentAmount" type="number" step="0.01" value={paymentFormData.amount} onChange={e => handleFormChange('amount', parseFloat(e.target.value) || 0)} required />
                                </div>
                                <div>
                                    <label htmlFor="paymentDate" className="block text-sm font-medium text-slate-600">Date</label>
                                    <Input id="paymentDate" type="date" value={paymentFormData.date} onChange={e => handleFormChange('date', e.target.value)} required />
                                </div>
                                <div>
                                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-600">Payment Method</label>
                                    <Select id="paymentMethod" value={paymentFormData.method} onChange={e => handleFormChange('method', e.target.value as PaymentMethod)} required>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card Payment">Card Payment</option>
                                        <option value="Online Payment">Online Payment</option>
                                    </Select>
                                </div>
                                <div>
                                    <label htmlFor="paymentNotes" className="block text-sm font-medium text-slate-600">Notes (Optional)</label>
                                    <TextArea id="paymentNotes" value={paymentFormData.notes} onChange={e => handleFormChange('notes', e.target.value)} rows={2} />
                                </div>
                                <Button type="submit" variant="primary" className="w-full">Record Payment</Button>
                            </form>
                        </div>
                        {availableCreditNotes.length > 0 && balanceDue > 0.001 && (
                            <div>
                                <h4 className="font-medium mb-4">Apply Available Credit</h4>
                                <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                                    {availableCreditNotes.map(cn => (
                                        <div key={cn.id}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium text-slate-700">{cn.state.creditNoteNumber}</span>
                                                <span className="text-slate-500">Available: {currency}{cn.remaining.toFixed(2)}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input 
                                                    type="number" 
                                                    step="0.01"
                                                    max={Math.min(cn.remaining, balanceDue)}
                                                    value={creditAmounts[cn.id] || ''}
                                                    onChange={e => setCreditAmounts(prev => ({ ...prev, [cn.id]: parseFloat(e.target.value) || 0 }))}
                                                    placeholder="Amount to apply"
                                                />
                                                <Button variant="outline" onClick={() => handleApply(cn.id)}>Apply</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="md:col-span-2">
                        <h4 className="font-medium mb-4">Payment History</h4>
                         <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                             {selectedInvoice.payments.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No payments recorded yet.</p>
                             ) : (
                                [...selectedInvoice.payments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                                     <div key={payment.id} className="flex justify-between items-center bg-slate-100 p-3 rounded-md">
                                        <div>
                                            <p className="font-semibold text-slate-800">{currency}{payment.amount.toFixed(2)}</p>
                                            <p className="text-sm text-slate-500">{new Date(payment.date).toLocaleDateString()} via {payment.method}</p>
                                            {payment.notes && <p className="text-xs text-slate-500 mt-1 italic">"{payment.notes}"</p>}
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => onRemovePayment(selectedInvoice.id, payment.id)} title="Delete payment">
                                            <TrashIcon className="w-5 h-5 text-slate-400 hover:text-red-500" />
                                        </Button>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Manage Invoices</h2>
                 {!selectedInvoice && (
                    <div className="flex gap-2">
                        {!currentUser.subscriptionStatus.startsWith('trial_') && (
                            <>
                                <Button variant="outline" onClick={() => exportToCsv('invoices-backup.csv', invoices)}>
                                    <DownloadIcon className="w-5 h-5 mr-2" />
                                    Export to CSV
                                </Button>
                            </>
                        )}
                    </div>
                 )}
            </div>
            {selectedInvoice ? renderPaymentManager() : renderInvoiceList()}
        </div>
    );
};

export default InvoicesManager;
