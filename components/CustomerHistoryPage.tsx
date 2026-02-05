
import React, { useState, useMemo } from 'react';
import { Customer, Invoice, QuoteDraft, AppSettings, CreditNote, CustomerNote, CustomerReminder } from '../types';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { DownloadIcon } from './icons/DownloadIcon';
import PrintableStatement from './PrintableStatement';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { TrashIcon } from './icons/TrashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CustomerHistoryPageProps {
    customer: Customer;
    invoices: Invoice[];
    quotes: QuoteDraft[];
    creditNotes: CreditNote[];
    settings: AppSettings;
    onBack: () => void;
    onViewInvoice: (invoiceId: string) => void;
    onViewQuote: (quoteId: string) => void;
    onUpdateCustomer: (updatedCustomer: Customer) => void;
}

const CustomerHistoryPage: React.FC<CustomerHistoryPageProps> = ({ 
    customer, 
    invoices, 
    quotes, 
    creditNotes, 
    settings, 
    onBack, 
    onViewInvoice, 
    onViewQuote,
    onUpdateCustomer
}) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
    
    // Notes state
    const [newNote, setNewNote] = useState('');
    
    // Reminder state
    const [reminderText, setReminderText] = useState('');
    const [reminderDate, setReminderDate] = useState('');

    const currency = settings.currencySymbol || '£';

    const summaryTotals = useMemo(() => {
        const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalCredited = creditNotes.reduce((sum, cn) => sum + cn.total, 0);
        const totalPaid = invoices.reduce((sum, inv) => {
            const paidForThisInvoice = inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
            return sum + paidForThisInvoice;
        }, 0);
        const outstandingBalance = totalBilled - totalCredited - totalPaid;
        return { totalBilled: totalBilled - totalCredited, outstandingBalance };
    }, [invoices, creditNotes]);

    const getInvoiceStatus = (invoice: Invoice) => {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= invoice.total) return 'Paid';
        if (totalPaid > 0) return 'Partially Paid';
        return 'Unpaid';
    };

    const handleDownloadStatement = async () => {
        setIsPrinting(true);
        // Timeout to allow state to update and printable component to render
        await new Promise(resolve => setTimeout(resolve, 50)); 
        
        const printableElement = document.getElementById('printable-statement');
        if (printableElement) {
            const canvas = await html2canvas(printableElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`statement-${customer.name.replace(/\s/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`);
        }
        setIsPrinting(false);
    };

    // Note Handlers
    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const note: CustomerNote = {
            id: crypto.randomUUID(),
            content: newNote,
            date: new Date().toISOString(),
        };
        const updatedCustomer = {
            ...customer,
            notesHistory: [note, ...(customer.notesHistory || [])]
        };
        onUpdateCustomer(updatedCustomer);
        setNewNote('');
    };

    const handleDeleteNote = (noteId: string) => {
        if (!window.confirm('Delete this note?')) return;
        const updatedCustomer = {
            ...customer,
            notesHistory: (customer.notesHistory || []).filter(n => n.id !== noteId)
        };
        onUpdateCustomer(updatedCustomer);
    };

    // Reminder Handlers
    const handleAddReminder = () => {
        if (!reminderText.trim()) return;
        const reminder: CustomerReminder = {
            id: crypto.randomUUID(),
            text: reminderText,
            dueDate: reminderDate || new Date().toISOString().split('T')[0],
            isCompleted: false,
        };
        const updatedCustomer = {
            ...customer,
            reminders: [...(customer.reminders || []), reminder]
        };
        onUpdateCustomer(updatedCustomer);
        setReminderText('');
        setReminderDate('');
    };

    const handleToggleReminder = (reminderId: string) => {
        const updatedReminders = (customer.reminders || []).map(r => 
            r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r
        );
        onUpdateCustomer({ ...customer, reminders: updatedReminders });
    };

    const handleDeleteReminder = (reminderId: string) => {
        const updatedReminders = (customer.reminders || []).filter(r => r.id !== reminderId);
        onUpdateCustomer({ ...customer, reminders: updatedReminders });
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <Button variant="outline" onClick={onBack}>
                    &larr; Back to Customers
                </Button>
            </div>

            <div className="border-b pb-4 mb-6">
                <h2 className="text-3xl font-bold text-slate-800">{customer.name}</h2>
                {customer.contactName && <p className="text-lg text-slate-600">Attn: {customer.contactName}</p>}
                <p className="text-slate-500 whitespace-pre-wrap">{customer.address}</p>
                {customer.email && <p className="text-sm text-blue-600 mt-1">{customer.email}</p>}
                {customer.mobile && <p className="text-sm text-slate-600">{customer.mobile}</p>}
            </div>

            <div className="flex border-b mb-6">
                <button 
                    className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview & Notes
                </button>
                <button 
                    className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    Transactions & History
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Reminders & Quick Summary */}
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <p className="text-xs font-medium text-blue-600 uppercase">Net Billed</p>
                                <p className="text-2xl font-bold text-blue-900">{currency}{summaryTotals.totalBilled.toFixed(2)}</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg text-center">
                                <p className="text-xs font-medium text-red-600 uppercase">Outstanding</p>
                                <p className="text-2xl font-bold text-red-800">{currency}{summaryTotals.outstandingBalance.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Reminders</h3>
                            <div className="flex gap-2 mb-4">
                                <Input 
                                    placeholder="Reminder text..." 
                                    value={reminderText} 
                                    onChange={e => setReminderText(e.target.value)} 
                                    className="flex-grow"
                                />
                                <Input 
                                    type="date" 
                                    value={reminderDate} 
                                    onChange={e => setReminderDate(e.target.value)} 
                                    className="w-32"
                                />
                                <Button onClick={handleAddReminder} disabled={!reminderText.trim()}>Add</Button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {(customer.reminders || []).length === 0 && <p className="text-sm text-slate-500 italic">No reminders set.</p>}
                                {[...(customer.reminders || [])]
                                    .sort((a, b) => {
                                        if (a.isCompleted === b.isCompleted) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                                        return a.isCompleted ? 1 : -1;
                                    })
                                    .map(reminder => (
                                    <div key={reminder.id} className={`flex items-center justify-between p-2 rounded ${reminder.isCompleted ? 'bg-slate-100 opacity-75' : 'bg-white border'}`}>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleToggleReminder(reminder.id)} className={`text-slate-400 hover:text-green-600 transition-colors ${reminder.isCompleted ? 'text-green-600' : ''}`}>
                                                <CheckCircleIcon className="w-5 h-5" />
                                            </button>
                                            <div>
                                                <p className={`text-sm font-medium ${reminder.isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>{reminder.text}</p>
                                                <p className="text-xs text-slate-500">Due: {new Date(reminder.dueDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Button size="icon" variant="ghost" onClick={() => handleDeleteReminder(reminder.id)}>
                                            <TrashIcon className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Notes History */}
                    <div className="bg-slate-50 p-4 rounded-lg border h-full flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Notes History</h3>
                        <div className="mb-4">
                            <TextArea 
                                placeholder="Add a note about this customer..." 
                                value={newNote} 
                                onChange={e => setNewNote(e.target.value)} 
                                rows={2}
                            />
                            <div className="flex justify-end mt-2">
                                <Button onClick={handleAddNote} disabled={!newNote.trim()}>Post Note</Button>
                            </div>
                        </div>
                        <div className="space-y-4 overflow-y-auto flex-grow max-h-[500px] pr-2">
                            {(customer.notesHistory || []).length === 0 && <p className="text-sm text-slate-500 italic text-center py-4">No notes recorded yet.</p>}
                            {(customer.notesHistory || []).map(note => (
                                <div key={note.id} className="bg-white p-3 rounded border shadow-sm relative group">
                                    <p className="text-xs text-slate-500 mb-1">{new Date(note.date).toLocaleString()}</p>
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                                    <button 
                                        onClick={() => handleDeleteNote(note.id)} 
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                                        title="Delete Note"
                                    >
                                        <TrashIcon className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-4">Invoices</h3>
                            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
                                {invoices.length > 0 ? invoices.map(invoice => (
                                    <div key={invoice.id} className="bg-slate-100 p-3 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-slate-800">{invoice.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {new Date(invoice.createdAt).toLocaleDateString()} | {currency}{invoice.total.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={getInvoiceStatus(invoice)} />
                                                <Button variant="outline" className="!py-1 !px-2 text-xs" onClick={() => onViewInvoice(invoice.id)}>View</Button>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-slate-500">No invoices found for this customer.</p>}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-4">Credit Notes</h3>
                            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
                                {creditNotes.length > 0 ? creditNotes.map(cn => (
                                    <div key={cn.id} className="bg-slate-100 p-3 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-slate-800">{cn.state.creditNoteNumber}</p>
                                                <p className="text-sm text-slate-500">
                                                    {new Date(cn.createdAt).toLocaleDateString()} | {currency}{cn.total.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )) : <p className="text-slate-500">No credit notes found for this customer.</p>}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-4">Quotes</h3>
                            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
                                {quotes.length > 0 ? quotes.map(quote => (
                                    <div key={quote.id} className="bg-slate-100 p-3 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-slate-800">{quote.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {new Date(quote.createdAt).toLocaleDateString()} | {currency}{quote.total.toFixed(2)}
                                                </p>
                                            </div>
                                            <Button variant="outline" className="!py-1 !px-2 text-xs" onClick={() => onViewQuote(quote.id)}>View</Button>
                                        </div>
                                    </div>
                                )) : <p className="text-slate-500">No quotes found for this customer.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t">
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">Download Statement of Account</h3>
                        <div className="flex items-end gap-4 bg-slate-50 p-4 rounded-lg">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
                                <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-slate-600 mb-1">End Date</label>
                                <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <Button onClick={handleDownloadStatement} disabled={isPrinting}>
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                {isPrinting ? 'Generating...' : 'Download Statement'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isPrinting && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                    <PrintableStatement
                        id="printable-statement"
                        customer={customer}
                        invoices={invoices}
                        creditNotes={creditNotes}
                        settings={settings}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </div>
            )}
        </div>
    );
};

export default CustomerHistoryPage;
