import React from 'react';
import {
    CreditNote,
    InventoryItem,
    Customer,
    AppSettings,
} from '../types';
import { calculateBasePrice } from '../services/conversionService';

interface PrintableCreditNoteProps {
    id: string;
    creditNote: CreditNote;
    settings: AppSettings;
    inventory: InventoryItem[];
    customers: Customer[];
}

const PrintableCreditNote: React.FC<PrintableCreditNoteProps> = ({
    id,
    creditNote,
    settings,
    inventory,
    customers,
}) => {
    const { state } = creditNote;
    const selectedCustomer = customers.find(c => c.name === state.customerName);
    const currency = settings.currencySymbol || '£';

    const totals = React.useMemo(() => {
        let subtotal = 0;
        let vatTotal = 0;
        let grandTotal = 0;

        state.lineItems.forEach(item => {
            let basePrice;
            const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);

            if (selectedInventoryItem) {
                basePrice = calculateBasePrice(selectedInventoryItem, item);
            } else {
                basePrice = (item.price || 0) * item.quantity;
            }
            
            const discountAmount = item.discount.type === 'percentage'
                ? basePrice * (item.discount.value / 100)
                : item.discount.value;

            const priceAfterDiscount = basePrice - discountAmount;
            
            if (state.taxMode === 'inclusive') {
                const itemVatRate = 1 + (item.vatRate / 100);
                const exclusivePrice = priceAfterDiscount / itemVatRate;
                const itemVat = priceAfterDiscount - exclusivePrice;
                
                subtotal += exclusivePrice;
                vatTotal += itemVat;
                grandTotal += priceAfterDiscount;

            } else if (state.taxMode === 'exclusive') {
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
    }, [state.lineItems, inventory, state.taxMode]);


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
                    <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Credit Note</h1>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <p className="font-bold text-slate-600 mb-1">Credit To:</p>
                    <p className="font-semibold">{state.customerName}</p>
                    {selectedCustomer && <p className="whitespace-pre-wrap text-slate-600">{selectedCustomer.address}</p>}
                </div>
                <div className="text-right">
                    <p><span className="font-bold text-slate-600">Credit Note No:</span> {state.creditNoteNumber}</p>
                    <p><span className="font-bold text-slate-600">Original Invoice:</span> {state.originalInvoiceNumber}</p>
                    <p><span className="font-bold text-slate-600">Date Issued:</span> {state.issueDate}</p>
                </div>
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className={`p-1 ${state.taxMode === 'none' ? 'w-[50%]' : 'w-[40%]'}`}>Description</th>
                            <th className="p-1 text-right w-[10%]">Qty</th>
                            <th className="p-1 text-right w-[15%]">{state.taxMode === 'inclusive' ? 'Unit Price (inc. Tax)' : 'Unit Price'}</th>
                            <th className="p-1 text-right w-[10%]">Discount</th>
                            {state.taxMode !== 'none' && <th className="p-1 text-right w-[10%]">VAT</th>}
                            <th className="p-1 text-right w-[15%]">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.lineItems.map(item => {
                             const inventoryItem = inventory.find(i => i.id === item.inventoryItemId);
                             let basePrice, unitPrice, name;
                             if (inventoryItem) {
                                basePrice = calculateBasePrice(inventoryItem, item);
                                unitPrice = item.quantity !== 0 ? basePrice / item.quantity : 0;
                                name = inventoryItem.name;
                             } else {
                                basePrice = (item.price || 0) * item.quantity;
                                unitPrice = item.price || 0;
                                name = item.description;
                             }

                             const discountAmount = item.discount.type === 'percentage' ? basePrice * (item.discount.value / 100) : item.discount.value;
                             const priceAfterDiscount = basePrice - discountAmount;
                             
                             let itemTotal = state.taxMode === 'exclusive' ? priceAfterDiscount * (1 + item.vatRate/100) : priceAfterDiscount;

                            return (
                                <tr key={item.id} className="border-b">
                                    <td className="p-1 align-top"><p className="font-medium">{name}</p></td>
                                    <td className="p-1 text-right align-top">{item.quantity}</td>
                                    <td className="p-1 text-right align-top">{currency}{unitPrice.toFixed(2)}</td>
                                    <td className="p-1 text-right align-top">{currency}{discountAmount.toFixed(2)}</td>
                                    {state.taxMode !== 'none' && <td className="p-1 text-right align-top">{item.vatRate}%</td>}
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
                    {state.taxMode !== 'none' && (
                    <div className="flex justify-between">
                        <span>VAT</span>
                        <span className="font-medium">{currency}{totals.vatTotal.toFixed(2)}</span>
                    </div>
                    )}
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between text-lg font-bold text-slate-900">
                        <span>Total Credit</span>
                        <span>{currency}{totals.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </section>

            <section className="mt-8">
                {state.notes && (
                     <div className="mb-4">
                        <p className="font-bold">Notes:</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{state.notes}</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default PrintableCreditNote;
