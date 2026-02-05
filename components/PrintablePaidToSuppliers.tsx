import React from 'react';
import { AppSettings } from '../types';

interface ReportRow {
    id: string;
    name: string;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
}

interface PrintablePaidToSuppliersProps {
    id: string;
    reportData: ReportRow[];
    settings: AppSettings;
    startDate?: string;
    endDate?: string;
}

const PrintablePaidToSuppliers: React.FC<PrintablePaidToSuppliersProps> = ({ id, reportData, settings, startDate, endDate }) => {
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                </div>
                <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Paid to Suppliers</h1>
            </header>

            <section className="mb-8">
                <p><span className="font-bold text-slate-600">Report Date:</span> {new Date().toLocaleDateString()}</p>
                 {(startDate || endDate) && 
                    <p><span className="font-bold text-slate-600">Period:</span> {startDate ? new Date(startDate).toLocaleDateString() : 'Start'} to {endDate ? new Date(endDate).toLocaleDateString() : 'End'}</p>
                }
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className="p-2 font-semibold w-[40%]">Supplier Name</th>
                            <th className="p-2 font-semibold text-right w-[20%]">Total Billed</th>
                            <th className="p-2 font-semibold text-right w-[20%]">Total Paid</th>
                            <th className="p-2 font-semibold text-right w-[20%]">Outstanding Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map(row => (
                            <tr key={row.id} className="border-b">
                                <td className="p-2 text-slate-800">{row.name}</td>
                                <td className="p-2 text-right text-slate-800">{formatCurrency(row.totalBilled)}</td>
                                <td className="p-2 text-right font-medium text-green-600">{formatCurrency(row.totalPaid)}</td>
                                <td className="p-2 text-right font-medium text-red-600">{formatCurrency(row.outstanding)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default PrintablePaidToSuppliers;