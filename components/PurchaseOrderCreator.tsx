import React, { useMemo, useState } from 'react';
import { PurchaseOrderState, PurchaseOrderLineItem, Supplier, AppSettings, SupplierInventoryItem, TaxMode } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TextArea } from './ui/TextArea';
import { PlusIcon } from './icons/PlusIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SaveIcon } from './icons/SaveIcon';
import { TrashIcon } from './icons/TrashIcon';
import SupplierInventorySearchModal from './SupplierInventorySearchModal';
import { SearchIcon } from './icons/SearchIcon';
import SupplierSearchModal from './SupplierSearchModal';

interface PurchaseOrderCreatorProps {
    editingPOId: string | null;
    poState: PurchaseOrderState;
    setPOState: React.Dispatch<React.SetStateAction<PurchaseOrderState>>;
    suppliers: Supplier[];
    settings: AppSettings;
    supplierInventory: SupplierInventoryItem[];
    onSave: (state: PurchaseOrderState, total: number) => void;
    onUpdate: (data: { id: string, state: PurchaseOrderState, total: number }) => void;
    onApprove: (data: { id: string | null, state: PurchaseOrderState, total: number }) => void;
    onDownloadPdf: () => void;
    onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
}

const PurchaseOrderCreator: React.FC<PurchaseOrderCreatorProps> = ({ 
    editingPOId, 
    poState, 
    setPOState, 
    suppliers, 
    settings, 
    supplierInventory,
    onSave, 
    onUpdate,
    onApprove,
    onDownloadPdf,
    onAddSupplier,
}) => {
    
    const isEditing = !!editingPOId;
    const [isSearchModalOpen, setSearchModalOpen] = useState(false);
    const [isSupplierSearchModalOpen, setSupplierSearchModalOpen] = useState(false);
    const [targetLineItemId, setTargetLineItemId] = useState<string | null>(null);

    const handleHeaderChange = (field: keyof PurchaseOrderState, value: string) => {
        if (field === 'supplierName') {
            const matchingSupplier = suppliers.find(s => s.name.toLowerCase() === value.toLowerCase().trim());
            setPOState(prev => ({ 
                ...prev, 
                supplierName: value,
                supplierId: matchingSupplier ? matchingSupplier.id : null,
            }));
        } else {
            setPOState(prev => ({ ...prev, [field]: value }));
        }
    };
    
    const handleLineItemChange = (id: string, field: keyof PurchaseOrderLineItem, value: any) => {
        setPOState(prev => ({
            ...prev,
            lineItems: prev.lineItems.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleAddItem = () => {
        const newItem: PurchaseOrderLineItem = {
            id: crypto.randomUUID(),
            supplierInventoryItemId: null,
            description: '',
            quantity: 1,
            unitPrice: 0,
            // fix: Corrected a typo in the 'defaultVatRate' property name.
            vatRate: settings.defaultVatRate,
        };
        setPOState(prev => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
    };

    const handleRemoveItem = (id: string) => {
        setPOState(prev => ({
            ...prev,
            lineItems: prev.lineItems.filter(item => item.id !== id)
        }));
    };

    const handleOpenSearchModal = (lineItemId: string) => {
        setTargetLineItemId(lineItemId);
        setSearchModalOpen(true);
    };

    const handleSelectItemFromSearch = (inventoryItem: SupplierInventoryItem) => {
        if (targetLineItemId) {
            handleLineItemChange(targetLineItemId, 'supplierInventoryItemId', inventoryItem.id);
            handleLineItemChange(targetLineItemId, 'description', inventoryItem.name);
            handleLineItemChange(targetLineItemId, 'unitPrice', inventoryItem.price);
            setSearchModalOpen(false);
            setTargetLineItemId(null);
        }
    };

    const handleTaxModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTaxMode = e.target.value as TaxMode;
        const updatedLineItems = poState.lineItems.map(item => ({
            ...item,
            vatRate: newTaxMode === 'none' ? 0 : item.vatRate === 0 ? settings.defaultVatRate : item.vatRate,
        }));
        setPOState(prev => ({ 
            ...prev, 
            taxMode: newTaxMode,
            lineItems: updatedLineItems
        }));
    };

    const handleSelectSupplierFromSearch = (supplier: Supplier) => {
        setPOState(prev => ({ ...prev, supplierId: supplier.id, supplierName: supplier.name }));
        setSupplierSearchModalOpen(false);
    };
    
    const handleSaveNewSupplier = (name: string) => {
        const newSupplier: Omit<Supplier, 'id'> = {
            name: name.trim(),
            address: 'Please update address in Supplier Manager',
        };
        onAddSupplier(newSupplier);
        setPOState(prev => ({ ...prev, supplierName: name.trim(), supplierId: null }));
    };

    const isNewSupplier = poState.supplierName.trim() !== '' && poState.supplierId === null && !suppliers.some(s => s.name.toLowerCase() === poState.supplierName.toLowerCase().trim());

    const totals = useMemo(() => {
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

    const supplierSpecificInventory = useMemo(() => {
        return supplierInventory.filter(item => item.supplierId === poState.supplierId);
    }, [supplierInventory, poState.supplierId]);

    const handleSaveDraft = () => {
        if (!poState.supplierName.trim() || !poState.reference.trim()) {
            alert('Please fill in both the Supplier and Reference fields.');
            return;
        }
        if (isEditing && editingPOId) {
            onUpdate({ id: editingPOId, state: poState, total: totals.grandTotal });
        } else {
            onSave(poState, totals.grandTotal);
        }
    };

    const handleApproveClick = () => {
        if (!poState.supplierName.trim() || !poState.reference.trim()) {
            alert('Please fill in both the Supplier and Reference fields before approving.');
            return;
        }
        onApprove({ id: editingPOId, state: poState, total: totals.grandTotal });
    };

    return (
        <>
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="text-sm text-slate-500 whitespace-pre-wrap">{settings.companyAddress}</p>
                </div>
                <h1 className="text-4xl font-bold text-slate-400 uppercase tracking-widest">Purchase Order</h1>
            </header>

            {/* Header */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-8">
                 <div>
                    <label htmlFor="supplierName" className="block text-sm font-medium text-slate-600 mb-1">Supplier</label>
                    <div className="flex items-start gap-2">
                        <div className="flex-grow">
                            <Input 
                                id="supplierName" 
                                value={poState.supplierName} 
                                onChange={(e) => handleHeaderChange('supplierName', e.target.value)}
                                placeholder="Search or type a new name..."
                            />
                            {isNewSupplier && (
                                <p className="text-xs text-slate-500 mt-1">New supplier. Click '+' to save.</p>
                            )}
                        </div>
                        <Button type="button" size="icon" variant="outline" onClick={() => setSupplierSearchModalOpen(true)} title="Search for existing supplier">
                            <SearchIcon className="w-5 h-5" />
                        </Button>
                        {isNewSupplier && (
                            <Button type="button" size="icon" variant="primary" onClick={() => handleSaveNewSupplier(poState.supplierName)} title="Save new supplier">
                                <PlusIcon className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="poNumber" className="block text-sm font-medium text-slate-600 mb-1">PO Number</label>
                        <Input id="poNumber" value={poState.poNumber} onChange={e => handleHeaderChange('poNumber', e.target.value)} />
                    </div>
                     <div>
                        <label htmlFor="poReference" className="block text-sm font-medium text-slate-600 mb-1">Reference</label>
                        <Input id="poReference" value={poState.reference} onChange={e => handleHeaderChange('reference', e.target.value)} />
                    </div>
                </div>
                 <div>
                    <label htmlFor="issueDate" className="block text-sm font-medium text-slate-600 mb-1">Order Date</label>
                    <Input id="issueDate" type="date" value={poState.issueDate} onChange={e => handleHeaderChange('issueDate', e.target.value)} />
                </div>
                 <div>
                    <label htmlFor="deliveryDate" className="block text-sm font-medium text-slate-600 mb-1">Expected Delivery</label>
                    <Input id="deliveryDate" type="date" value={poState.deliveryDate} onChange={e => handleHeaderChange('deliveryDate', e.target.value)} />
                </div>
            </section>

            {/* Line Items */}
            <section className="mb-2 hidden sm:block">
                <div className="bg-slate-100 p-4 rounded-t-lg border-b border-slate-200 grid grid-cols-12 gap-x-4 items-center text-sm font-semibold text-slate-600">
                    <div className={`col-span-12 ${poState.taxMode === 'none' ? 'sm:col-span-7' : 'sm:col-span-6'} pl-3`}>Item Description</div>
                    <div className="col-span-4 sm:col-span-1 text-left pl-3">Qty</div>
                    <div className="col-span-8 sm:col-span-2 text-left pl-3">{poState.taxMode === 'inclusive' ? 'Unit Price (inc. Tax)' : 'Unit Price'}</div>
                    {poState.taxMode !== 'none' && <div className="col-span-4 sm:col-span-1 text-left pl-3">VAT (%)</div>}
                    <div className="col-span-12 sm:col-span-1 text-left pl-3">Total</div>
                    <div className="col-span-1" />
                </div>
            </section>
            <section>
                <div className="space-y-4">
                    {poState.lineItems.map(item => {
                        const selectedInventoryItem = supplierInventory.find(i => i.id === item.supplierInventoryItemId);
                        const lineTotal = item.quantity * item.unitPrice;
                        const total = poState.taxMode === 'exclusive' ? lineTotal * (1 + item.vatRate/100) : lineTotal;
                        
                        return (
                        <div key={item.id} className="bg-slate-50 p-4 rounded-lg grid grid-cols-12 gap-x-4 gap-y-2 items-start text-sm">
                            <div className={`col-span-12 ${poState.taxMode === 'none' ? 'sm:col-span-7' : 'sm:col-span-6'}`}>
                                <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Item Description</div>
                                <div className="flex items-start gap-2">
                                    <Button variant="outline" size="icon" onClick={() => handleOpenSearchModal(item.id)} type="button" disabled={!poState.supplierId} title={!poState.supplierId ? "Please select a supplier first" : (selectedInventoryItem ? `Change item: ${selectedInventoryItem.name}` : "Search supplier's inventory")}>
                                        <SearchIcon className="w-5 h-5" />
                                    </Button>
                                    <TextArea value={item.description} onChange={e => handleLineItemChange(item.id, 'description', e.target.value)} placeholder="Item to purchase description..." rows={1} className="resize-none text-left !py-1.5 flex-grow"/>
                                </div>
                            </div>
                            <div className="col-span-6 sm:col-span-1">
                                <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">Qty</div>
                                <Input type="number" value={item.quantity} onChange={e => handleLineItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)} />
                            </div>
                            <div className="col-span-6 sm:col-span-2">
                                <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">{poState.taxMode === 'inclusive' ? 'Unit Price (inc. Tax)' : 'Unit Price'}</div>
                                <Input type="number" value={item.unitPrice} onChange={e => handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                            </div>
                            {poState.taxMode !== 'none' && (
                                <div className="col-span-6 sm:col-span-1">
                                    <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1">VAT (%)</div>
                                    <Input type="number" value={item.vatRate} onChange={e => handleLineItemChange(item.id, 'vatRate', parseInt(e.target.value, 10) || 0)} />
                                </div>
                            )}
                            <div className="col-span-6 sm:col-span-1 flex items-end sm:items-center">
                                <div className="block sm:hidden text-xs font-medium text-slate-500 mb-1 mr-2">Total:</div>
                                <span className="font-semibold text-slate-800">£{total.toFixed(2)}</span>
                            </div>
                            <div className="col-span-12 sm:col-span-1 flex items-center justify-end">
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} title="Delete line item">
                                    <TrashIcon className="w-5 h-5 text-slate-400 hover:text-red-500" />
                                </Button>
                            </div>
                        </div>
                    )})}
                </div>
            </section>
             <Button variant="outline" onClick={handleAddItem} className="mt-4">
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Item
            </Button>

             {/* Totals & Notes */}
            <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <div className="mb-4">
                        <label htmlFor="taxMode" className="block text-sm font-medium text-slate-600">Tax Calculation</label>
                        <Select id="taxMode" value={poState.taxMode} onChange={handleTaxModeChange}>
                            <option value="exclusive">Tax Exclusive (add tax to prices)</option>
                            <option value="inclusive">Tax Inclusive (tax is included in prices)</option>
                            <option value="none">No Tax</option>
                        </Select>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Notes</h3>
                    <TextArea
                        value={poState.notes}
                        onChange={e => handleHeaderChange('notes', e.target.value)}
                        placeholder="Any notes for the supplier..."
                        rows={4}
                    />
                </div>
                <div className="flex flex-col items-end">
                    <div className="w-full max-w-xs space-y-2 text-slate-700">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="font-medium">£{totals.subtotal.toFixed(2)}</span>
                        </div>
                        {poState.taxMode !== 'none' && (
                        <div className="flex justify-between">
                            <span>VAT</span>
                            <span className="font-medium">£{totals.vatTotal.toFixed(2)}</span>
                        </div>
                        )}
                        <div className="border-t my-2"></div>
                        <div className="flex justify-between text-xl font-bold text-slate-900">
                            <span>Total</span>
                            <span>£{totals.grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Action Buttons */}
            <footer className="mt-12 pt-6 border-t">
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleSaveDraft}>
                        <SaveIcon className="w-5 h-5 mr-2" />
                        {isEditing ? 'Update Draft' : 'Save Draft'}
                    </Button>
                    <Button variant="primary" onClick={handleApproveClick}>
                        Approve
                    </Button>
                     <Button variant="outline" onClick={onDownloadPdf}>
                         <DownloadIcon className="w-5 h-5 mr-2" />
                        Download PDF
                    </Button>
                </div>
            </footer>
        </div>
        <SupplierSearchModal
            isOpen={isSupplierSearchModalOpen}
            onClose={() => setSupplierSearchModalOpen(false)}
            suppliers={suppliers}
            onSelectSupplier={handleSelectSupplierFromSearch}
        />
        <SupplierInventorySearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            items={supplierSpecificInventory}
            onSelectItem={handleSelectItemFromSearch}
        />
        </>
    );
};

export default PurchaseOrderCreator;