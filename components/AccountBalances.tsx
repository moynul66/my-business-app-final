import React, { useState, useMemo } from 'react';
import { Invoice, Bill, AppSettings, PurchaseOrder, MarketplaceStatement, MarketplaceAccount, InventoryItem, TaxMode, BillLineItem, PurchaseOrderLineItem } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';
import { calculateBasePrice } from '../services/conversionService';

interface AccountBalancesProps {
    invoices: Invoice[];
    bills: Bill[];
    purchaseOrders: PurchaseOrder[];
    marketplaceStatements: MarketplaceStatement[];
    marketplaceAccounts: MarketplaceAccount[];
    settings: AppSettings;
    onDownloadPdf: (data: any, type: string) => void;
    inventory: InventoryItem[];
}

const AccountBalances: React.FC<AccountBalancesProps> = ({ invoices, bills, purchaseOrders, marketplaceStatements, marketplaceAccounts, settings, onDownloadPdf, inventory }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startBalance, setStartBalance] = useState(0);
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const reportData = useMemo(() => {
        const filterByPaymentDate = (paymentDate: string): boolean => {
            const date = new Date(paymentDate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);
            
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
        };
        
        const incomeTransactions = invoices.flatMap(inv => 
            (inv.payments || [])
                .filter(p => filterByPaymentDate(p.date))
                .map(p => ({
                    date: p.date,
                    description: `Payment from ${inv.state.customerName} (Inv #${inv.state.invoiceNumber})`,
                    amount: p.amount,
                    type: 'income' as const,
                    method: p.method
                }))
        );
            
        const billExpenseTransactions = bills.flatMap(bill => 
            (bill.payments || [])
                .filter(p => filterByPaymentDate(p.date))
                .map(p => ({
                    date: p.date,
                    description: `Payment to ${bill.state.supplierName} (Bill Ref #${bill.state.reference})`,
                    amount: -p.amount,
                    type: 'expense' as const,
                    method: p.method
                }))
        );

        const poExpenseTransactions = purchaseOrders.flatMap(po => 
            (po.payments || [])
                .filter(p => filterByPaymentDate(p.date))
                .map(p => ({
                    date: p.date,
                    description: `Payment to ${po.state.supplierName} (PO #${po.state.poNumber})`,
                    amount: -p.amount,
                    type: 'expense' as const,
                    method: p.method
                }))
        );
        
        const marketplaceTransactions = marketplaceStatements
            .filter(s => filterByPaymentDate(s.endDate) && s.payouts !== 0)
            .map(s => {
                const account = marketplaceAccounts.find(a => a.id === s.marketplaceAccountId);
                const source = account ? `${account.storeName} (${account.marketplace})` : 'Marketplace';
                return {
                    date: s.endDate,
                    description: `Payout from ${source}`,
                    amount: s.payouts,
                    type: 'income' as const,
                    method: 'Online Payment' as const
                };
            });

        const allTransactions = [...incomeTransactions, ...billExpenseTransactions, ...poExpenseTransactions, ...marketplaceTransactions]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Helper to calculate VAT on purchases to determine the ex-VAT expense amount for the summary card.
        const calculatePurchaseVat = (items: (PurchaseOrderLineItem[] | BillLineItem[]), taxMode: TaxMode) => {
            let vatTotal = 0;
            items.forEach(item => {
                const price = item.quantity * item.unitPrice;
                if (taxMode === 'inclusive') {
                    const exclusivePrice = price / (1 + item.vatRate / 100);
                    vatTotal += price - exclusivePrice;
                } else if (taxMode === 'exclusive') {
                    vatTotal += price * (item.vatRate / 100);
                }
            });
            return vatTotal;
        };

        let totalExpensesExVat = 0;

        bills.forEach(bill => {
            const totalVatOnBill = calculatePurchaseVat(bill.state.lineItems, bill.state.taxMode);
            const vatRatio = bill.total > 0 ? totalVatOnBill / bill.total : 0;
            (bill.payments || []).forEach(p => {
                if (filterByPaymentDate(p.date)) {
                    totalExpensesExVat += p.amount * (1 - vatRatio);
                }
            });
        });

        purchaseOrders.forEach(po => {
            const totalVatOnPO = calculatePurchaseVat(po.state.lineItems, po.state.taxMode);
            const vatRatio = po.total > 0 ? totalVatOnPO / po.total : 0;
            (po.payments || []).forEach(p => {
                if (filterByPaymentDate(p.date)) {
                    totalExpensesExVat += p.amount * (1 - vatRatio);
                }
            });
        });


        // Cash-based calculations for ledger and balance
        const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalCashExpenses = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const incomeByMethod = {
            cash: incomeTransactions.filter(t => t.method === 'Cash').reduce((sum, t) => sum + t.amount, 0),
            card: incomeTransactions.filter(t => t.method === 'Card Payment').reduce((sum, t) => sum + t.amount, 0),
            bankOnline: allTransactions.filter(t => t.type === 'income' && (t.method === 'Bank Transfer' || t.method === 'Online Payment')).reduce((sum, t) => sum + t.amount, 0),
        };

        let runningBalance = startBalance;
        const transactionsWithBalance = allTransactions.map(t => {
            runningBalance += t.amount;
            return { ...t, balance: runningBalance };
        });

        const endBalance = startBalance + totalIncome - totalCashExpenses;

        return {
            transactions: transactionsWithBalance,
            totalIncome,
            totalExpenses: totalExpensesExVat, // Use ex-VAT for display
            incomeByMethod,
            endBalance,
        };
    }, [invoices, bills, purchaseOrders, marketplaceStatements, marketplaceAccounts, startDate, endDate, startBalance, inventory, settings]);

    const handleDownloadCsv = () => {
        const summaryData = [
            { Item: 'ACCOUNT BALANCES REPORT', Value: '' },
            { Item: 'Period', Value: `${startDate || 'Start'} to ${endDate || 'End'}` },
            {},
            { Item: 'Start Balance', Value: startBalance.toFixed(2) },
            { Item: 'Total Income', Value: reportData.totalIncome.toFixed(2) },
            { Item: 'Total Expenses (ex. VAT)', Value: reportData.totalExpenses.toFixed(2) },
            { Item: 'End Balance', Value: reportData.endBalance.toFixed(2) },
            {},
            { Item: 'TRANSACTION LEDGER', Value: '' },
            { Date: 'Date', Description: 'Description', Income: 'Income', Expense: 'Expense', Balance: 'Balance' },
        ];

        const transactionData = reportData.transactions.map(t => ({
            Date: t.date,
            Description: t.description,
            Income: t.type === 'income' ? t.amount.toFixed(2) : '',
            Expense: t.type === 'expense' ? Math.abs(t.amount).toFixed(2) : '',
            Balance: t.balance.toFixed(2),
        }));

        exportToCsv(`Account_Balances_${startDate || 'start'}_to_${endDate || 'end'}.csv`, [...summaryData, ...transactionData]);
    };
    
    const handleDownloadPdf = () => {
        onDownloadPdf({ reportData, startDate, endDate, startBalance, settings }, 'account-balances-report');
    };

    return (
         <div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-8 bg-slate-50 p-4 rounded-lg items-end">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
                    <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-600 mb-1">End Date</label>
                    <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="startBalance" className="block text-sm font-medium text-slate-600 mb-1">Start Balance ({currency})</label>
                    <Input id="startBalance" type="number" value={startBalance} onChange={e => setStartBalance(parseFloat(e.target.value) || 0)} />
                </div>
                <Button variant="primary" onClick={handleDownloadCsv}><DownloadIcon className="w-4 h-4 mr-2" />CSV</Button>
                <Button variant="primary" onClick={handleDownloadPdf}><DownloadIcon className="w-4 h-4 mr-2" />PDF</Button>
            </div>
            
            <div className="space-y-6">
                 <div className="p-6 rounded-lg bg-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-gray-200 p-4 rounded">
                            <p className="text-sm font-medium text-gray-700">Start Balance</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(startBalance)}</p>
                        </div>
                         <div className="bg-green-50 p-4 rounded">
                            <p className="text-sm font-medium text-green-700">Total Income</p>
                            <p className="text-2xl font-bold text-green-900">{formatCurrency(reportData.totalIncome)}</p>
                        </div>
                         <div className="bg-red-50 p-4 rounded">
                            <p className="text-sm font-medium text-red-700">Total Expenses (ex. VAT)</p>
                            <p className="text-2xl font-bold text-red-900">{formatCurrency(reportData.totalExpenses)}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded">
                            <p className="text-sm font-medium text-blue-700">End Balance</p>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(reportData.endBalance)}</p>
                        </div>
                    </div>
                     <div className="grid grid-cols-3 gap-4 text-center mt-4 pt-4 border-t">
                        <div className="bg-white p-3 rounded">
                            <p className="text-xs font-medium text-slate-600">Cash Income</p>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(reportData.incomeByMethod.cash)}</p>
                        </div>
                        <div className="bg-white p-3 rounded">
                            <p className="text-xs font-medium text-slate-600">Card Income</p>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(reportData.incomeByMethod.card)}</p>
                        </div>
                        <div className="bg-white p-3 rounded">
                            <p className="text-xs font-medium text-slate-600">Bank/Online Income</p>
                            <p className="text-lg font-bold text-slate-800">{formatCurrency(reportData.incomeByMethod.bankOnline)}</p>
                        </div>
                     </div>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left table-auto">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 text-sm">
                                <th className="p-3 font-semibold">Date</th>
                                <th className="p-3 font-semibold w-1/2">Description</th>
                                <th className="p-3 font-semibold text-right">Income</th>
                                <th className="p-3 font-semibold text-right">Expense</th>
                                <th className="p-3 font-semibold text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.transactions.map((t, index) => (
                                <tr key={index} className="border-b hover:bg-slate-50">
                                    <td className="p-3 text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className="p-3 text-slate-800">{t.description}</td>
                                    <td className="p-3 text-right font-medium text-green-600">{t.type === 'income' ? formatCurrency(t.amount) : '-'}</td>
                                    <td className="p-3 text-right font-medium text-red-600">{t.type === 'expense' ? formatCurrency(Math.abs(t.amount)) : '-'}</td>
                                    <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(t.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {reportData.transactions.length === 0 && <p className="text-center text-slate-500 py-8">No transactions found for the selected period.</p>}
                </div>
            </div>
        </div>
    );
};

export default AccountBalances;