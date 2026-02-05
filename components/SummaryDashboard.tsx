import React, { useMemo, useState } from 'react';
import { Invoice, QuoteDraft, InvoiceDraft, PurchaseOrder, Bill, AppSettings, InventoryItem, TaxMode, BillLineItem, PurchaseOrderLineItem, CreditNote, TrackedJob } from '../types';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { StatusBadge } from './ui/StatusBadge';
import { calculateBasePrice } from '../services/conversionService';
import { CurrencyPoundIcon } from './icons/CurrencyPoundIcon';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { exportToCsv } from '../services/csvService';
import { DownloadIcon } from './icons/DownloadIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

interface SummaryDashboardProps {
    invoices: Invoice[];
    quotes: QuoteDraft[];
    drafts: InvoiceDraft[];
    purchaseOrders: PurchaseOrder[];
    bills: Bill[];
    creditNotes: CreditNote[];
    settings: AppSettings;
    inventory: InventoryItem[];
    trackedJobs: TrackedJob[];
    onViewJob: () => void;
    onDownloadVatReportPdf: (data: any) => void;
}

const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ invoices, quotes, drafts, purchaseOrders, bills, creditNotes, settings, inventory, trackedJobs, onViewJob, onDownloadVatReportPdf }) => {
    const greeting =
        settings.companyName && settings.companyName !== 'Your Company Name'
            ? `Welcome Back, ${settings.companyName}!`
            : 'Welcome Back!';

    const [vatStartDate, setVatStartDate] = useState('');
    const [vatEndDate, setVatEndDate] = useState('');
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const jobReminders = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        const reminders: any[] = [];

        trackedJobs
            .filter(job => job.status !== 'complete')
            .forEach(job => {
                const dueDate = new Date(job.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                const diffTime = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    reminders.push({
                        id: job.id,
                        type: 'Job',
                        description: job.description,
                        customer: job.customerName,
                        daysUntilDue: diffDays,
                        statusText: `Overdue`,
                        colorClass: 'text-red-600 font-bold',
                        action: () => onViewJob(),
                    });
                } else if (diffDays === 0) {
                     reminders.push({
                        id: job.id,
                        type: 'Job',
                        description: job.description,
                        customer: job.customerName,
                        daysUntilDue: diffDays,
                        statusText: `Due today`,
                        colorClass: 'text-orange-600 font-bold',
                        action: () => onViewJob(),
                    });
                } else if (diffDays <= 7) {
                     reminders.push({
                        id: job.id,
                        type: 'Job',
                        description: job.description,
                        customer: job.customerName,
                        daysUntilDue: diffDays,
                        statusText: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
                        colorClass: 'text-yellow-700',
                        action: () => onViewJob(),
                    });
                }
            });

        return reminders.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    }, [trackedJobs, onViewJob]);

    const invoiceSummary = useMemo(() => {
        const summary = {
            totalCount: invoices.length,
            totalValue: 0,
            totalPaid: 0,
            statuses: {
                'Paid': 0,
                'Partially Paid': 0,
                'Unpaid': 0,
            }
        };

        invoices.forEach(invoice => {
            summary.totalValue += invoice.total;
            const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            summary.totalPaid += paid;
            
            if (paid >= invoice.total) {
                summary.statuses['Paid']++;
            } else if (paid > 0) {
                summary.statuses['Partially Paid']++;
            } else {
                summary.statuses['Unpaid']++;
            }
        });

        return summary;
    }, [invoices]);

    const filteredDocuments = useMemo(() => {
        const filterByDate = (item: Invoice | PurchaseOrder | Bill | CreditNote): boolean => {
            const issueDate = new Date(item.state.issueDate);
            const start = vatStartDate ? new Date(vatStartDate) : null;
            const end = vatEndDate ? new Date(vatEndDate) : null;

            if (start && issueDate < start) return false;
            if (end) {
                end.setHours(23, 59, 59, 999); // Include the entire end day
                if (issueDate > end) return false;
            }
            return true;
        };
        return {
            invoices: invoices.filter(filterByDate),
            purchaseOrders: purchaseOrders.filter(filterByDate),
            bills: bills.filter(filterByDate),
            creditNotes: creditNotes.filter(filterByDate),
        }
    }, [invoices, purchaseOrders, bills, creditNotes, vatStartDate, vatEndDate]);

    const vatSummary = useMemo(() => {
        let totalVatPayable = 0;
        let totalVatReclaimable = 0;

        // VAT from Invoices (Payable)
        filteredDocuments.invoices.forEach(invoice => {
            invoice.state.lineItems.forEach(item => {
                let basePrice;
                const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);

                if (selectedInventoryItem) {
                    const parent = selectedInventoryItem.parentId ? inventory.find(p => p.id === selectedInventoryItem.parentId) : null;
                    const availableAddOns = [...(selectedInventoryItem.addOnOptions || []), ...(parent?.addOnOptions || [])];
                    basePrice = calculateBasePrice({ ...selectedInventoryItem, addOnOptions: availableAddOns }, item);
                } else {
                    basePrice = (item.price || 0) * item.quantity;
                }
                
                const discountAmount = item.discount.type === 'percentage'
                    ? basePrice * (item.discount.value / 100)
                    : item.discount.value;
                const priceAfterDiscount = basePrice - discountAmount;
                
                let itemVat = 0;
                if (invoice.state.taxMode === 'inclusive') {
                    const itemVatRate = 1 + (item.vatRate / 100);
                    const exclusivePrice = priceAfterDiscount / itemVatRate;
                    itemVat = priceAfterDiscount - exclusivePrice;
                } else if (invoice.state.taxMode === 'exclusive') {
                    itemVat = priceAfterDiscount * (item.vatRate / 100);
                }
                totalVatPayable += itemVat;
            });
        });
        
        // VAT from Credit Notes (deducted from Payable)
        filteredDocuments.creditNotes.forEach(cn => {
            cn.state.lineItems.forEach(item => {
                let basePrice;
                const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);

                if (selectedInventoryItem) {
                    const parent = selectedInventoryItem.parentId ? inventory.find(p => p.id === selectedInventoryItem.parentId) : null;
                    const availableAddOns = [...(selectedInventoryItem.addOnOptions || []), ...(parent?.addOnOptions || [])];
                    basePrice = calculateBasePrice({ ...selectedInventoryItem, addOnOptions: availableAddOns }, item);
                } else {
                    basePrice = (item.price || 0) * item.quantity;
                }
                
                const discountAmount = item.discount.type === 'percentage'
                    ? basePrice * (item.discount.value / 100)
                    : item.discount.value;
                const priceAfterDiscount = basePrice - discountAmount;
                
                let itemVat = 0;
                if (cn.state.taxMode === 'inclusive') {
                    const itemVatRate = 1 + (item.vatRate / 100);
                    const exclusivePrice = priceAfterDiscount / itemVatRate;
                    itemVat = priceAfterDiscount - exclusivePrice;
                } else if (cn.state.taxMode === 'exclusive') {
                    itemVat = priceAfterDiscount * (item.vatRate / 100);
                }
                totalVatPayable -= itemVat;
            });
        });

        const calculatePurchaseVat = (items: (PurchaseOrderLineItem[] | BillLineItem[]), taxMode: TaxMode) => {
            let vat = 0;
            items.forEach(item => {
                const price = item.quantity * item.unitPrice;
                let itemVat = 0;
                if (taxMode === 'inclusive') {
                    const itemVatRate = 1 + (item.vatRate / 100);
                    const exclusivePrice = price / itemVatRate;
                    itemVat = price - exclusivePrice;
                } else if (taxMode === 'exclusive') {
                    itemVat = price * (item.vatRate / 100);
                }
                vat += itemVat;
            });
            return vat;
        };
        
        // VAT from Purchase Orders (Reclaimable)
        filteredDocuments.purchaseOrders.forEach(po => {
            totalVatReclaimable += calculatePurchaseVat(po.state.lineItems, po.state.taxMode);
        });
        
        // VAT from Bills (Reclaimable)
        filteredDocuments.bills.forEach(bill => {
            totalVatReclaimable += calculatePurchaseVat(bill.state.lineItems, bill.state.taxMode);
        });

        return {
            totalVatPayable,
            totalVatReclaimable,
            netVatPosition: totalVatPayable - totalVatReclaimable,
        };
    }, [filteredDocuments, inventory]);
    
    const quoteSummary = useMemo(() => {
        return {
            totalCount: quotes.length,
            totalValue: quotes.reduce((sum, q) => sum + q.total, 0),
        };
    }, [quotes]);
    
     const poSummary = useMemo(() => {
        return {
            totalCount: purchaseOrders.length,
            totalValue: purchaseOrders.reduce((sum, po) => sum + po.total, 0),
        };
    }, [purchaseOrders]);

    const billSummary = useMemo(() => {
        return {
            totalCount: bills.length,
            totalValue: bills.reduce((sum, b) => sum + b.total, 0),
        };
    }, [bills]);

    const draftSummary = useMemo(() => {
         return {
            totalCount: drafts.length,
            totalValue: drafts.reduce((sum, d) => sum + d.total, 0),
        };
    }, [drafts]);

    const handleExportCsv = () => {
        const salesData = filteredDocuments.invoices.map(inv => {
            return {
                Date: inv.state.issueDate,
                'Document #': inv.state.invoiceNumber,
                Customer: inv.state.customerName,
                'Net': inv.total / (1 + (inv.state.lineItems[0]?.vatRate || 0) / 100), // Approximate
                'VAT': inv.total - (inv.total / (1 + (inv.state.lineItems[0]?.vatRate || 0) / 100)), // Approximate
                'Total': inv.total,
            };
        });

        const purchasesData = [
            ...filteredDocuments.purchaseOrders.map(po => ({
                Date: po.state.issueDate,
                'Document #': po.state.poNumber,
                Supplier: po.state.supplierName,
                'Net': po.total / (1 + (po.state.lineItems[0]?.vatRate || 0) / 100), // Approximate
                'VAT': po.total - (po.total / (1 + (po.state.lineItems[0]?.vatRate || 0) / 100)), // Approximate
                'Total': po.total,
            })),
            ...filteredDocuments.bills.map(bill => ({
                Date: bill.state.issueDate,
                'Document #': bill.state.reference,
                Supplier: bill.state.supplierName,
                'Net': bill.total / (1 + (bill.state.lineItems[0]?.vatRate || 0) / 100), // Approximate
                'VAT': bill.total - (bill.total / (1 + (bill.state.lineItems[0]?.vatRate || 0) / 100)), // Approximate
                'Total': bill.total,
            }))
        ];

        const csvData = [
            { A: 'VAT SUMMARY' },
            { A: 'Start Date', B: vatStartDate || 'N/A' },
            { A: 'End Date', B: vatEndDate || 'N/A' },
            { A: 'Total VAT Payable', B: vatSummary.totalVatPayable.toFixed(2) },
            { A: 'Total VAT Reclaimable', B: vatSummary.totalVatReclaimable.toFixed(2) },
            { A: 'Net VAT Position', B: vatSummary.netVatPosition.toFixed(2) },
            {},
            { A: 'VAT ON SALES (PAYABLE)' },
            { A: 'Date', B: 'Document #', C: 'Customer', D: 'Net', E: 'VAT', F: 'Total' },
            ...salesData.map(d => ({ A: d.Date, B: d['Document #'], C: d.Customer, D: d.Net.toFixed(2), E: d.VAT.toFixed(2), F: d.Total.toFixed(2) })),
            {},
            { A: 'VAT ON PURCHASES (RECLAIMABLE)' },
            { A: 'Date', B: 'Document #', C: 'Supplier', D: 'Net', E: 'VAT', F: 'Total' },
            ...purchasesData.map(d => ({ A: d.Date, B: d['Document #'], C: d.Supplier, D: d.Net.toFixed(2), E: d.VAT.toFixed(2), F: d.Total.toFixed(2) })),
        ];

        exportToCsv(`VAT_Report_${vatStartDate || 'start'}_to_${vatEndDate || 'end'}.csv`, csvData);
    };

    const handleExportPdf = () => {
        onDownloadVatReportPdf({
            filteredInvoices: filteredDocuments.invoices,
            filteredCreditNotes: filteredDocuments.creditNotes,
            filteredPurchaseOrders: filteredDocuments.purchaseOrders,
            filteredBills: filteredDocuments.bills,
            vatSummary,
            startDate: vatStartDate,
            endDate: vatEndDate,
            settings,
            inventory,
        });
    };

    const MetricCard = ({ title, value, description }: { title: string; value: string; description?: string }) => (
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
    );

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold text-slate-900">{greeting}</h1>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center mb-4">
                    <BriefcaseIcon className="w-8 h-8 text-indigo-600 mr-3" />
                    <h2 className="text-2xl font-bold text-slate-800">Jobs Board Reminders</h2>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {jobReminders.length > 0 ? jobReminders.map(reminder => (
                        <div key={`${reminder.type}-${reminder.id}`} className="flex justify-between items-center bg-slate-50 p-3 rounded-md">
                            <div>
                                <p className="font-semibold text-slate-800">{reminder.description}</p>
                                <p className="text-sm text-slate-500">{reminder.type} for {reminder.customer}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-sm font-medium ${reminder.colorClass}`}>{reminder.statusText}</span>
                                <Button variant="outline" onClick={reminder.action}>
                                    View
                                </Button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-slate-500 text-center py-4">No upcoming jobs due soon!</p>
                    )}
                </div>
            </div>

            {/* Invoices Overview */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center mb-4">
                    <CreditCardIcon className="w-8 h-8 text-blue-600 mr-3" />
                    <h2 className="text-2xl font-bold text-slate-800">Invoices Overview</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Total Invoices" value={String(invoiceSummary.totalCount)} />
                    <MetricCard title="Total Value" value={formatCurrency(invoiceSummary.totalValue)} />
                    <MetricCard title="Total Paid" value={formatCurrency(invoiceSummary.totalPaid)} />
                    <MetricCard title="Balance Due" value={formatCurrency(invoiceSummary.totalValue - invoiceSummary.totalPaid)} />
                </div>
                 <div className="mt-6 pt-4 border-t">
                     <p className="text-sm font-medium text-slate-500 mb-2">Invoices by Status</p>
                     <div className="flex items-center gap-4">
                        <StatusBadge status="Paid" /><span>{invoiceSummary.statuses['Paid']}</span>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <StatusBadge status="Partially Paid" /><span>{invoiceSummary.statuses['Partially Paid']}</span>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <StatusBadge status="Unpaid" /><span>{invoiceSummary.statuses['Unpaid']}</span>
                    </div>
                </div>
            </div>

            {/* VAT Overview */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center mb-4">
                    <CurrencyPoundIcon className="w-8 h-8 text-teal-600 mr-3" />
                    <h2 className="text-2xl font-bold text-slate-800">VAT Overview</h2>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 bg-slate-50 p-4 rounded-lg items-end">
                    <div>
                        <label htmlFor="vatStartDate" className="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
                        <Input id="vatStartDate" type="date" value={vatStartDate} onChange={e => setVatStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="vatEndDate" className="block text-sm font-medium text-slate-600 mb-1">End Date</label>
                        <Input id="vatEndDate" type="date" value={vatEndDate} onChange={e => setVatEndDate(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => { setVatStartDate(''); setVatEndDate(''); }}>Clear Dates</Button>
                    <Button variant="primary" onClick={handleExportCsv}><DownloadIcon className="w-4 h-4 mr-2" />CSV</Button>
                    <Button variant="primary" onClick={handleExportPdf}><DownloadIcon className="w-4 h-4 mr-2" />PDF</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MetricCard title="VAT Payable (from Invoices)" value={formatCurrency(vatSummary.totalVatPayable)} />
                    <MetricCard title="VAT Reclaimable (from Purchases)" value={formatCurrency(vatSummary.totalVatReclaimable)} />
                    <MetricCard title="Net VAT Position" value={formatCurrency(vatSummary.netVatPosition)} description={vatSummary.netVatPosition >= 0 ? 'Amount you owe' : 'Amount you can reclaim'} />
                </div>
            </div>

            {/* Quotes & Purchase Orders & Bills & Drafts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                        <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-slate-600 mr-2" />
                        <h2 className="text-xl font-bold text-slate-800">Quotes</h2>
                    </div>
                    <MetricCard title="Total Quotes" value={String(quoteSummary.totalCount)} />
                    <MetricCard title="Total Value" value={formatCurrency(quoteSummary.totalValue)} />
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                        <ClipboardDocumentListIcon className="w-6 h-6 text-slate-600 mr-2" />
                        <h2 className="text-xl font-bold text-slate-800">POs</h2>
                    </div>
                    <MetricCard title="Total POs" value={String(poSummary.totalCount)} />
                    <MetricCard title="Total Value" value={formatCurrency(poSummary.totalValue)} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                        <ReceiptIcon className="w-6 h-6 text-slate-600 mr-2" />
                        <h2 className="text-xl font-bold text-slate-800">Bills</h2>
                    </div>
                    <MetricCard title="Total Bills" value={String(billSummary.totalCount)} />
                    <MetricCard title="Total Value" value={formatCurrency(billSummary.totalValue)} />
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                        <DocumentDuplicateIcon className="w-6 h-6 text-slate-600 mr-2" />
                        <h2 className="text-xl font-bold text-slate-800">Drafts</h2>
                    </div>
                    <MetricCard title="Total Drafts" value={String(draftSummary.totalCount)} />
                    <MetricCard title="Total Value" value={formatCurrency(draftSummary.totalValue)} />
                </div>
            </div>
        </div>
    );
};

// fix: Added default export to resolve "Module has no default export" error.
export default SummaryDashboard;
