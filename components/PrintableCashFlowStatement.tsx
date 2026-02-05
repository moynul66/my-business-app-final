import React from 'react';
import { AppSettings } from '../types';

interface ReportData {
    cashInflows: number;
    cashOutflows: number;
    netCashFlow: number;
}

interface PrintableCashFlowStatementProps {
    id: string;
    reportData: ReportData;
    startDate: string;
    endDate: string;
    settings: AppSettings;
}

const PrintableCashFlowStatement: React.FC<PrintableCashFlowStatementProps> = ({ id, reportData, startDate, endDate, settings }) => {
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                </div>
                <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Cash Flow Statement</h1>
            </header>

            <section className="mb-8">
                <p><span className="font-bold text-slate-600">Report Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-bold text-slate-600">Period:</span> {startDate || 'Start'} to {endDate || 'End'}</p>
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-sm">
                    <thead>
                        <tr className="bg-slate-100"><th className="p-2 font-bold text-base" colSpan={2}>Cash Flow from Operating Activities</th></tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-2 w-2/3">Cash Inflows (from Invoice Payments)</td>
                            <td className="p-2 text-right">{formatCurrency(reportData.cashInflows)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-2">Cash Outflows (from Bill Payments)</td>
                            <td className="p-2 text-right text-red-600">({formatCurrency(reportData.cashOutflows)})</td>
                        </tr>
                        <tr className="border-b-2 border-slate-800 bg-slate-100">
                            <td className="p-2 font-bold text-base">Net Cash Flow</td>
                            <td className="p-2 text-right font-bold text-base">{formatCurrency(reportData.netCashFlow)}</td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default PrintableCashFlowStatement;
