import React from 'react';
import { Invoice, PurchaseOrder, Bill, AppSettings, InventoryItem, BillLineItem, PurchaseOrderLineItem, TaxMode, CreditNote } from '../types';
import { calculateBasePrice } from '../services/conversionService';

interface PrintableVatReportProps {
    id: string;
    filteredInvoices: Invoice[];
    filteredCreditNotes: CreditNote[];
    filteredPurchaseOrders: PurchaseOrder[];
    filteredBills: Bill[];
    vatSummary: { totalVatPayable: number; totalVatReclaimable: number; netVatPosition: number };
    settings: AppSettings;
    inventory: InventoryItem[];
    startDate: string;
    endDate: string;
}

const PrintableVatReport: React.FC<PrintableVatReportProps> = ({
    id,
    filteredInvoices,
    filteredCreditNotes,
    filteredPurchaseOrders,
    filteredBills,
    vatSummary,
    settings,
    inventory,
    startDate,
    endDate,
}) => {
    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const getLineItemVat = (lineItems: any[], taxMode: TaxMode) => {
        let subtotal = 0;
        let vatTotal = 0;
        lineItems.forEach(item => {
            let basePrice;
            const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);
            if (selectedInventoryItem) {
                basePrice = calculateBasePrice(selectedInventoryItem, item);
            } else {
                basePrice = (item.price || 0) * item.quantity;
            }
            const discountAmount = item.discount.type === 'percentage' ? basePrice * (item.discount.value / 100) : item.discount.value;
            const priceAfterDiscount = basePrice - discountAmount;
            
            if (taxMode === 'inclusive') {
                const exclusivePrice = priceAfterDiscount / (1 + item.vatRate / 100);
                subtotal += exclusivePrice;
                vatTotal += priceAfterDiscount - exclusivePrice;
            } else if (taxMode === 'exclusive') {
                subtotal += priceAfterDiscount;
                vatTotal += priceAfterDiscount * (item.vatRate / 100);
            } else {
                subtotal += priceAfterDiscount;
            }
        });
        return { subtotal, vatTotal };
    };

    const getPurchaseLineVat = (items: (PurchaseOrderLineItem[] | BillLineItem[]), taxMode: TaxMode) => {
        let subtotal = 0;
        let vatTotal = 0;
        items.forEach(item => {
            const price = item.quantity * item.unitPrice;
            if (taxMode === 'inclusive') {
                const exclusivePrice = price / (1 + item.vatRate / 100);
                subtotal += exclusivePrice;
                vatTotal += price - exclusivePrice;
            } else if (taxMode === 'exclusive') {
                subtotal += price;
                vatTotal += price * (item.vatRate / 100);
            } else {
                subtotal += price;
            }
        });
        return { subtotal, vatTotal };
    };

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                    {settings.vatNumber && <p>VAT: {settings.vatNumber}</p>}
                </div>
                <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">VAT Summary Report</h1>
            </header>

            <section className="mb-8">
                <p><span className="font-bold text-slate-600">Report Date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-bold text-slate-600">Period:</span> {startDate || 'Start'} to {endDate || 'End'}</p>
            </section>
            
            <section className="mb-8 p-4 bg-slate-50 rounded-lg grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="font-bold text-slate-600">VAT Payable (Sales)</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(vatSummary.totalVatPayable)}</p>
                </div>
                 <div className="text-center">
                    <p className="font-bold text-slate-600">VAT Reclaimable (Purchases)</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(vatSummary.totalVatReclaimable)}</p>
                </div>
                 <div className="text-center">
                    <p className="font-bold text-slate-600">Net VAT Position</p>
                    <p className="text-lg font-bold">{formatCurrency(vatSummary.netVatPosition)}</p>
                </div>
            </section>
            
            <section className="mb-8">
                <h3 className="font-bold text-slate-800 text-base mb-2">VAT on Sales (Payable)</h3>
                <table className="w-full text-left table-fixed text-xs">
                    <thead><tr className="bg-slate-100 text-slate-600">
                        <th className="p-1 w-[15%]">Date</th><th className="p-1 w-[20%]">Document #</th><th className="p-1 w-[35%]">Customer</th>
                        <th className="p-1 text-right w-[10%]">Net</th><th className="p-1 text-right w-[10%]">VAT</th><th className="p-1 text-right w-[10%]">Total</th>
                    </tr></thead>
                    <tbody>
                        {filteredInvoices.map(inv => {
                            const { subtotal, vatTotal } = getLineItemVat(inv.state.lineItems, inv.state.taxMode);
                            return (
                            <tr key={inv.id} className="border-b"><td className="p-1">{inv.state.issueDate}</td><td className="p-1">{inv.state.invoiceNumber}</td>
                            <td className="p-1">{inv.state.customerName}</td><td className="p-1 text-right">{formatCurrency(subtotal)}</td>
                            <td className="p-1 text-right">{formatCurrency(vatTotal)}</td><td className="p-1 text-right">{formatCurrency(inv.total)}</td></tr>
                        )})}
                        {filteredCreditNotes.map(cn => {
                            const { subtotal, vatTotal } = getLineItemVat(cn.state.lineItems, cn.state.taxMode);
                            return (
                                <tr key={`cn-${cn.id}`} className="border-b">
                                    <td className="p-1">{cn.state.issueDate}</td>
                                    <td className="p-1">{cn.state.creditNoteNumber} (CN)</td>
                                    <td className="p-1">{cn.state.customerName}</td>
                                    <td className="p-1 text-right text-red-600">({formatCurrency(subtotal)})</td>
                                    <td className="p-1 text-right text-red-600">({formatCurrency(vatTotal)})</td>
                                    <td className="p-1 text-right text-red-600">({formatCurrency(cn.total)})</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

             <section>
                <h3 className="font-bold text-slate-800 text-base mb-2">VAT on Purchases (Reclaimable)</h3>
                <table className="w-full text-left table-fixed text-xs">
                     <thead><tr className="bg-slate-100 text-slate-600">
                        <th className="p-1 w-[15%]">Date</th><th className="p-1 w-[20%]">Document #</th><th className="p-1 w-[35%]">Supplier</th>
                        <th className="p-1 text-right w-[10%]">Net</th><th className="p-1 text-right w-[10%]">VAT</th><th className="p-1 text-right w-[10%]">Total</th>
                    </tr></thead>
                    <tbody>
                        {filteredPurchaseOrders.map(po => {
                            const { subtotal, vatTotal } = getPurchaseLineVat(po.state.lineItems, po.state.taxMode);
                            return (
                             <tr key={`po-${po.id}`} className="border-b"><td className="p-1">{po.state.issueDate}</td><td className="p-1">{po.state.poNumber} (PO)</td>
                            <td className="p-1">{po.state.supplierName}</td><td className="p-1 text-right">{formatCurrency(subtotal)}</td>
                            <td className="p-1 text-right">{formatCurrency(vatTotal)}</td><td className="p-1 text-right">{formatCurrency(po.total)}</td></tr>
                        )})}
                         {filteredBills.map(bill => {
                            const { subtotal, vatTotal } = getPurchaseLineVat(bill.state.lineItems, bill.state.taxMode);
                            return (
                             <tr key={`bill-${bill.id}`} className="border-b"><td className="p-1">{bill.state.issueDate}</td><td className="p-1">{bill.state.reference} (Bill)</td>
                            <td className="p-1">{bill.state.supplierName}</td><td className="p-1 text-right">{formatCurrency(subtotal)}</td>
                            <td className="p-1 text-right">{formatCurrency(vatTotal)}</td><td className="p-1 text-right">{formatCurrency(bill.total)}</td></tr>
                        )})}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default PrintableVatReport;