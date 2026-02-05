import React, { useState, useMemo, useRef } from 'react';
import { PurchaseOrder, AppSettings, User, PaymentMethod, Payment } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { exportToCsv, parseCsv } from '../services/csvService';
import { StatusBadge } from './ui/StatusBadge';
import { Select } from './ui/Select';
import { TextArea } from './ui/TextArea';

interface PurchaseOrderManagerProps {
    purchaseOrders: PurchaseOrder[];
    settings: AppSettings;
    currentUser: User;
    onLoadPO: (id: string) => void;
    onRemovePO: (id: string) => void;
    onImportPOs: (data: any[]) => void;
    onDownloadPO: (id: string) => void;
    onAddPayment: (poId: string, payment: Omit<Payment, 'id'>) => void;
    onRemovePayment: (poId: string, paymentId: string) => void;
}

const initialPaymentState = {
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: '',
    method: 'Bank Transfer' as PaymentMethod,
};

const PurchaseOrderManager: React.FC<PurchaseOrderManagerProps> = ({
    purchaseOrders,
    settings,
    currentUser,
    onLoadPO,
    onRemovePO,
    onImportPOs,
    onDownloadPO,
    onAddPayment,
    onRemovePayment
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
    const [paymentFormData, setPaymentFormData] = useState(initialPaymentState);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currency = settings.currencySymbol || '£';

    const selectedPO = useMemo(() =>
        purchaseOrders.find(po => po.id === selectedPOId) || null,
        [purchaseOrders, selectedPOId]
    );

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (window.confirm("Are you sure? This will overwrite all existing purchase orders.")) {
            try {
                const parsedData = await parseCsv<PurchaseOrder>(file);
                onImportPOs(parsedData);
            } catch (error) {
                alert("Failed to import purchase orders.");
            }
        }
        event.target.value = '';
    };

    const handleFormChange = (field: keyof typeof paymentFormData, value: string | number) => {
        setPaymentFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPOId && paymentFormData.amount > 0) {
            onAddPayment(selectedPOId, {
                date: paymentFormData.date,
                amount: Number(paymentFormData.amount),
                notes: paymentFormData.notes,
                method: paymentFormData.method,
            });
            setPaymentFormData(initialPaymentState);
        }
    };

    const sortedAndFilteredPOs = useMemo(() => {
        const sorted = [...purchaseOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!searchTerm) return sorted;
        
        const lowercasedTerm = searchTerm.toLowerCase();
        return sorted.filter(po =>
            po.name.toLowerCase().includes(lowercasedTerm) ||
            po.state.poNumber.toLowerCase().includes(lowercasedTerm) ||
            (po.state.reference && po.state.reference.toLowerCase().includes(lowercasedTerm)) ||
            po.state.supplierName.toLowerCase().includes(lowercasedTerm)
        );
    }, [purchaseOrders, searchTerm]);
    
    const renderPOList = () => (
        <>
            <div className="mb-4">
                <Input
                    placeholder="Search by PO #, reference, supplier name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="max-h-[65vh] overflow-y-auto pr-2">
                {sortedAndFilteredPOs.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        {purchaseOrders.length === 0 ? (
                            <>
                                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">No purchase orders created yet.</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No purchase orders found for your search.</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px] space-y-3">
                            {sortedAndFilteredPOs.map(po => (
                                <div key={po.id} className="bg-slate-100 p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-slate-800">{po.name}</p>
                                            <p className="text-sm text-slate-500">
                                                Created on {new Date(po.createdAt).toLocaleDateString()}
                                                <span className="mx-2">|</span>
                                                Total: <span className="font-medium text-slate-600">{currency}{po.total.toFixed(2)}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={po.status === 'approved' ? 'Approved' : 'Draft'} />
                                            {po.status === 'approved' && (
                                                <Button variant="outline" onClick={() => setSelectedPOId(po.id)}>
                                                    Manage Payments
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => onDownloadPO(po.id)} title="Download PDF" aria-label="Download PDF">
                                                <DownloadIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onLoadPO(po.id)} title="Edit purchase order" aria-label="Edit PO">
                                                <PencilIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onRemovePO(po.id)} title="Delete purchase order" aria-label="Delete PO">
                                                <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );

    const renderPaymentManager = () => {
        if (!selectedPO) return null;
        
        const totalPaid = (selectedPO.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const balanceDue = selectedPO.total - totalPaid;

        return (
            <div>
                <Button variant="outline" onClick={() => setSelectedPOId(null)} className="mb-4">
                    &larr; Back to All Purchase Orders
                </Button>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{selectedPO.name}</h3>
                <div className="mb-4 flex items-center gap-4 text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <span>Total: <span className="font-medium text-slate-800">{currency}{selectedPO.total.toFixed(2)}</span></span>
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
                             {(selectedPO.payments || []).length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No payments recorded yet.</p>
                             ) : (
                                [...(selectedPO.payments || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                                     <div key={payment.id} className="flex justify-between items-center bg-slate-100 p-3 rounded-md">
                                        <div>
                                            <p className="font-semibold text-slate-800">{currency}{payment.amount.toFixed(2)}</p>
                                            <p className="text-sm text-slate-500">{new Date(payment.date).toLocaleDateString()} via {payment.method}</p>
                                            {payment.notes && <p className="text-xs text-slate-500 mt-1 italic">"{payment.notes}"</p>}
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => onRemovePayment(selectedPO.id, payment.id)} title="Delete payment">
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
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Manage Purchase Orders</h2>
                 {!selectedPO && (
                    <div className="flex gap-2">
                        {!currentUser.subscriptionStatus.startsWith('trial_') && (
                            <>
                                <Button variant="outline" onClick={() => exportToCsv('purchase-orders-backup.csv', purchaseOrders)}>
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
            {selectedPO ? renderPaymentManager() : renderPOList()}
        </div>
    );
};

export default PurchaseOrderManager;