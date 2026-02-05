import React, { useState, useMemo } from 'react';
import { Invoice, Bill, AppSettings, Payment, MarketplaceStatement, CreditNote } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';

interface BalanceSheetProps {
    invoices: Invoice[];
    bills: Bill[];
    creditNotes: CreditNote[];
    marketplaceStatements: MarketplaceStatement[];
    settings: AppSettings;
    onDownloadPdf: (data: any, type: string) => void;
}

const BalanceSheet: React.FC<BalanceSheetProps> = ({ invoices, bills, creditNotes, marketplaceStatements, settings, onDownloadPdf }) => {
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => {
        const value = amount.toFixed(2);
        return amount < 0 ? `-${currency}${Math.abs(amount).toFixed(2)}` : `${currency}${value}`;
    }

    const filteredDocuments = useMemo(() => {
        const end = asOfDate ? new Date(asOfDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const filterByIssueDate = (item: { state: { issueDate: string } }): boolean => {
            const issueDate = new Date(item.state.issueDate);
            return issueDate <= end;
        };
        
        const filterByStatementEndDate = (item: { endDate: string }): boolean => {
            const statementEndDate = new Date(item.endDate);
            return statementEndDate <= end;
        };

        return {
            invoices: invoices.filter(filterByIssueDate),
            bills: bills.filter(filterByIssueDate),
            creditNotes: creditNotes.filter(filterByIssueDate),
            marketplaceStatements: marketplaceStatements.filter(filterByStatementEndDate),
        };
    }, [invoices, bills, creditNotes, marketplaceStatements, asOfDate]);
    
    const reportData = useMemo(() => {
        const end = asOfDate ? new Date(asOfDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const filterPaymentsByDate = (payments: Payment[]) => {
            if (!payments) return [];
            return payments.filter(p => new Date(p.date) <= end);
        };

        const invoicePaymentsReceived = filteredDocuments.invoices
            .flatMap(inv => filterPaymentsByDate(inv.payments))
            .reduce((sum, p) => sum + p.amount, 0);
        
        const marketplacePayoutsReceived = filteredDocuments.marketplaceStatements
            .reduce((sum, s) => sum + s.payouts, 0);

        const allIncomingTransactions = invoicePaymentsReceived + marketplacePayoutsReceived;
            
        let accountsReceivable = filteredDocuments.invoices.reduce((sum, inv) => {
            const totalPaid = filterPaymentsByDate(inv.payments).reduce((pSum, p) => pSum + p.amount, 0);
            return sum + (inv.total - totalPaid);
        }, 0);
        
        const totalCredited = filteredDocuments.creditNotes.reduce((sum, cn) => sum + cn.total, 0);
        accountsReceivable -= totalCredited;

        const accountsPayable = filteredDocuments.bills.reduce((sum, bill) => {
            const totalPaid = filterPaymentsByDate(bill.payments).reduce((pSum, p) => pSum + p.amount, 0);
            return sum + (bill.total - totalPaid);
        }, 0);
        
        return { allIncomingTransactions, accountsReceivable, accountsPayable };

    }, [filteredDocuments.invoices, filteredDocuments.bills, filteredDocuments.creditNotes, filteredDocuments.marketplaceStatements, asOfDate]);

    const handleDownloadCsv = () => {
        const total = reportData.allIncomingTransactions + reportData.accountsReceivable - reportData.accountsPayable;
        const data = [
            { Item: 'FINANCIAL POSITION', Value: `As of ${asOfDate}` },
            {},
            { Item: 'All Incoming Transactions', Value: reportData.allIncomingTransactions.toFixed(2) },
            { Item: 'To Receive (Accounts Receivable)', Value: reportData.accountsReceivable.toFixed(2) },
            { Item: 'To Be Paid Out (Accounts Payable)', Value: `-${reportData.accountsPayable.toFixed(2)}` },
            {},
            { Item: 'Total', Value: total.toFixed(2) },
        ];
        exportToCsv(`Financial_Position_as_of_${asOfDate}.csv`, data);
    };

    return (
        <div>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-lg items-end">
                <div>
                    <label htmlFor="asOfDate" className="block text-sm font-medium text-slate-600 mb-1">As of Date</label>
                    <Input id="asOfDate" type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
                </div>
                <div />
                <Button variant="primary" onClick={handleDownloadCsv}><DownloadIcon className="w-4 h-4 mr-2" />CSV</Button>
                <Button variant="primary" onClick={() => onDownloadPdf({ reportData, asOfDate, settings }, 'balance-sheet-report')}><DownloadIcon className="w-4 h-4 mr-2" />PDF</Button>
            </div>
            
            <div className="space-y-6">
                <div className="p-6 rounded-lg bg-slate-100">
                    <h3 className="text-xl font-semibold text-center mb-4 text-slate-800">Financial Position Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-4 rounded">
                            <p className="text-sm font-medium text-green-700">All Incoming Transactions</p>
                            <p className="text-2xl font-bold text-green-900">{formatCurrency(reportData.allIncomingTransactions)}</p>
                            <p className="text-xs text-slate-500">From invoice & marketplace payments</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded">
                            <p className="text-sm font-medium text-blue-700">To Receive (Accounts Receivable)</p>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(reportData.accountsReceivable)}</p>
                            <p className="text-xs text-slate-500">Outstanding on invoices</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded">
                            <p className="text-sm font-medium text-red-700">To Be Paid Out (Accounts Payable)</p>
                            <p className="text-2xl font-bold text-red-900">{formatCurrency(reportData.accountsPayable)}</p>
                            <p className="text-xs text-slate-500">Outstanding on bills</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 rounded-lg bg-slate-100">
                    <div className="text-center bg-indigo-50 p-4 rounded">
                        <p className="text-sm font-medium text-indigo-700">Total</p>
                        <p className="text-2xl font-bold text-indigo-900">{formatCurrency(
                            reportData.allIncomingTransactions + reportData.accountsReceivable - reportData.accountsPayable
                        )}</p>
                        <p className="text-xs text-slate-500">(Incoming + Receivable - Payable)</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalanceSheet;