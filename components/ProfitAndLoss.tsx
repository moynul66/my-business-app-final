
import React, { useState, useMemo } from 'react';
import { Invoice, PurchaseOrder, Bill, InventoryItem, AppSettings, TaxMode, BillLineItem, PurchaseOrderLineItem, MarketplaceStatement, CreditNote } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { DownloadIcon } from './icons/DownloadIcon';
import { calculateBasePrice } from '../services/conversionService';
import { exportToCsv } from '../services/csvService';

interface ProfitAndLossProps {
    invoices: Invoice[];
    purchaseOrders: PurchaseOrder[];
    bills: Bill[];
    inventory: InventoryItem[];
    creditNotes: CreditNote[];
    marketplaceStatements: MarketplaceStatement[];
    settings: AppSettings;
    onDownloadPdf: (data: any, type: string) => void;
}

const ProfitAndLoss: React.FC<ProfitAndLossProps> = ({ invoices, purchaseOrders, bills, inventory, creditNotes, marketplaceStatements, settings, onDownloadPdf }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const currency = settings.currencySymbol || '£';

    const formatCurrency = (amount: number) => {
        const value = amount.toFixed(2);
        return amount < 0 ? `-${currency}${Math.abs(amount).toFixed(2)}` : `${currency}${value}`;
    }

    const filteredDocuments = useMemo(() => {
        const filterByDate = (item: { state: { issueDate: string } } | { startDate: string }): boolean => {
            const issueDate = 'state' in item ? new Date(item.state.issueDate) : new Date(item.startDate);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);
            
            if (start && issueDate < start) return false;
            if (end && issueDate > end) return false;
            return true;
        };

        return {
            invoices: invoices.filter(filterByDate),
            purchaseOrders: purchaseOrders.filter(filterByDate),
            bills: bills.filter(filterByDate),
            creditNotes: creditNotes.filter(filterByDate),
        };
    }, [invoices, purchaseOrders, bills, creditNotes, marketplaceStatements, startDate, endDate]);

    // Renamed to businessReportData to distinguish from marketplace data
    const businessReportData = useMemo(() => {
        let totalRevenue = 0;
        let vatOnSales = 0;
        let cogs = 0;
        let vatOnPurchases = 0;

        filteredDocuments.invoices.forEach(invoice => {
            invoice.state.lineItems.forEach(item => {
                let basePrice;
                const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);
                if (selectedInventoryItem) {
                    basePrice = calculateBasePrice(selectedInventoryItem, item);
                } else {
                    basePrice = (item.price || 0) * item.quantity;
                }
                const discountAmount = item.discount.type === 'percentage' ? basePrice * (item.discount.value / 100) : item.discount.value;
                const priceAfterDiscount = basePrice - discountAmount;
                
                if (invoice.state.taxMode === 'inclusive') {
                    const exclusivePrice = priceAfterDiscount / (1 + item.vatRate / 100);
                    totalRevenue += exclusivePrice;
                    vatOnSales += priceAfterDiscount - exclusivePrice;
                } else { // exclusive or none
                    totalRevenue += priceAfterDiscount;
                    vatOnSales += priceAfterDiscount * (item.vatRate / 100);
                }
            });
        });
        
        filteredDocuments.creditNotes.forEach(cn => {
            cn.state.lineItems.forEach(item => {
                let basePrice;
                const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);
                if (selectedInventoryItem) {
                    basePrice = calculateBasePrice(selectedInventoryItem, item);
                } else {
                    basePrice = (item.price || 0) * item.quantity;
                }
                const discountAmount = item.discount.type === 'percentage' ? basePrice * (item.discount.value / 100) : item.discount.value;
                const priceAfterDiscount = basePrice - discountAmount;
                
                if (cn.state.taxMode === 'inclusive') {
                    const exclusivePrice = priceAfterDiscount / (1 + item.vatRate / 100);
                    totalRevenue -= exclusivePrice;
                    vatOnSales -= (priceAfterDiscount - exclusivePrice);
                } else { // exclusive or none
                    totalRevenue -= priceAfterDiscount;
                    vatOnSales -= (priceAfterDiscount * (item.vatRate / 100));
                }
            });
        });

        const calculatePurchaseCosts = (items: (PurchaseOrderLineItem[] | BillLineItem[]), taxMode: TaxMode) => {
            let subtotal = 0;
            let vatTotal = 0;
            items.forEach(item => {
                const price = item.quantity * item.unitPrice;
                if (taxMode === 'inclusive') {
                    const exclusivePrice = price / (1 + item.vatRate / 100);
                    subtotal += exclusivePrice;
                    vatTotal += price - exclusivePrice;
                } else { // exclusive or none
                    subtotal += price;
                    vatTotal += price * (item.vatRate / 100);
                }
            });
            return { subtotal, vatTotal };
        };

        filteredDocuments.purchaseOrders.forEach(po => {
            const { subtotal, vatTotal } = calculatePurchaseCosts(po.state.lineItems, po.state.taxMode);
            cogs += subtotal;
            vatOnPurchases += vatTotal;
        });

        filteredDocuments.bills.forEach(bill => {
            const { subtotal, vatTotal } = calculatePurchaseCosts(bill.state.lineItems, bill.state.taxMode);
            cogs += subtotal;
            vatOnPurchases += vatTotal;
        });

        const grossProfit = totalRevenue - cogs;
        const netVatPosition = vatOnSales - vatOnPurchases;
        const netProfit = grossProfit - netVatPosition;

        return { totalRevenue, cogs, grossProfit, vatOnSales, vatOnPurchases, netVatPosition, netProfit };
    }, [filteredDocuments, inventory]);

    const handleDownloadCsv = () => {
        const data = [
            { Item: 'PROFIT & LOSS REPORT', Value: '' },
            { Item: 'Period', Value: `${startDate || 'Start'} to ${endDate || 'End'}` },
            { Item: '', Value: '' },
            { Item: 'Total Revenue (ex. VAT)', Value: businessReportData.totalRevenue.toFixed(2) },
            { Item: 'Cost of Goods Sold (ex. VAT)', Value: `-${businessReportData.cogs.toFixed(2)}` },
            { Item: 'Gross Profit', Value: businessReportData.grossProfit.toFixed(2) },
            { Item: '', Value: '' },
            { Item: 'VAT SUMMARY', Value: '' },
            { Item: 'VAT on Sales (Payable)', Value: businessReportData.vatOnSales.toFixed(2) },
            { Item: 'VAT on Purchases (Reclaimable)', Value: `-${businessReportData.vatOnPurchases.toFixed(2)}` },
            { Item: 'Net VAT Position', Value: businessReportData.netVatPosition.toFixed(2) },
            { Item: '', Value: '' },
            { Item: 'Net Profit/Loss', Value: businessReportData.netProfit.toFixed(2) },
        ];
        exportToCsv(`Profit_Loss_Report_${startDate || 'start'}_to_${endDate || 'end'}.csv`, data);
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
                <Button variant="primary" onClick={() => onDownloadPdf({ reportData: businessReportData, startDate, endDate, settings }, 'pnl-report')}><DownloadIcon className="w-4 h-4 mr-2" />PDF</Button>
            </div>

            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Business Profit & Loss</h2>
                <div className="p-6 rounded-lg bg-slate-100">
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-4 rounded">
                            <p className="text-sm font-medium text-green-700">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-900">{formatCurrency(businessReportData.totalRevenue)}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded">
                            <p className="text-sm font-medium text-red-700">Cost of Goods Sold</p>
                            <p className="text-2xl font-bold text-red-900">{formatCurrency(businessReportData.cogs)}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded">
                            <p className="text-sm font-medium text-blue-700">Gross Profit</p>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(businessReportData.grossProfit)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-lg bg-slate-100">
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">VAT Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-orange-50 p-4 rounded">
                            <p className="text-sm font-medium text-orange-700">VAT on Sales (Payable)</p>
                            <p className="text-2xl font-bold text-orange-900">{formatCurrency(businessReportData.vatOnSales)}</p>
                        </div>
                        <div className="bg-teal-50 p-4 rounded">
                            <p className="text-sm font-medium text-teal-700">VAT on Purchases (Reclaimable)</p>
                            <p className="text-2xl font-bold text-teal-900">{formatCurrency(businessReportData.vatOnPurchases)}</p>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded">
                            <p className="text-sm font-medium text-indigo-700">Net VAT Position</p>
                            <p className="text-2xl font-bold text-indigo-900">{formatCurrency(businessReportData.netVatPosition)}</p>
                            <p className="text-xs text-indigo-600">{businessReportData.netVatPosition >= 0 ? 'Amount you owe' : 'Amount you can reclaim'}</p>
                        </div>
                    </div>
                </div>
                 <div className="p-6 rounded-lg bg-slate-100">
                     <h3 className="text-xl font-semibold text-slate-800 mb-4">Net Profit / Loss</h3>
                     <div className="text-center bg-purple-50 p-4 rounded">
                         <p className="text-sm font-medium text-purple-700">Net Profit/Loss</p>
                         <p className="text-2xl font-bold text-purple-900">{formatCurrency(businessReportData.netProfit)}</p>
                         <p className="text-xs text-slate-500">(Gross Profit - Net VAT Position)</p>
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default ProfitAndLoss;
