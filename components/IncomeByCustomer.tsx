import React, { useState, useMemo } from 'react';
import { Customer, Invoice, AppSettings, CreditNote } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';

interface IncomeByCustomerProps {
    customers: Customer[];
    invoices: Invoice[];
    creditNotes: CreditNote[];
    settings: AppSettings;
    onDownloadPdf: (data: any, type: string) => void;
    onViewHistory: (customerId: string) => void;
}

const IncomeByCustomer: React.FC<IncomeByCustomerProps> = ({ customers, invoices, creditNotes, settings, onDownloadPdf, onViewHistory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const reportData = useMemo(() => {
        const allActivity = [...invoices, ...creditNotes];
        const customerNamesInPeriod = new Set<string>();
        if (startDate || endDate) {
            allActivity.forEach(activity => {
                const issueDate = new Date(activity.state.issueDate);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                let inRange = true;
                if (start && issueDate < start) inRange = false;
                if (end && issueDate > end) inRange = false;

                if (inRange) {
                    customerNamesInPeriod.add(activity.state.customerName);
                }
            });
        }
    
        const customersToShow = (startDate || endDate) 
            ? customers.filter(c => customerNamesInPeriod.has(c.name))
            : customers;
        
        return customersToShow.map(customer => {
            const customerInvoices = invoices.filter(inv => inv.state.customerName === customer.name);
            const customerCreditNotes = creditNotes.filter(cn => cn.state.customerName === customer.name);

            const totalBilled = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
            const totalCredited = customerCreditNotes.reduce((sum, cn) => sum + cn.total, 0);
            const netBilled = totalBilled - totalCredited;
            
            const totalPaid = customerInvoices.reduce((sum, inv) => 
                sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
            
            const outstandingBalance = netBilled - totalPaid;

            return {
                id: customer.id,
                name: customer.name,
                totalBilled: netBilled,
                outstandingBalance,
            };
        });
    }, [customers, invoices, creditNotes, startDate, endDate]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return reportData;
        const lowercasedTerm = searchTerm.toLowerCase();
        return reportData.filter(row => row.name.toLowerCase().includes(lowercasedTerm));
    }, [reportData, searchTerm]);

    const handleDownloadCsv = () => {
        const csvData = filteredData.map(row => ({
            'Customer Name': row.name,
            'Net Billed': row.totalBilled.toFixed(2),
            'Outstanding Balance': row.outstandingBalance.toFixed(2),
        }));
        exportToCsv(`Income_by_Customer_${new Date().toISOString().split('T')[0]}.csv`, csvData);
    };

    const handleDownloadPdf = () => {
        onDownloadPdf({ reportData: filteredData, settings, startDate, endDate }, 'income-by-customer-report');
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
                    id="customerSearch" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search displayed customers by name..."
                />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left table-auto">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 text-sm">
                            <th className="p-3 font-semibold">Customer Name</th>
                            <th className="p-3 font-semibold text-right">Net Billed</th>
                            <th className="p-3 font-semibold text-right">Outstanding Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(row => (
                            <tr key={row.id} className="border-b hover:bg-slate-50">
                                <td className="p-3 text-slate-800">{row.name}</td>
                                <td 
                                    className="p-3 text-right text-slate-800 cursor-pointer hover:underline hover:text-blue-600"
                                    onClick={() => onViewHistory(row.id)}
                                    title={`View statement for ${row.name}`}
                                >
                                    {formatCurrency(row.totalBilled)}
                                </td>
                                <td className="p-3 text-right font-medium text-red-600">{formatCurrency(row.outstandingBalance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && <p className="text-center text-slate-500 py-8">No customers match your search for the selected period.</p>}
            </div>
        </div>
    );
};

export default IncomeByCustomer;