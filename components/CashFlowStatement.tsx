import React, { useState, useMemo } from 'react';
import { Invoice, Bill, AppSettings, PurchaseOrder, MarketplaceStatement } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';

interface CashFlowStatementProps {
    invoices: Invoice[];
    bills: Bill[];
    purchaseOrders: PurchaseOrder[];
    marketplaceStatements: MarketplaceStatement[];
    settings: AppSettings;
    onDownloadPdf: (data: any, type: string) => void;
}

const CashFlowStatement: React.FC<CashFlowStatementProps> = ({ invoices, bills, purchaseOrders, marketplaceStatements, settings, onDownloadPdf }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const reportData = useMemo(() => {
        const filterByDate = (paymentDate: string): boolean => {
            const date = new Date(paymentDate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);
            
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        };
        
        const invoicePayments = invoices.flatMap(inv => inv.payments || []);
        
        const cashInflowsFromInvoices = invoicePayments
            .filter(p => filterByDate(p.date))
            .reduce((sum, p) => sum + p.amount, 0);

        const marketplaceInflows = marketplaceStatements
            .filter(s => filterByDate(s.endDate))
            .reduce((sum, s) => sum + s.orders + (s.adjustments > 0 ? s.adjustments : 0), 0);
        
        const cashInflows = cashInflowsFromInvoices + marketplaceInflows;

        const incomeByMethod = {
            cash: invoicePayments.filter(p => filterByDate(p.date) && p.method === 'Cash').reduce((sum, p) => sum + p.amount, 0),
            card: invoicePayments.filter(p => filterByDate(p.date) && p.method === 'Card Payment').reduce((sum, p) => sum + p.amount, 0),
            bank: invoicePayments.filter(p => filterByDate(p.date) && p.method === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0),
            online: invoicePayments.filter(p => filterByDate(p.date) && p.method === 'Online Payment').reduce((sum, p) => sum + p.amount, 0) + marketplaceInflows,
        };
            
        const billPayments = bills.flatMap(bill => bill.payments || []);
        const poPayments = purchaseOrders.flatMap(po => po.payments || []);

        const cashOutflowsFromPurchases = [...billPayments, ...poPayments]
            .filter(p => filterByDate(p.date))
            .reduce((sum, p) => sum + p.amount, 0);
        
        const cashOutflows = cashOutflowsFromPurchases;

        const netCashFlow = cashInflows - cashOutflows;

        return { cashInflows, cashOutflows, netCashFlow, incomeByMethod };
    }, [invoices, bills, purchaseOrders, marketplaceStatements, startDate, endDate]);

    const handleDownloadCsv = () => {
        const data = [
            { Item: 'CASH / CARD SUMMARY', Value: '' },
            { Item: 'Period', Value: `${startDate || 'Start'} to ${endDate || 'End'}` },
            {},
            { Item: 'Cash Inflows', Value: reportData.cashInflows.toFixed(2) },
            { Item: '...from Cash', Value: reportData.incomeByMethod.cash.toFixed(2) },
            { Item: '...from Card', Value: reportData.incomeByMethod.card.toFixed(2) },
            { Item: '...from Bank Transfer', Value: reportData.incomeByMethod.bank.toFixed(2) },
            { Item: '...from Online Payment', Value: reportData.incomeByMethod.online.toFixed(2) },
            { Item: 'Cash Outflows (from Bill/PO Payments)', Value: reportData.cashOutflows.toFixed(2) },
            {},
            { Item: 'Net Cash Flow', Value: reportData.netCashFlow.toFixed(2) },
        ];
        exportToCsv(`Cash_Summary_${startDate || 'start'}_to_${endDate || 'end'}.csv`, data);
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
                <Button variant="primary" onClick={() => onDownloadPdf({ reportData, startDate, endDate, settings }, 'cash-flow-report')}><DownloadIcon className="w-4 h-4 mr-2" />PDF</Button>
            </div>
            
             <div className="space-y-6">
                <div className="p-6 rounded-lg bg-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-4 rounded">
                            <p className="text-sm font-medium text-green-700">Cash Inflows</p>
                            <p className="text-2xl font-bold text-green-900 mb-2">{formatCurrency(reportData.cashInflows)}</p>
                            <div className="text-xs text-left space-y-1">
                                <p><strong>Cash:</strong> {formatCurrency(reportData.incomeByMethod.cash)}</p>
                                <p><strong>Card:</strong> {formatCurrency(reportData.incomeByMethod.card)}</p>
                                <p><strong>Bank:</strong> {formatCurrency(reportData.incomeByMethod.bank)}</p>
                                <p><strong>Online:</strong> {formatCurrency(reportData.incomeByMethod.online)}</p>
                            </div>
                        </div>
                        <div className="bg-red-50 p-4 rounded">
                            <p className="text-sm font-medium text-red-700">Cash Outflows</p>
                            <p className="text-2xl font-bold text-red-900">{formatCurrency(reportData.cashOutflows)}</p>
                            <p className="text-xs text-slate-500 mt-2">From Bill & PO Payments</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded">
                            <p className="text-sm font-medium text-blue-700">Net Cash Flow</p>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(reportData.netCashFlow)}</p>
                            <p className="text-xs text-slate-500 mt-2">For the selected period</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashFlowStatement;