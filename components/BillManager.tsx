
import React, { useState, useMemo, useRef } from 'react';
import { Bill, AppSettings, User, Payment, PaymentMethod } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { exportToCsv, parseCsv } from '../services/csvService';
import { StatusBadge } from './ui/StatusBadge';
import { Select } from './ui/Select';
import { TextArea } from './ui/TextArea';

interface BillManagerProps {
    bills: Bill[];
    settings: AppSettings;
    currentUser: User;
    onLoadBill: (id: string) => void;
    onRemoveBill: (id: string) => void;
    onImportBills: (data: any[]) => void;
    onAddPayment: (billId: string, payment: Omit<Payment, 'id'>) => void;
    onRemovePayment: (billId: string, paymentId: string) => void;
}

const initialPaymentState = {
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: '',
    method: 'Bank Transfer' as PaymentMethod,
};

const BillManager: React.FC<BillManagerProps> = ({
    bills,
    settings,
    currentUser,
    onLoadBill,
    onRemoveBill,
    onImportBills,
    onAddPayment,
    onRemovePayment
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
    const [paymentFormData, setPaymentFormData] = useState(initialPaymentState);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currency = settings.currencySymbol || '£';

    const selectedBill = useMemo(() =>
        bills.find(bill => bill.id === selectedBillId) || null,
        [bills, selectedBillId]
    );

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (window.confirm("Are you sure? This will overwrite all existing bills.")) {
            try {
                const parsedData = await parseCsv<Bill>(file);
                onImportBills(parsedData);
            } catch (error) {
                alert("Failed to import bills.");
            }
        }
        event.target.value = '';
    };

    const handleFormChange = (field: keyof typeof paymentFormData, value: string | number) => {
        setPaymentFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBillId && paymentFormData.amount > 0) {
            onAddPayment(selectedBillId, {
                date: paymentFormData.date,
                amount: Number(paymentFormData.amount),
                notes: paymentFormData.notes,
                method: paymentFormData.method,
            });
            setPaymentFormData(initialPaymentState);
        }
    };

    const sortedAndFilteredBills = useMemo(() => {
        const sorted = [...bills].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!searchTerm) return sorted;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return sorted.filter(bill =>
            (bill.state.reference && bill.state.reference.toLowerCase().includes(lowercasedTerm)) ||
            bill.state.supplierName.toLowerCase().includes(lowercasedTerm)
        );
    }, [bills, searchTerm]);

    const getBillStatus = (bill: Bill) => {
        const totalPaid = (bill.payments || []).reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid >= bill.total) return 'Paid';
        if (totalPaid > 0) return 'Partially Paid';
        return 'Unpaid';
    };

    const renderBillList = () => (
        <>
            <div className="mb-4">
                <Input
                    placeholder="Search by supplier name or reference #"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="max-h-[65vh] overflow-y-auto pr-2">
                {sortedAndFilteredBills.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        {bills.length === 0 ? (
                            <>
                                <ReceiptIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">No bills recorded yet.</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No bills found for your search.</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px] space-y-3">
                            {sortedAndFilteredBills.map(bill => {
                                const status = getBillStatus(bill);
                                const totalPaid = (bill.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                const balanceDue = bill.total - totalPaid;

                                return (
                                <div key={bill.id} className="bg-slate-100 p-4 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-800">{bill.state.supplierName} - <span className="font-normal">Ref: {bill.state.reference}</span></p>
                                            <p className="text-sm text-slate-500">
                                                Dated {new Date(bill.state.issueDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={status} />
                                            <Button variant="outline" onClick={() => setSelectedBillId(bill.id)}>
                                                Manage Payments
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onLoadBill(bill.id)} title="Edit bill" aria-label="Edit Bill">
                                                <PencilIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onRemoveBill(bill.id)} title="Delete bill" aria-label="Delete Bill">
                                                <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm">
                                        <p className="text-slate-800"><strong>Total:</strong> <span className="font-medium text-slate-600">{currency}{bill.total.toFixed(2)}</span></p>
                                        <p className="text-slate-800"><strong>Paid:</strong> <span className="font-medium text-green-600">{currency}{totalPaid.toFixed(2)}</span></p>
                                        <p className="text-slate-800"><strong>Balance:</strong> <span className="font-medium text-red-600">{currency}{balanceDue.toFixed(2)}</span></p>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    const renderPaymentManager = () => {
        if (!selectedBill) return null;
        
        const totalPaid = (selectedBill.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const balanceDue = selectedBill.total - totalPaid;

        return (
            <div>
                <Button variant="outline" onClick={() => setSelectedBillId(null)} className="mb-4">
                    &larr; Back to All Bills
                </Button>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{selectedBill.state.supplierName} - Ref: {selectedBill.state.reference}</h3>
                <div className="mb-4 flex items-center gap-4 text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <span>Total: <span className="font-medium text-slate-800">{currency}{selectedBill.total.toFixed(2)}</span></span>
                    <span className="w-px h-4 bg-slate-200"></span>
                    <span>Paid: <span className="font-medium text-green-600">{currency}{totalPaid.toFixed(2)}</span></span>
                    <span className="w-px h-4 bg-slate-200"></span>
                    <span>Balance: <span className="font-medium text-red-600">{currency}{balanceDue.toFixed(2)}</span></span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
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
                     <div className="md:col-span-2">
                        <h4 className="font-medium mb-4">Payment History</h4>
                         <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                             {(selectedBill.payments || []).length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No payments recorded yet.</p>
                             ) : (
                                [...(selectedBill.payments || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                                     <div key={payment.id} className="flex justify-between items-center bg-slate-100 p-3 rounded-md">
                                        <div>
                                            <p className="font-semibold text-slate-800">{currency}{payment.amount.toFixed(2)}</p>
                                            <p className="text-sm text-slate-500">{new Date(payment.date).toLocaleDateString()} via {payment.method}</p>
                                            {payment.notes && <p className="text-xs text-slate-500 mt-1 italic">"{payment.notes}"</p>}
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => onRemovePayment(selectedBill.id, payment.id)} title="Delete payment">
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
                <h2 className="text-3xl font-bold text-slate-800">Manage Bills</h2>
                {!selectedBill && (
                <div className="flex gap-2">
                    {!currentUser.subscriptionStatus.startsWith('trial_') && (
                        <>
                            <Button variant="outline" onClick={() => exportToCsv('bills-backup.csv', bills)}>
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                Export to CSV
                            </Button>
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <UploadIcon className="w-5 h-5 mr-2" />
                                Import from CSV
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileImport}
                                accept=".csv"
                                style={{ display: 'none' }}
                            />
                        </>
                    )}
                </div>
                )}
            </div>
            {selectedBill ? renderPaymentManager() : renderBillList()}
        </div>
    );
};

export default BillManager;