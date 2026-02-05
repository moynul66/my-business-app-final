import React, { useState, useMemo } from 'react';
import { Supplier, PurchaseOrder, Bill, AppSettings } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';

interface PaidToSuppliersProps {
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    bills: Bill[];
    settings: AppSettings;
    onDownloadPdf: (data: any, type: string) => void;
}

const PaidToSuppliers: React.FC<PaidToSuppliersProps> = ({ suppliers, purchaseOrders, bills, settings, onDownloadPdf }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const reportData = useMemo(() => {
        const supplierIdsInPeriod = new Set<string>();
        if (startDate || endDate) {
            const allPurchases = [...purchaseOrders, ...bills];
            allPurchases.forEach(purchase => {
                if (!purchase.state.supplierId && !purchase.state.supplierName) return;

                const issueDate = new Date(purchase.state.issueDate);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                let inRange = true;
                if (start && issueDate < start) inRange = false;
                if (end && issueDate > end) inRange = false;

                if (inRange) {
                    const supplier = suppliers.find(s => s.id === purchase.state.supplierId || s.name === purchase.state.supplierName);
                    if (supplier) {
                        supplierIdsInPeriod.add(supplier.id);
                    }
                }
            });
        }

        const suppliersToShow = (startDate || endDate)
            ? suppliers.filter(s => supplierIdsInPeriod.has(s.id))
            : suppliers;

        return suppliersToShow.map(supplier => {
            const supplierPOs = purchaseOrders.filter(po => po.state.supplierId === supplier.id || po.state.supplierName === supplier.name);
            const supplierBills = bills.filter(b => b.state.supplierId === supplier.id || b.state.supplierName === supplier.name);
            
            const totalBilled = 
                supplierPOs.reduce((sum, po) => sum + po.total, 0) +
                supplierBills.reduce((sum, b) => sum + b.total, 0);
            
            const totalPaid = 
                supplierBills.reduce((sum, b) => sum + (b.payments || []).reduce((pSum, p) => pSum + p.amount, 0), 0) +
                supplierPOs.reduce((sum, po) => sum + (po.payments || []).reduce((pSum, p) => pSum + p.amount, 0), 0);

            const outstanding = totalBilled - totalPaid;

            return {
                id: supplier.id,
                name: supplier.name,
                totalBilled,
                totalPaid,
                outstanding,
            };
        });
    }, [suppliers, purchaseOrders, bills, startDate, endDate]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return reportData;
        const lowercasedTerm = searchTerm.toLowerCase();
        return reportData.filter(row => row.name.toLowerCase().includes(lowercasedTerm));
    }, [reportData, searchTerm]);

    const handleDownloadCsv = () => {
        const csvData = filteredData.map(row => ({
            'Supplier Name': row.name,
            'Total Billed': row.totalBilled.toFixed(2),
            'Total Paid': row.totalPaid.toFixed(2),
            'Outstanding Balance': row.outstanding.toFixed(2),
        }));
        exportToCsv(`Paid_to_Suppliers_${new Date().toISOString().split('T')[0]}.csv`, csvData);
    };

    const handleDownloadPdf = () => {
        onDownloadPdf({ reportData: filteredData, settings, startDate, endDate }, 'paid-to-suppliers-report');
    };

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-lg items-end">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
                    <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-600 mb-1">End Date</label>
                    <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <Button variant="primary" onClick={handleDownloadCsv}><DownloadIcon className="w-4 h-4 mr-2" />CSV</Button>
                <Button variant="primary" onClick={handleDownloadPdf}><DownloadIcon className="w-4 h-4 mr-2" />PDF</Button>
            </div>
            
            <div className="mb-4">
                <Input 
                    id="supplierSearch" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search displayed suppliers by name..."
                />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left table-auto">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 text-sm">
                            <th className="p-3 font-semibold">Supplier Name</th>
                            <th className="p-3 font-semibold text-right">Total Billed</th>
                            <th className="p-3 font-semibold text-right">Total Paid</th>
                            <th className="p-3 font-semibold text-right">Outstanding Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(row => (
                            <tr key={row.id} className="border-b hover:bg-slate-50">
                                <td className="p-3 text-slate-800">{row.name}</td>
                                <td className="p-3 text-right text-slate-800">{formatCurrency(row.totalBilled)}</td>
                                <td className="p-3 text-right font-medium text-green-600">{formatCurrency(row.totalPaid)}</td>
                                <td className="p-3 text-right font-medium text-red-600">{formatCurrency(row.outstanding)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && <p className="text-center text-slate-500 py-8">No suppliers match your search for the selected period.</p>}
            </div>
        </div>
    );
};

export default PaidToSuppliers;