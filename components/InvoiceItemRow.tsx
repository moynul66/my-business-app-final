import React, { useMemo, useRef, useLayoutEffect } from 'react';
import {
    InvoiceLineItem,
    InventoryItem,
    ItemType,
    MeasurementUnit,
    TaxMode,
    AppSettings,
    Account,
} from '../types';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { SearchIcon } from './icons/SearchIcon';
import { calculateBasePrice, isAreaUnit } from '../services/conversionService';
import { PlusIcon } from './icons/PlusIcon';

interface InvoiceItemRowProps {
    item: InvoiceLineItem;
    inventory: InventoryItem[];
    taxMode: TaxMode;
    settings: AppSettings;
    accounts?: Account[]; // Made optional to be safe
    onUpdate: (id: string, updates: Partial<InvoiceLineItem>) => void;
    onRemove: (id: string) => void;
    onOpenSearch: (id: string) => void;
    onOpenAddOns?: (id: string) => void;
    readOnly?: boolean;
}

const areaMeasurementUnits = Object.values(MeasurementUnit).filter(u => isAreaUnit(u));

const InvoiceItemRow: React.FC<InvoiceItemRowProps> = ({ item, inventory, taxMode, settings, accounts = [], onUpdate, onRemove, onOpenSearch, onOpenAddOns, readOnly = false }) => {
    const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);
    const parentItem = selectedInventoryItem?.parentId ? inventory.find(i => i.id === selectedInventoryItem.parentId) : null;
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const currency = settings.currencySymbol || '£';
    const showAccount = settings.showAccountOnInvoices ?? true;

    useLayoutEffect(() => {
        if (descriptionRef.current) {
            // Reset height to auto to ensure scrollHeight is calculated correctly based on content
            descriptionRef.current.style.height = 'auto';
            
            // Only set explicit height if there is content. 
            // This prevents a layout bug where an initially empty field in a constrained container 
            // (e.g., first item in a new invoice) calculates a large scrollHeight due to placeholder wrapping.
            if (item.description) {
                descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
            }
        }
    }, [item.description]);

    const handleFieldChange = (field: keyof InvoiceLineItem, value: any) => {
        onUpdate(item.id, { [field]: value });
    };

    const handleDiscountChange = (field: 'type' | 'value', value: any) => {
        const newDiscount = { ...item.discount, [field]: value };
        if (field === 'value') {
            value = parseFloat(value) || 0;
        }
        onUpdate(item.id, { discount: { ...item.discount, [field]: value } });
    };

    const total = useMemo(() => {
        let basePrice: number;
        if (!selectedInventoryItem) {
            // Manual item
            basePrice = (item.price || 0) * item.quantity;
        } else {
            // Inventory item
            const rawAddOns = [...(selectedInventoryItem.addOnOptions || []), ...(parentItem?.addOnOptions || [])];
            // Deduplicate by Name + Price
            const availableAddOns = Array.from(
                new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
            );
            basePrice = calculateBasePrice({ ...selectedInventoryItem, addOnOptions: availableAddOns }, item);
        }
        
        const discountAmount = item.discount.type === 'percentage'
            ? basePrice * (item.discount.value / 100)
            : item.discount.value;
        const priceAfterDiscount = basePrice - discountAmount;
        
        if (taxMode === 'exclusive') {
            const vatAmount = priceAfterDiscount * (item.vatRate / 100);
            return priceAfterDiscount + vatAmount;
        }
        
        return priceAfterDiscount;

    }, [item, selectedInventoryItem, parentItem, taxMode]);

    // Group accounts by type for the dropdown, prioritized order
    const groupedAccounts = useMemo(() => {
        const groups: Record<string, Account[]> = {
            'Income': [],
            'Expenses': [],
            'Assets': [],
            'Liabilities': [],
            'Equity': []
        };
        
        accounts.forEach(acc => {
            if (groups[acc.type]) {
                groups[acc.type].push(acc);
            } else {
                // Fallback for any unknown types
                if (!groups['Other']) groups['Other'] = [];
                groups['Other'].push(acc);
            }
        });
        return groups;
    }, [accounts]);

    const accountTypeOrder = ['Income', 'Expenses', 'Assets', 'Liabilities', 'Equity'];
    
    const availableAddOns = useMemo(() => {
        if (!selectedInventoryItem) return [];
        const rawAddOns = [...(selectedInventoryItem.addOnOptions || []), ...(parentItem?.addOnOptions || [])];
        // Deduplicate by Name + Price
        return Array.from(
            new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
        );
    }, [selectedInventoryItem, parentItem]);

    const selectedAddOnNames = useMemo(() => {
        if (!item.selectedAddOnIds || item.selectedAddOnIds.length === 0) return '';
        return item.selectedAddOnIds.map(id => {
            const opt = availableAddOns.find(o => o.id === id);
            return opt ? `${opt.name} (+${currency}${opt.price.toFixed(2)})` : null;
        }).filter(Boolean).join(', ');
    }, [item.selectedAddOnIds, availableAddOns, currency]);

    return (
        <fieldset disabled={readOnly} className="bg-slate-50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-[repeat(24,minmax(0,1fr))] gap-x-1 gap-y-2 items-start text-sm disabled:opacity-70">
            {/* Item / Description */}
            <div className={`col-span-1 ${showAccount ? (taxMode === 'none' ? 'sm:col-span-5' : 'sm:col-span-4') : (taxMode === 'none' ? 'sm:col-span-7' : 'sm:col-span-6')}`}>
                <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Item / Description</div>
                <div className="flex items-start gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onOpenSearch(item.id)}
                        type="button"
                        title={selectedInventoryItem ? `Change item: ${selectedInventoryItem.name}` : 'Search & Select Item...'}
                    >
                        <SearchIcon className="w-5 h-5" />
                    </Button>
                    <div className="flex-grow flex flex-col gap-1">
                        <TextArea
                            ref={descriptionRef}
                            value={item.description}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            placeholder="Item description..."
                            rows={1}
                            className="resize-none text-left !py-1.5 w-full"
                        />
                        {selectedInventoryItem && availableAddOns.length > 0 && !readOnly && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="!py-0.5 !px-2 text-[10px] h-auto" 
                                    onClick={() => onOpenAddOns?.(item.id)}
                                >
                                    <PlusIcon className="w-3 h-3 mr-1" /> Add-ons
                                </Button>
                                {selectedAddOnNames && (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 italic truncate max-w-[200px]" title={selectedAddOnNames}>
                                        {selectedAddOnNames}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Account */}
            {showAccount && (
                <div className="col-span-1 sm:col-span-4">
                    <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Account</div>
                    <Select
                        value={item.accountId || ''}
                        onChange={(e) => handleFieldChange('accountId', e.target.value)}
                        className="!py-1.5 w-full"
                    >
                        <option value="">Select Account</option>
                        {accountTypeOrder.map(type => {
                            const typeAccounts = groupedAccounts[type];
                            if (!typeAccounts || typeAccounts.length === 0) return null;
                            
                            return (
                                <optgroup key={type} label={type}>
                                    {typeAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.code ? `${acc.code} – ${acc.name}` : acc.name}
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </Select>
                </div>
            )}
            
            {/* Unit Price / Dimensions */}
            <div className={`col-span-1 ${showAccount ? (taxMode === 'none' ? 'sm:col-span-7' : 'sm:col-span-6') : (taxMode === 'none' ? 'sm:col-span-9' : 'sm:col-span-8')}`}>
                <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">{taxMode === 'inclusive' ? 'Unit Price (inc. Tax)' : 'Unit Price'} / Dimensions</div>
                {!selectedInventoryItem ? (
                    <Input
                        type="number"
                        placeholder="Unit Price"
                        value={item.price ?? ''}
                        onChange={e => handleFieldChange('price', parseFloat(e.target.value) || 0)}
                        className="text-left !py-1.5 no-spinners w-full"
                        aria-label="Unit Price for Manual Entry Only"
                    />
                ) : selectedInventoryItem.type === ItemType.MEASURED ? (
                    <div className="grid grid-cols-3 gap-1">
                        <Input type="number" placeholder="L" value={item.length || ''} onChange={e => handleFieldChange('length', parseFloat(e.target.value))} className="text-left !py-1.5 no-spinners" />
                        <Input type="number" placeholder="W" value={item.width || ''} onChange={e => handleFieldChange('width', parseFloat(e.target.value))} className="text-left !py-1.5 no-spinners" />
                        <Select value={item.unit || ''} onChange={e => handleFieldChange('unit', e.target.value as MeasurementUnit)} className="!py-1.5 !px-1">
                            {areaMeasurementUnits.map(u => <option key={u} value={u}>{u}</option>)}
                        </Select>
                    </div>
                ) : (
                    <div className="text-slate-500 h-full flex items-center pl-2 text-sm border rounded bg-slate-100">
                        Fixed: <span className="font-medium text-slate-700 ml-1">{currency}{selectedInventoryItem.price.toFixed(2)}</span>
                    </div>
                )}
            </div>
            
            {/* Qty */}
            <div className="col-span-1 sm:col-span-2">
                <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Qty</div>
                <Input type="number" value={item.quantity} onChange={e => handleFieldChange('quantity', parseInt(e.target.value, 10) || 1)} min="1" className="text-center !py-1.5 no-spinners w-full" />
            </div>
            
            {/* Discount */}
            <div className="col-span-1 sm:col-span-2">
                 <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Discount</div>
                 <div className="flex">
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount.value}
                        onChange={(e) => handleDiscountChange('value', e.target.value)}
                        className="rounded-r-none text-left !py-1.5 !px-1 no-spinners w-full"
                    />
                    <Select
                        value={item.discount.type}
                        onChange={(e) => handleDiscountChange('type', e.target.value)}
                        className="rounded-l-none border-l-0 !py-1.5 !px-0 w-10 text-center"
                    >
                        <option value="fixed">{currency}</option>
                        <option value="percentage">%</option>
                    </Select>
                </div>
            </div>
            
            {/* VAT */}
            {taxMode !== 'none' && (
                <div className="col-span-1 sm:col-span-2">
                    <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">VAT (%)</div>
                    <Input type="number" value={item.vatRate} onChange={e => handleFieldChange('vatRate', parseInt(e.target.value, 10) || 0)} min="0" className="text-center !py-1.5 no-spinners w-full" />
                </div>
            )}
            
            {/* Total */}
            <div className="col-span-1 sm:col-span-3 flex items-end sm:items-center justify-end h-full">
                 <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1 mr-2">Total:</div>
                <span className="font-semibold text-slate-800">{currency}{total.toFixed(2)}</span>
            </div>
             {/* Action Button */}
            {!readOnly && (
                <div className="col-span-1 sm:col-span-1 flex items-center justify-end h-full">
                    <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} title="Delete line item" className="h-8 w-8">
                        <TrashIcon className="w-4 h-4 text-slate-400 hover:text-red-500" />
                    </Button>
                </div>
            )}
        </fieldset>
    );
};

export default InvoiceItemRow;