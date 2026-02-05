import React from 'react';
import { AppSettings } from '../types';

interface ReportData {
    totalRevenue: number;
    cogs: number;
    grossProfit: number;
    vatOnSales: number;
    vatOnPurchases: number;
    netVatPosition: number;
}

interface PrintableReportProps {
    id: string;
    reportData: ReportData;
    startDate: string;
    endDate: string;
    settings: AppSettings;
}

const PrintableReport: React.FC<PrintableReportProps> = ({ id, reportData, startDate, endDate, settings }) => {
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => {
        const value = amount.toFixed(2);
        return amount < 0 ? `-${currency}${Math.abs(amount).toFixed(2)}` : `${currency}${value}`;
    }

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                    {settings.vatNumber && <p>VAT: {settings.vatNumber}</p>}
                </div>
                <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Profit & Loss</h1>
            </header>

            <section className="mb-8">
                <p><span className="font-bold text-slate-600">Report Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-bold text-slate-600">Period:</span> {startDate || 'Start'} to {endDate || 'End'}</p>
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-sm">
                    <tbody>
                        <tr className="border-b">
                            <td className="p-2 font-semibold w-2/3">Total Revenue (ex. VAT)</td>
                            <td className="p-2 text-right">{formatCurrency(reportData.totalRevenue)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-2 font-semibold">Cost of Goods Sold (ex. VAT)</td>
                            <td className="p-2 text-right text-red-600">({formatCurrency(reportData.cogs)})</td>
                        </tr>
                        <tr className="border-b-2 border-slate-800 bg-slate-100">
                            <td className="p-2 font-bold text-base">Gross Profit</td>
                            <td className="p-2 text-right font-bold text-base">{formatCurrency(reportData.grossProfit)}</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section className="mt-8">
                <h3 className="font-bold text-slate-800 text-base mb-2">VAT Summary</h3>
                <table className="w-full text-left table-fixed text-sm">
                     <tbody>
                        <tr className="border-b">
                            <td className="p-2 font-semibold w-2/3">VAT on Sales (Payable)</td>
                            <td className="p-2 text-right">{formatCurrency(reportData.vatOnSales)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-2 font-semibold">VAT on Purchases (Reclaimable)</td>
                            <td className="p-2 text-right">({formatCurrency(reportData.vatOnPurchases)})</td>
                        </tr>
                        <tr className="border-b-2 border-slate-800 bg-slate-100">
                            <td className="p-2 font-bold text-base">Net VAT Position</td>
                            <td className="p-2 text-right font-bold text-base">{formatCurrency(reportData.netVatPosition)}</td>
                        </tr>
                    </tbody>
                </table>
                 <p className="text-xs text-right mt-1 text-slate-500">{reportData.netVatPosition >= 0 ? 'Amount you owe' : 'Amount you can reclaim'}</p>
            </section>
        </div>
    );
};

export default PrintableReport;