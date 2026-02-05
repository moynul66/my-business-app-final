import React from 'react';
import { PurchaseOrderState, Supplier, AppSettings } from '../types';

interface PrintablePurchaseOrderProps {
    id: string;
    poState: PurchaseOrderState;
    settings: AppSettings;
    suppliers: Supplier[];
}

const PrintablePurchaseOrder: React.FC<PrintablePurchaseOrderProps> = ({
    id,
    poState,
    settings,
    suppliers,
}) => {
    const selectedSupplier = suppliers.find(s => s.id === poState.supplierId || s.name === poState.supplierName);
    const currency = settings.currencySymbol || '£';

    const totals = React.useMemo(() => {
        let subtotal = 0;
        let vatTotal = 0;
        let grandTotal = 0;
        
        poState.lineItems.forEach(item => {
            const priceAfterDiscount = item.quantity * item.unitPrice; // No discounts on POs
            
            if (poState.taxMode === 'inclusive') {
                const itemVatRate = 1 + (item.vatRate / 100);
                const exclusivePrice = priceAfterDiscount / itemVatRate;
                const itemVat = priceAfterDiscount - exclusivePrice;
                subtotal += exclusivePrice;
                vatTotal += itemVat;
                grandTotal += priceAfterDiscount;
            } else if (poState.taxMode === 'exclusive') {
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
    }, [poState.lineItems, poState.taxMode]);

    return (
        <div id={id} className="bg-white p-8 w-[210mm] min-h-[297mm] text-xs">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="whitespace-pre-wrap">{settings.companyAddress}</p>
                </div>
                <h1 className="text-3xl font-bold text-slate-400 uppercase tracking-widest">Purchase Order</h1>
            </header>

            <section className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <p className="font-bold text-slate-600 mb-1">Supplier:</p>
                    <p className="font-semibold">{poState.supplierName}</p>
                    {selectedSupplier && <p className="whitespace-pre-wrap text-slate-600">{selectedSupplier.address}</p>}
                </div>
                <div className="text-right">
                    <p><span className="font-bold text-slate-600">PO No:</span> {poState.poNumber}</p>
                    {poState.reference && <p><span className="font-bold text-slate-600">Reference:</span> {poState.reference}</p>}
                    <p><span className="font-bold text-slate-600">Date Ordered:</span> {poState.issueDate}</p>
                    <p><span className="font-bold text-slate-600">Expected Delivery:</span> {poState.deliveryDate}</p>
                </div>
            </section>
            
            <section>
                <table className="w-full text-left table-fixed text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className={`p-1 ${poState.taxMode === 'none' ? 'w-[60%]' : 'w-[50%]'}`}>Description</th>
                            <th className="p-1 text-right w-[10%]">Qty</th>
                            <th className="p-1 text-right w-[15%]">{poState.taxMode === 'inclusive' ? 'Unit Price (inc. Tax)' : 'Unit Price'}</th>
                            {poState.taxMode !== 'none' && <th className="p-1 text-right w-[10%]">VAT</th>}
                            <th className="p-1 text-right w-[15%]">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {poState.lineItems.map(item => {
                             const lineTotal = item.quantity * item.unitPrice;
                             const total = poState.taxMode === 'exclusive' ? lineTotal * (1 + item.vatRate/100) : lineTotal;
                            return (
                                <tr key={item.id} className="border-b">
                                    <td className="p-1 align-top">{item.description}</td>
                                    <td className="p-1 text-right align-top">{item.quantity}</td>
                                    <td className="p-1 text-right align-top">{currency}{item.unitPrice.toFixed(2)}</td>
                                    {poState.taxMode !== 'none' && <td className="p-1 text-right align-top">{item.vatRate}%</td>}
                                    <td className="p-1 text-right align-top font-medium">{currency}{total.toFixed(2)}</td>
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
                    {poState.taxMode !== 'none' && (
                    <div className="flex justify-between">
                        <span>VAT</span>
                        <span className="font-medium">{currency}{totals.vatTotal.toFixed(2)}</span>
                    </div>
                    )}
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between text-lg font-bold text-slate-900">
                        <span>Total</span>
                        <span>{currency}{totals.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </section>

             <section className="mt-8">
                {poState.notes && (
                     <div className="mb-4">
                        <p className="font-bold">Notes:</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{poState.notes}</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default PrintablePurchaseOrder;