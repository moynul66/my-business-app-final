import React, { useMemo, useEffect, useState } from 'react';
import {
    JobLineItem,
    InventoryItem,
    SupplierInventoryItem,
    Supplier,
    ItemType,
    MeasurementUnit,
    TaxMode,
    AppSettings,
    JobCostItem,
} from '../types';
import { Select } from './ui/Select';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { SearchIcon } from './icons/SearchIcon';
import { calculateBasePrice, isAreaUnit, CONVERSION_TO_BASE_UNIT } from '../services/conversionService';
import { LinkIcon } from './icons/LinkIcon';
import { PlusIcon } from './icons/PlusIcon';

interface JobBuilderItemRowProps {
    item: JobLineItem;
    inventory: InventoryItem[];
    supplierInventory: SupplierInventoryItem[];
    suppliers: Supplier[];
    taxMode: TaxMode;
    settings: AppSettings;
    onUpdate: (id: string, updates: Partial<JobLineItem>) => void;
    onRemove: (id: string) => void;
    onOpenInventorySearch: (id: string) => void;
    onOpenSupplierInventorySearch: (id: string) => void;
    onOpenAddOns?: (id: string) => void;
}

const jobBuilderUnits = [MeasurementUnit.M, MeasurementUnit.FT];
const convertToBaseUnits = (value: number, fromUnit: MeasurementUnit): number => {
    return value * (CONVERSION_TO_BASE_UNIT[fromUnit] || 1);
};

