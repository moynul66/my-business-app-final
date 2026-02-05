import React from 'react';
import {
    InvoiceState,
    InventoryItem,
    Customer,
    AppSettings,
    AddOnOption,
} from '../types';
import { calculateBasePrice } from '../services/conversionService';

interface PrintableDocumentProps {
    id: string;
    invoiceState: InvoiceState;
    settings: AppSettings;
    inventory: InventoryItem[];
    customers: Customer[];
    mode: 'invoice' | 'quote';
    appliedCredits?: { number: string; amount: number }[];
}

const PrintableDocument: React.FC<PrintableDocumentProps> = ({
    id,
    invoiceState,
    settings,
    inventory,
    customers,
    mode,
    appliedCredits = [],
}) => {
    const selectedCustomer = customers.find(c => c.name === invoiceState.customerName);
    const title = mode === 'invoice' ? (settings.invoiceTitle || 'Invoice') : (settings.quoteTitle || 'Quote');
    const currency = settings.currencySymbol || '£';

    const totals = React.useMemo(() => {
        let subtotal = 0;
        let vatTotal = 0;
        let grandTotal = 0;

        invoiceState.lineItems.forEach(item => {
            let basePrice;
            const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);

            if (selectedInventoryItem) {
                const parent = selectedInventoryItem.parentId ? inventory.find(p => p.id === selectedInventoryItem.parentId) : null;
                const rawAddOns = [...(selectedInventoryItem.addOnOptions || []), ...(parent?.addOnOptions || [])];
                // Deduplicate by Name + Price
                const availableAddOns = Array.from(
                    new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
                );
                basePrice = calculateBasePrice({ ...selectedInventoryItem, addOnOptions: availableAddOns }, item);
            } else {
                basePrice = (item.price || 0) * item.quantity;
            }
            
            const discountAmount = item.discount.type === 'percentage'
                ? basePrice * (item.discount.value / 100)
                : item.discount.value;

            const priceAfterDiscount = basePrice - discountAmount;
            
            if (invoiceState.taxMode === 'inclusive') {
                const itemVatRate = 1 + (item.vatRate / 100);
                const exclusivePrice = priceAfterDiscount / itemVatRate;
                const itemVat = priceAfterDiscount - exclusivePrice;
                
                subtotal += exclusivePrice;
                vatTotal += itemVat;
                grandTotal += priceAfterDiscount;

            } else if (invoiceState.taxMode === 'exclusive') {
                const itemVat = priceAfterDiscount * (item.vatRate / 100);
                
                subtotal += priceAfterDiscount;
                vatTotal += itemVat;
                grandTotal += priceAfterDiscount + itemVat;

            } else { // 'none'
                subtotal += priceAfterDiscount;
                grandTotal += priceAfterDiscount;
            }
        });

        return { subtotal, vatTotal, grandTotal };
    }, [invoiceState.lineItems, inventory, invoiceState.taxMode]);

    const totalCredited = appliedCredits.reduce((sum, cn) => sum + cn.amount, 0);

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
                    <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">{title}</h1>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <p className="font-bold text-slate-600 mb-1">Bill To:</p>
                    <p className="font-semibold">{invoiceState.customerName}</p>
                    {selectedCustomer?.contactName && <p className="text-slate-600">Attn: {selectedCustomer.contactName}</p>}
                    {selectedCustomer && <p className="whitespace-pre-wrap text-slate-600">{selectedCustomer.address}</p>}
                </div>
                <div className="text-right">
                    <p><span className="font-bold text-slate-600">{title} No:</span> {invoiceState.invoiceNumber}</p>
                    {invoiceState.reference && <p><span className="font-bold text-slate-600">Reference:</span> {invoiceState.reference}</p>}
                    <p><span className="font-bold text-slate-600">Date Issued:</span> {invoiceState.issueDate}</p>
                    {mode === 'invoice' && <p><span className="font-bold text-slate-600">Date Due:</span> {invoiceState.dueDate}</p>}
                </div>
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className={`p-1 ${invoiceState.taxMode === 'none' ? 'w-[50%]' : 'w-[40%]'}`}>Description</th>
                            <th className="p-1 text-right w-[10%]">Qty</th>
                            <th className="p-1 text-right w-[15%]">{invoiceState.taxMode === 'inclusive' ? 'Unit Price (inc. Tax)' : 'Unit Price'}</th>
                            <th className="p-1 text-right w-[10%]">Discount</th>
                            {invoiceState.taxMode !== 'none' && <th className="p-1 text-right w-[10%]">VAT</th>}
                            <th className="p-1 text-right w-[15%]">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceState.lineItems.map(item => {
                             const inventoryItem = inventory.find(i => i.id === item.inventoryItemId);
                             const parent = inventoryItem?.parentId ? inventory.find(p => p.id === inventoryItem.parentId) : null;
                             const rawAddOns = [...(inventoryItem?.addOnOptions || []), ...(parent?.addOnOptions || [])];
                             // Deduplicate by Name + Price
                             const availableAddOns = Array.from(
                                 new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
                             );
                             
                             let basePrice: number;
                             let unitPrice: number;
                             let name: string;
                             let description: string = item.description;

                             if (inventoryItem) {
                                basePrice = calculateBasePrice({ ...inventoryItem, addOnOptions: availableAddOns }, item);
                                unitPrice = item.quantity !== 0 ? basePrice / item.quantity : 0;
                                name = inventoryItem.name;
                                
                                const selectedAddOnNames = (item.selectedAddOnIds || [])
                                    .map(id => {
                                        const opt = availableAddOns.find(o => o.id === id);
                                        return opt ? `${opt.name} (+${currency}${opt.price.toFixed(2)})` : null;
                                    })
                                    .filter(Boolean)
                                    .join(', ');
                                
                                if (selectedAddOnNames) {
                                    description = (description ? description + '\n' : '') + 'Options: ' + selectedAddOnNames;
                                }
                             } else {
                                basePrice = (item.price || 0) * item.quantity;
                                unitPrice = item.price || 0;
                                
                                const descriptionParts = item.description.split('\n');
                                name = descriptionParts[0] || '';
                                description = descriptionParts.slice(1).join('\n');
                             }

                             const discountAmount = item.discount.type === 'percentage'
                                ? basePrice * (item.discount.value / 100)
                                : item.discount.value;
                             const priceAfterDiscount = basePrice - discountAmount;
                             
                             let itemTotal: number;
                             if (invoiceState.taxMode === 'exclusive') {
                                 const vatAmount = priceAfterDiscount * (item.vatRate / 100);
                                 itemTotal = priceAfterDiscount + vatAmount;
                             } else {
                                 itemTotal = priceAfterDiscount;
                             }

                            return (
                                <tr key={item.id} className="border-b">
                                    <td className="p-1 align-top">
                                        <p className="font-medium">{name}</p>
                                        <p className="text-slate-500 whitespace-pre-wrap">{description}</p>
                                    </td>
                                    <td className="p-1 text-right align-top">{item.quantity}</td>
                                    <td className="p-1 text-right align-top">{currency}{unitPrice.toFixed(2)}</td>
                                    <td className="p-1 text-right align-top">{currency}{discountAmount.toFixed(2)}</td>
                                    {invoiceState.taxMode !== 'none' && <td className="p-1 text-right align-top">{item.vatRate}%</td>}
                                    <td className="p-1 text-right align-top font-medium">{currency}{itemTotal.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

             <section className="mt-8 flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium">{currency}{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {invoiceState.taxMode !== 'none' && (
                    <div className="flex justify-between">
                        <span>VAT</span>
                        <span className="font-medium">{currency}{totals.vatTotal.toFixed(2)}</span>
                    </div>
                    )}
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between text-lg font-bold text-slate-900">
                        <span>{mode === 'invoice' ? 'Invoice Total' : 'Total'}</span>
                        <span>{currency}{totals.grandTotal.toFixed(2)}</span>
                    </div>

                    {mode === 'invoice' && appliedCredits.length > 0 && (
                        <>
                            {appliedCredits.map(cn => (
                                <div key={cn.number} className="flex justify-between text-sm text-slate-700">
                                    <span>Credit Note #{cn.number}</span>
                                    <span className="font-medium text-red-600">-{currency}{cn.amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </>
                    )}

                    {mode === 'invoice' && (
                        <div className="flex justify-between text-lg font-bold text-slate-900 bg-slate-100 p-2 rounded mt-2">
                            <span>Amount Due</span>
                            <span>{currency}{(totals.grandTotal - totalCredited).toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </section>

            <section className="mt-8">
                {invoiceState.notes && (
                     <div className="mb-4">
                        <p className="font-bold">Notes:</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{invoiceState.notes}</p>
                    </div>
                )}
                <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-lg">
                    <p className="font-bold mb-1">Payment Details:</p>
                    <p>{settings.paymentTerms}</p>
                    <p>Bank: {settings.bankName}</p>
                    <p>A/N: {settings.accountNumber} | Sort Code: {settings.sortCode}</p>
                </div>
            </section>
        </div>
    );
};

export default PrintableDocument;