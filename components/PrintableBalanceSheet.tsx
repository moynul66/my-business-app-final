import React from 'react';
import { AppSettings } from '../types';

interface ReportData {
    allIncomingTransactions: number;
    accountsReceivable: number;
    accountsPayable: number;
}

interface PrintableBalanceSheetProps {
    id: string;
    reportData: ReportData;
    asOfDate: string;
    settings: AppSettings;
}

const PrintableBalanceSheet: React.FC<PrintableBalanceSheetProps> = ({ id, reportData, asOfDate, settings }) => {
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => {
        const value = amount.toFixed(2);
        return amount < 0 ? `-${currency}${Math.abs(amount).toFixed(2)}` : `${currency}${value}`;
    };
    
    const total = reportData.allIncomingTransactions + reportData.accountsReceivable - reportData.accountsPayable;

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                </div>
                <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Financial Position</h1>
            </header>

            <section className="mb-8">
                <p><span className="font-bold text-slate-600">As of Date:</span> {new Date(asOfDate).toLocaleDateString()}</p>
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-sm">
                    <tbody>
                        <tr className="border-b">
                            <td className="p-2 font-semibold w-2/3">All Incoming Transactions</td>
                            <td className="p-2 text-right">{formatCurrency(reportData.allIncomingTransactions)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-2 font-semibold">To Receive (Accounts Receivable)</td>
                            <td className="p-2 text-right">{formatCurrency(reportData.accountsReceivable)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-2 font-semibold">To Be Paid Out (Accounts Payable)</td>
                            <td className="p-2 text-right text-red-600">({formatCurrency(reportData.accountsPayable)})</td>
                        </tr>
                        <tr className="border-t-2 border-slate-800 bg-slate-100">
                            <td className="p-2 font-bold text-base">Total</td>
                            <td className="p-2 text-right font-bold text-base">{formatCurrency(total)}</td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default PrintableBalanceSheet;