const JobBuilderItemRow: React.FC<JobBuilderItemRowProps> = ({ 
    item, 
    inventory, 
    supplierInventory, 
    suppliers,
    taxMode, 
    settings, 
    onUpdate, 
    onRemove,
    onOpenInventorySearch,
    onOpenSupplierInventorySearch,
    onOpenAddOns
}) => {
    const saleInventoryItem = inventory.find(i => i.id === item.inventoryItemId);
    const parentItem = saleInventoryItem?.parentId ? inventory.find(i => i.id === saleInventoryItem.parentId) : null;
    const currency = settings.currencySymbol || '£';
    const [isCostItemsExpanded, setIsCostItemsExpanded] = useState(true);

    const handleFieldChange = (field: keyof JobLineItem, value: any) => {
        onUpdate(item.id, { [field]: value });
    };

    const handleDiscountChange = (field: 'type' | 'value', value: any) => {
        if (field === 'value') {
            value = parseFloat(value) || 0;
        }
        onUpdate(item.id, { discount: { ...item.discount, [field]: value } });
    };

    const handleAddManualCost = () => {
        const newManualCost: JobCostItem = {
            id: crypto.randomUUID(),
            type: 'manual',
            description: 'New Manual Cost',
            proportionalCost: 0,
            wastageCost: 0,
            totalMaterialCost: 0,
            manualCost: 0,
            costVatRate: settings.defaultVatRate,
            costVat: 0,
        };
        onUpdate(item.id, { costItems: [...(item.costItems || []), newManualCost] });
    };

    const handleUpdateCostItem = (costItemId: string, updates: Partial<JobCostItem>) => {
        const updatedCostItems = (item.costItems || []).map(ci => 
            ci.id === costItemId ? { ...ci, ...updates } : ci
        );
        onUpdate(item.id, { costItems: updatedCostItems });
    };

    const handleRemoveCostItem = (costItemId: string) => {
        const updatedCostItems = (item.costItems || []).filter(ci => ci.id !== costItemId);
        onUpdate(item.id, { costItems: updatedCostItems });
    };
    
    useEffect(() => {
        const calculateCosts = (costItem: JobCostItem): JobCostItem => {
            let proportionalCost = 0;
            let wastageCost = 0;
            let totalMaterialCost = 0;
            let costVat = 0;
            let costVatRate = costItem.costVatRate;

            const supplierItem = supplierInventory.find(si => si.id === costItem.linkedSupplierItemId);

            if (costItem.type === 'linked' && supplierItem) {
                if (supplierItem.type === ItemType.MEASURED) {
                    const costPerSqMeter = supplierItem.unitPrices?.[MeasurementUnit.SQ_M];
                    if (costPerSqMeter && item.unit && item.length) {
                        const { length = 0, width = 0, unit: lineUnit, quantity } = item;
                        
                        const lengthInMeters = length * CONVERSION_TO_BASE_UNIT[lineUnit];
                        const widthInMeters = width * CONVERSION_TO_BASE_UNIT[lineUnit];
                        const areaInSqMeters = lengthInMeters * widthInMeters;
                        
                        proportionalCost = areaInSqMeters * costPerSqMeter * quantity;
                        
                        if (supplierItem.includeWastage !== false && supplierItem.length && supplierItem.width && supplierItem.measurementUnit && !isAreaUnit(item.unit) && item.width) {
                            const matL_m = convertToBaseUnits(supplierItem.length, supplierItem.measurementUnit);
                            const matW_m = convertToBaseUnits(supplierItem.width, supplierItem.measurementUnit);
                            
                            if (matL_m > 0 && matW_m > 0 && lengthInMeters > 0 && widthInMeters > 0) {
                                const sheets_A = Math.ceil(lengthInMeters / matL_m) * Math.ceil(widthInMeters / matW_m);
                                const sheets_B = Math.ceil(lengthInMeters / matW_m) * Math.ceil(widthInMeters / matL_m);
                                const sheetsConsumed = Math.min(sheets_A, sheets_B);
                                totalMaterialCost = sheetsConsumed * quantity * supplierItem.price;
                                wastageCost = totalMaterialCost - proportionalCost;
                            } else {
                                totalMaterialCost = proportionalCost;
                            }
                        } else {
                            totalMaterialCost = proportionalCost;
                        }
                    }
                } else { // FIXED type
                    proportionalCost = supplierItem.price * item.quantity;
                    totalMaterialCost = proportionalCost;
                }
                
                costVatRate = costVatRate ?? settings.defaultVatRate;
                costVat = totalMaterialCost * (costVatRate / 100);

            } else if (costItem.type === 'manual') {
                proportionalCost = costItem.manualCost || 0;
                totalMaterialCost = proportionalCost;
                costVatRate = costItem.costVatRate ?? 0;
                costVat = totalMaterialCost * (costVatRate / 100);
            }

            return { ...costItem, proportionalCost, wastageCost, totalMaterialCost, costVat, costVatRate };
        };

        const newCostItems = (item.costItems || []).map(calculateCosts);
        
        if (JSON.stringify(item.costItems) !== JSON.stringify(newCostItems)) {
            onUpdate(item.id, { costItems: newCostItems });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.costItems, item.length, item.width, item.unit, item.quantity, supplierInventory, settings.defaultVatRate]);

    const { totalSale, totalCost } = useMemo(() => {
        let basePrice: number;
        if (!saleInventoryItem) {
            basePrice = (item.price || 0) * item.quantity;
        } else {
            const rawAddOns = [...(saleInventoryItem.addOnOptions || []), ...(parentItem?.addOnOptions || [])];
            // Deduplicate by Name + Price
            const availableAddOns = Array.from(
                new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
            );
            basePrice = calculateBasePrice({ ...saleInventoryItem, addOnOptions: availableAddOns }, item);
        }
        
        const discountAmount = item.discount.type === 'percentage'
            ? basePrice * (item.discount.value / 100)
            : item.discount.value;
        const priceAfterDiscount = basePrice - discountAmount;
        
        const sale = taxMode === 'inclusive' ? priceAfterDiscount / (1 + item.vatRate / 100) : priceAfterDiscount;
        const cost = (item.costItems || []).reduce((sum, ci) => sum + ci.totalMaterialCost, 0);
        
        return { totalSale: sale, totalCost: cost };
    }, [item, saleInventoryItem, parentItem, taxMode]);

    const availableAddOns = useMemo(() => {
        if (!saleInventoryItem) return [];
        const rawAddOns = [...(saleInventoryItem.addOnOptions || []), ...(parentItem?.addOnOptions || [])];
        // Deduplicate by Name + Price
        return Array.from(
            new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
        );
    }, [saleInventoryItem, parentItem]);

    const selectedAddOnNames = useMemo(() => {
        if (!item.selectedAddOnIds || item.selectedAddOnIds.length === 0) return '';
        return item.selectedAddOnIds.map(id => {
            const opt = availableAddOns.find(o => o.id === id);
            return opt ? `${opt.name} (+${currency}${opt.price.toFixed(2)})` : null;
        }).filter(Boolean).join(', ');
    }, [item.selectedAddOnIds, availableAddOns, currency]);

    return (
        <div className="bg-white border rounded-lg shadow-sm grid grid-cols-12 gap-x-4 gap-y-2 items-start text-sm relative">
            <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} title="Delete line item">
                    <TrashIcon className="w-5 h-5 text-slate-400 hover:text-red-500" />
                </Button>
            </div>

            {/* Left Side: Sale Details */}
            <div className="col-span-12 md:col-span-6 p-4">
                <h3 className="font-semibold text-slate-700 mb-2">Sale Details</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-slate-500">Item / Description</label>
                        <div className="flex items-start gap-2">
                            <Button variant="outline" size="icon" onClick={() => onOpenInventorySearch(item.id)} type="button" title="Search Sale Items"><SearchIcon className="w-5 h-5" /></Button>
                            <div className="flex-grow flex flex-col gap-1">
                                <TextArea value={item.description} onChange={(e) => handleFieldChange('description', e.target.value)} placeholder="Sale item description..." rows={1} className="resize-none !py-1.5 w-full"/>
                                {saleInventoryItem && availableAddOns.length > 0 && (
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
                    <div>
                        <label className="text-xs font-medium text-slate-500">Unit Price / Dimensions</label>
                        {!saleInventoryItem ? (
                            <Input type="number" placeholder="Unit Price" value={item.price ?? ''} onChange={e => handleFieldChange('price', parseFloat(e.target.value) || 0)} />
                        ) : saleInventoryItem.type === ItemType.MEASURED ? (
                            <div className="grid grid-cols-3 gap-2">
                                <Input type="number" placeholder="L" value={item.length || ''} onChange={e => handleFieldChange('length', parseFloat(e.target.value) || 0)} />
                                <Input type="number" placeholder="W" value={item.width || ''} onChange={e => handleFieldChange('width', parseFloat(e.target.value) || 0)} />
                                <Select value={item.unit || ''} onChange={e => handleFieldChange('unit', e.target.value as MeasurementUnit)}>
                                    {jobBuilderUnits.map(u => <option key={u} value={u}>{u}</option>)}
                                </Select>
                            </div>
                        ) : (
                             <div className="text-slate-500 h-10 flex items-center pl-2 text-sm border rounded bg-slate-100">Fixed Unit Price: <span className="font-medium text-slate-700 ml-1">{currency}{saleInventoryItem.price.toFixed(2)}</span></div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="text-xs font-medium text-slate-500">Quantity</label>
                            <Input type="number" value={item.quantity} onChange={e => handleFieldChange('quantity', parseInt(e.target.value, 10) || 1)} min="1" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500">Discount</label>
                            <div className="flex">
                                <Input type="number" step="0.01" min="0" value={item.discount.value} onChange={(e) => handleDiscountChange('value', e.target.value)} className="rounded-r-none" />
                                <Select value={item.discount.type} onChange={(e) => handleDiscountChange('type', e.target.value)} className="rounded-l-none border-l-0 !py-1.5"><option value="fixed">{currency}</option><option value="percentage">%</option></Select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Cost Details */}
            <div className="col-span-12 md:col-span-6 p-4 bg-slate-50 rounded-r-lg">
                 <h3 className="font-semibold text-slate-700 mb-2">Cost Details</h3>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenSupplierInventorySearch(item.id)} className="w-full"><LinkIcon className="w-4 h-4 mr-2"/>Link Material</Button>
                        <Button variant="outline" size="sm" onClick={handleAddManualCost} className="w-full"><PlusIcon className="w-4 h-4 mr-2"/>Add Manual Cost</Button>
                    </div>
                    <div>
                        <div className={`space-y-2 pr-1 transition-all duration-300 ease-in-out ${isCostItemsExpanded ? 'max-h-[500px] overflow-y-auto' : 'max-h-32 overflow-y-auto'}`}>
                            {(item.costItems || []).map(costItem => {
                                const supplierItem = supplierInventory.find(si => si.id === costItem.linkedSupplierItemId);
                                return (
                                    <div key={costItem.id} className="bg-white p-2 rounded border">
                                        <div className="flex justify-between items-center">
                                            {costItem.type === 'manual' ? (
                                                <Input value={costItem.description} onChange={e => handleUpdateCostItem(costItem.id, { description: e.target.value })} className="!py-1 text-sm flex-grow"/>
                                            ) : (
                                                <p className="font-medium text-blue-800 text-sm">{costItem.description}</p>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveCostItem(costItem.id)}><TrashIcon className="w-4 h-4 text-red-500"/></Button>
                                        </div>
                                        {costItem.type === 'manual' ? (
                                            <>
                                                <div className="mt-1">
                                                    <label className="text-xs">Cost (ex. VAT) ({currency})</label>
                                                    <Input type="number" value={costItem.manualCost || ''} onChange={e => handleUpdateCostItem(costItem.id, { manualCost: parseFloat(e.target.value) || 0 })} className="!py-1"/>
                                                </div>
                                                <div className="mt-2 pt-2 border-t grid grid-cols-3 gap-x-2 items-end">
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-500">VAT Rate (%)</label>
                                                        <Input 
                                                            type="number" 
                                                            value={costItem.costVatRate} 
                                                            onChange={e => handleUpdateCostItem(costItem.id, { costVatRate: parseFloat(e.target.value) || 0 })}
                                                            className="!py-1 text-xs"
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500">VAT Amount</p>
                                                        <p className="text-sm text-slate-700">{currency}{costItem.costVat.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500">Total (inc. VAT)</p>
                                                        <p className="text-sm font-bold text-slate-800">{currency}{(costItem.totalMaterialCost + costItem.costVat).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {supplierItem && supplierItem.type === 'measured' && (
                                                    <div className="text-xs mt-1">
                                                        <span className="text-red-800">Proportional: {currency}{costItem.proportionalCost.toFixed(2)}</span>
                                                        <span className="mx-1">|</span>
                                                        <span className="text-red-800">Wastage: {currency}{costItem.wastageCost.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                
                                                <p className="text-right text-sm font-medium mt-1">
                                                    Cost (ex. VAT): {currency}{costItem.totalMaterialCost.toFixed(2)}
                                                </p>

                                                <div className="mt-2 pt-2 border-t grid grid-cols-3 gap-x-2 items-end">
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-500">VAT Rate (%)</label>
                                                        <Input 
                                                            type="number" 
                                                            value={costItem.costVatRate} 
                                                            onChange={e => handleUpdateCostItem(costItem.id, { costVatRate: parseFloat(e.target.value) || 0 })}
                                                            className="!py-1 text-xs"
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500">VAT Amount</p>
                                                        <p className="text-sm text-slate-700">{currency}{costItem.costVat.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-500">Total (inc. VAT)</p>
                                                        <p className="text-sm font-bold text-slate-800">{currency}{(costItem.totalMaterialCost + costItem.costVat).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        {(item.costItems || []).length > 1 && (
                            <button
                                type="button"
                                onClick={() => setIsCostItemsExpanded(prev => !prev)}
                                className="text-xs text-blue-600 hover:underline mt-1 w-full text-left p-1"
                                aria-expanded={isCostItemsExpanded}
                            >
                                {isCostItemsExpanded ? 'Show less' : `+ Show ${item.costItems.length - 1} more item(s)`}
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-1">
                        <div className="text-center p-2 bg-white rounded border">
                            <label className="text-xs font-medium text-slate-600">Total Sale (ex. VAT)</label>
                            <p className="font-semibold text-green-700 text-lg">{currency}{totalSale.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-2 bg-white rounded border">
                            <label className="text-xs font-medium text-slate-600">Cost of Materials</label>
                            <p className="font-semibold text-red-700 text-lg">{currency}{totalCost.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-2 bg-white rounded border">
                            <label className="text-xs font-medium text-slate-600">Profit / Margin</label>
                             <p className="font-semibold text-lg" style={{ color: (totalSale - totalCost) >= 0 ? 'green' : 'red' }}>
                                {currency}{(totalSale - totalCost).toFixed(2)}
                            </p>
                        </div>
                    </div>
                  </div>
            </div>
        </div>
    );
};

export default JobBuilderItemRow;