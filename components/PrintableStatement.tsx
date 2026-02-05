import React from 'react';
import { Customer, Invoice, AppSettings, CreditNote } from '../types';

interface PrintableStatementProps {
    id: string;
    customer: Customer;
    invoices: Invoice[];
    creditNotes: CreditNote[];
    settings: AppSettings;
    startDate?: string;
    endDate?: string;
}

const PrintableStatement: React.FC<PrintableStatementProps> = ({
    id,
    customer,
    invoices,
    creditNotes,
    settings,
    startDate,
    endDate,
}) => {
    const currency = settings.currencySymbol || '£';

    const activityLog = React.useMemo(() => {
        const activities: { date: string; description: string; billed: number; paid: number }[] = [];

        invoices.forEach(inv => {
            activities.push({
                date: inv.state.issueDate,
                description: `Invoice #${inv.state.invoiceNumber}`,
                billed: inv.total,
                paid: 0,
            });
            inv.payments.forEach(p => {
                activities.push({
                    date: p.date,
                    description: `Payment for #${inv.state.invoiceNumber}`,
                    billed: 0,
                    paid: p.amount,
                });
            });
        });

        creditNotes.forEach(cn => {
            activities.push({
                date: cn.state.issueDate,
                description: `Credit Note #${cn.state.creditNoteNumber}`,
                billed: -cn.total, // Negative value for billed
                paid: 0,
            });
        });

        return activities
            .filter(act => {
                const actDate = new Date(act.date);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0,0,0,0);
                if (end) end.setHours(23,59,59,999);
                if (start && actDate < start) return false;
                if (end && actDate > end) return false;
                return true;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [invoices, creditNotes, startDate, endDate]);

    const totals = React.useMemo(() => {
        const filteredInvoices = invoices.filter(inv => {
            const issueDate = new Date(inv.state.issueDate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0,0,0,0);
            if (end) end.setHours(23,59,59,999);
            if (start && issueDate < start) return false;
            if (end && issueDate > end) return false;
            return true;
        });

        const totalBilled = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
        
        const filteredCreditNotes = creditNotes.filter(cn => {
            const issueDate = new Date(cn.state.issueDate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0,0,0,0);
            if (end) end.setHours(23,59,59,999);
            if (start && issueDate < start) return false;
            if (end && issueDate > end) return false;
            return true;
        });
        const totalCredited = filteredCreditNotes.reduce((sum, cn) => sum + cn.total, 0);

        return { totalBilled, totalPaid, totalCredited, balanceDue: totalBilled - totalCredited - totalPaid };
    }, [invoices, creditNotes, startDate, endDate]);

    let runningBalance = 0;

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                    {settings.vatNumber && <p>VAT: {settings.vatNumber}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {settings.companyLogo && (
                        <img src={settings.companyLogo} alt="Company Logo" className="h-12 w-auto max-w-[150px] object-contain" />
                    )}
                    <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Statement</h1>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <p className="font-bold text-slate-600 mb-1">Statement For:</p>
                    <p className="font-semibold">{customer.name}</p>
                    {customer.contactName && <p className="text-slate-600">Attn: {customer.contactName}</p>}
                    <p className="whitespace-pre-wrap text-slate-600">{customer.address}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-bold text-slate-600">Date Issued:</span> {new Date().toLocaleDateString()}</p>
                    {startDate && <p><span className="font-bold text-slate-600">From:</span> {new Date(startDate).toLocaleDateString()}</p>}
                    {endDate && <p><span className="font-bold text-slate-600">To:</span> {new Date(endDate).toLocaleDateString()}</p>}
                </div>
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className="p-1 w-[15%]">Date</th>
                            <th className="p-1 w-[40%]">Description</th>
                            <th className="p-1 text-right w-[15%]">Billed / Credited</th>
                            <th className="p-1 text-right w-[15%]">Paid</th>
                            <th className="p-1 text-right w-[15%]">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activityLog.map((activity, index) => {
                             runningBalance += (activity.billed - activity.paid);
                             return (
                                <tr key={index} className="border-b">
                                    <td className="p-1 align-top">{new Date(activity.date).toLocaleDateString()}</td>
                                    <td className="p-1 align-top">
                                        <p className="font-medium">{activity.description}</p>
                                    </td>
                                    <td className="p-1 text-right align-top">{activity.billed !== 0 ? currency + activity.billed.toFixed(2) : ''}</td>
                                    <td className="p-1 text-right align-top">{activity.paid !== 0 ? currency + activity.paid.toFixed(2) : ''}</td>
                                    <td className="p-1 text-right align-top">{currency}{runningBalance.toFixed(2)}</td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </section>

            <section className="mt-8 flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between">
                        <span>Total Billed</span>
                        <span className="font-medium">{currency}{totals.totalBilled.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span>Total Credited</span>
                        <span className="font-medium">-{currency}{totals.totalCredited.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Paid</span>
                        <span className="font-medium">{currency}{totals.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between text-lg font-bold text-slate-900">
                        <span>Balance Due</span>
                        <span>{currency}{totals.balanceDue.toFixed(2)}</span>
                    </div>
                </div>
            </section>

            <section className="mt-16 text-xs text-slate-600 bg-slate-50 p-4 rounded-lg">
                <p className="font-bold mb-1">Payment Details:</p>
                <p>{settings.paymentTerms}</p>
                <p>Bank: {settings.bankName}</p>
                <p>A/N: {settings.accountNumber} | Sort Code: {settings.sortCode}</p>
            </section>
        </div>
    );
};

export default PrintableStatement;