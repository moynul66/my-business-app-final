import React from 'react';
import { AppSettings } from '../types';

interface Transaction {
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    balance: number;
}

interface ReportData {
    transactions: Transaction[];
    totalIncome: number;
    totalExpenses: number;
    endBalance: number;
}

interface PrintableAccountBalancesProps {
    id: string;
    reportData: ReportData;
    startDate: string;
    endDate: string;
    startBalance: number;
    settings: AppSettings;
}

const PrintableAccountBalances: React.FC<PrintableAccountBalancesProps> = ({ id, reportData, startDate, endDate, startBalance, settings }) => {
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                </div>
                <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Account Balances</h1>
            </header>

            <section className="mb-8">
                <p><span className="font-bold text-slate-600">Report Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-bold text-slate-600">Period:</span> {startDate || 'Start'} to {endDate || 'End'}</p>
            </section>
            
             <section className="mb-8 p-4 bg-slate-50 rounded-lg grid grid-cols-4 gap-4 text-center">
                <div>
                    <p className="font-bold text-slate-600">Start Balance</p>
                    <p className="text-lg font-bold">{formatCurrency(startBalance)}</p>
                </div>
                <div>
                    <p className="font-bold text-slate-600">Total Income</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(reportData.totalIncome)}</p>
                </div>
                <div>
                    <p className="font-bold text-slate-600">Total Expenses</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</p>
                </div>
                <div>
                    <p className="font-bold text-slate-600">End Balance</p>
                    <p className="text-lg font-bold">{formatCurrency(reportData.endBalance)}</p>
                </div>
            </section>

            <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">Transaction Ledger</h3>
                <table className="w-full text-left table-fixed text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className="p-2 font-semibold w-[15%]">Date</th>
                            <th className="p-2 font-semibold w-[40%]">Description</th>
                            <th className="p-2 font-semibold text-right w-[15%]">Income</th>
                            <th className="p-2 font-semibold text-right w-[15%]">Expense</th>
                            <th className="p-2 font-semibold text-right w-[15%]">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.transactions.map((t, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2 text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="p-2 text-slate-800">{t.description}</td>
                                <td className="p-2 text-right font-medium text-green-600">{t.type === 'income' ? formatCurrency(t.amount) : '-'}</td>
                                <td className="p-2 text-right font-medium text-red-600">{t.type === 'expense' ? formatCurrency(Math.abs(t.amount)) : '-'}</td>
                                <td className="p-2 text-right font-semibold text-slate-800">{formatCurrency(t.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default PrintableAccountBalances;