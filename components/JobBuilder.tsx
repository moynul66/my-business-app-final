import React, { useState, useMemo } from 'react';
import {
    JobState,
    JobLineItem,
    InventoryItem,
    Customer,
    Supplier,
    SupplierInventoryItem,
    AppSettings,
    Category,
    ItemType,
    MeasurementUnit,
    TaxMode,
    InvoiceCreationType,
    JobCostItem,
    AddOnOption,
} from '../types';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { PlusIcon } from './icons/PlusIcon';
import { calculateBasePrice } from '../services/conversionService';
import { TextArea } from './ui/TextArea';
import CustomerSearchModal from './CustomerSearchModal';
import NewCustomerModal from './NewCustomerModal';
import InventorySearchModal from './InventorySearchModal';
import JobBuilderItemRow from './JobBuilderItemRow';
import SupplierInventorySearchModal from './SupplierInventorySearchModal';
import { Input } from './ui/Input';
import { SearchIcon } from './icons/SearchIcon';
import AddOnSelectionModal from './AddOnSelectionModal';

interface JobBuilderProps {
    editingJobId: string | null;
    jobState: JobState;
    setJobState: React.Dispatch<React.SetStateAction<JobState>>;
    customers: Customer[];
    suppliers: Supplier[];
    inventory: InventoryItem[];
    supplierInventory: SupplierInventoryItem[];
    settings: AppSettings;
    categories: Category[];
    onSaveJob: (jobData: { state: JobState; totalSale: number; totalCost: number }) => void;
    onConvertToQuote: (jobState: JobState) => void;
    onConvertToInvoice: (jobState: JobState) => void;
    onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
}

const JobBuilder: React.FC<JobBuilderProps> = ({
    editingJobId,
    jobState,
    setJobState,
    customers,
    suppliers,
    inventory,
    supplierInventory,
    settings,
    categories,
    onSaveJob,
    onConvertToQuote,
    onConvertToInvoice,
    onAddCustomer,
}) => {
    const [isCustomerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
    const [isNewCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    const [isInventorySearchModalOpen, setInventorySearchModalOpen] = useState(false);
    const [isSupplierInventorySearchModalOpen, setSupplierInventorySearchModalOpen] = useState(false);
    const [targetLineItemId, setTargetLineItemId] = useState<string | null>(null);

    // Add-on state
    const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
    const [addOnModalConfig, setAddOnModalConfig] = useState<{ 
        lineItemId: string; 
        inventoryItem: InventoryItem; 
    } | null>(null);

    const { invoiceType = 'measured' } = jobState;

    const handleHeaderChange = (field: keyof JobState, value: string) => {
        setJobState(prev => ({ ...prev, [field]: value }));
    };

    const handleAddItem = () => {
        const newItem: JobLineItem = {
            id: crypto.randomUUID(),
            inventoryItemId: null,
            description: '',
            quantity: 1,
            vatRate: settings.defaultVatRate,
            discount: { type: 'fixed', value: 0 },
            price: 0,
            costItems: [],
            selectedAddOnIds: [],
        };
        setJobState(prev => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
    };

    const handleUpdateItem = (id: string, updates: Partial<JobLineItem>) => {
        setJobState(prev => ({
            ...prev,
            lineItems: prev.lineItems.map(item => (item.id === id ? { ...item, ...updates } : item)),
        }));
    };

    const handleRemoveItem = (id: string) => {
        setJobState(prev => ({
            ...prev,
            lineItems: prev.lineItems.filter(item => item.id !== id),
        }));
    };
    
    const handleOpenInventorySearch = (lineItemId: string) => {
        setTargetLineItemId(lineItemId);
        setInventorySearchModalOpen(true);
    };
    
    const handleOpenSupplierInventorySearch = (lineItemId: string) => {
        setTargetLineItemId(lineItemId);
        setSupplierInventorySearchModalOpen(true);
    };

    const handleSelectItemFromInventory = (inventoryItem: InventoryItem) => {
        if (targetLineItemId) {
            const lineItem = jobState.lineItems.find(li => li.id === targetLineItemId);
            if (!lineItem) return;

            let newCostItems: JobCostItem[] = [];
            if (inventoryItem.linkedSupplierItemIds) {
                newCostItems = inventoryItem.linkedSupplierItemIds.map(supplierId => {
                    const supplierItem = supplierInventory.find(si => si.id === supplierId);
                    if (!supplierItem) return null;
                    const newCostItem: JobCostItem = {
                        id: crypto.randomUUID(),
                        type: 'linked',
                        description: supplierItem.name,
                        linkedSupplierItemId: supplierItem.id,
                        proportionalCost: 0,
                        wastageCost: 0,
                        totalMaterialCost: 0,
                        manualCost: 0,
                        costVatRate: settings.defaultVatRate,
                        costVat: 0,
                    };
                    return newCostItem;
                }).filter((item): item is JobCostItem => item !== null);
            }

            const updates: Partial<JobLineItem> = {
                inventoryItemId: inventoryItem.id,
                description: inventoryItem.name, // Overwrite with new name
                price: undefined,
                costItems: newCostItems,
                vatRate: inventoryItem.vatRate ?? settings.defaultVatRate,
                selectedAddOnIds: [],
                length: undefined,
                width: undefined,
                unit: undefined,
            };

            if (inventoryItem.type === ItemType.MEASURED) {
                updates.unit = inventoryItem.measurementUnit || MeasurementUnit.M;
            }
            
            handleUpdateItem(targetLineItemId, updates);
            setInventorySearchModalOpen(false);

            // Add-on prompt
            let parentAddOns: AddOnOption[] = [];
            if (inventoryItem.parentId) {
                const parent = inventory.find(i => i.id === inventoryItem.parentId);
                if (parent && parent.addOnOptions) {
                    parentAddOns = parent.addOnOptions;
                }
            }
            const rawAddOns = [...(inventoryItem.addOnOptions || []), ...parentAddOns];
            // Deduplicate by Name + Price to avoid doubling visually
            const availableAddOns = Array.from(
                new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
            );
            
            if (availableAddOns.length > 0) {
                setAddOnModalConfig({ 
                    lineItemId: targetLineItemId, 
                    inventoryItem: { ...inventoryItem, addOnOptions: availableAddOns } 
                });
                setIsAddOnModalOpen(true);
            }

            setTargetLineItemId(null);
        }
    };
    
    const handleConfirmAddOns = (selectedIds: string[]) => {
        if (addOnModalConfig) {
            handleUpdateItem(addOnModalConfig.lineItemId, { selectedAddOnIds: selectedIds });
        }
        setIsAddOnModalOpen(false);
        setAddOnModalConfig(null);
    };

    const handleAddLinkedCostItem = (supplierItem: SupplierInventoryItem) => {
        if (targetLineItemId) {
            const targetLineItem = jobState.lineItems.find(li => li.id === targetLineItemId);
            if (!targetLineItem) return;

            const newCostItem: JobCostItem = {
                id: crypto.randomUUID(),
                type: 'linked',
                description: supplierItem.name,
                linkedSupplierItemId: supplierItem.id,
                proportionalCost: 0,
                wastageCost: 0,
                totalMaterialCost: 0,
                costVatRate: settings.defaultVatRate,
                costVat: 0,
            };

            const updatedLineItems = jobState.lineItems.map(li => 
                li.id === targetLineItemId 
                    ? { ...li, costItems: [...(li.costItems || []), newCostItem] } 
                    : li
            );
            setJobState(prev => ({ ...prev, lineItems: updatedLineItems }));

            setSupplierInventorySearchModalOpen(false);
            setTargetLineItemId(null);
        }
    };

    const handleTaxModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTaxMode = e.target.value as TaxMode;
        setJobState(prev => ({ ...prev, taxMode: newTaxMode }));
    };

    const handleSelectCustomerFromSearch = (customer: Customer) => {
        setJobState(prev => ({ ...prev, customerName: customer.name }));
        setCustomerSearchModalOpen(false);
    };

    const handleSaveNewCustomer = (name: string) => {
        const newCustomer: Omit<Customer, 'id'> = {
            name: name.trim(),
            address: 'Please update address in Customer Manager',
        };
        onAddCustomer(newCustomer);
    };

    const handleDetailedCustomerSave = (customerData: Omit<Customer, 'id'>) => {
        onAddCustomer(customerData);
        setJobState(prev => ({ ...prev, customerName: customerData.name }));
        setNewCustomerModalOpen(false);
    };

    const totals = useMemo(() => {
        let totalSale = 0;
        let totalCost = 0;

        jobState.lineItems.forEach(item => {
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
            
            let itemSale = 0;
            if (jobState.taxMode === 'inclusive') {
                const exclusivePrice = priceAfterDiscount / (1 + (item.vatRate / 100));
                itemSale = exclusivePrice;
            } else { // exclusive or none
                itemSale = priceAfterDiscount;
            }
            totalSale += itemSale;
            
            const lineItemCost = (item.costItems || []).reduce((sum, costItem) => {
                return sum + (costItem.totalMaterialCost || 0);
            }, 0);
            totalCost += lineItemCost;
        });

        return { totalSale, totalCost };
    }, [jobState.lineItems, jobState.taxMode, inventory]);
    
    const currency = settings.currencySymbol || '£';
    const isNewCustomer = jobState.customerName.trim() !== '' && !customers.some(c => c.name.toLowerCase() === jobState.customerName.toLowerCase().trim());

    const handleSave = () => {
        if (!jobState.customerName.trim() || !jobState.reference.trim()) {
            alert('Customer and Reference must be filled in before saving or converting.');
            return;
        }
        onSaveJob({ state: jobState, totalSale: totals.totalSale, totalCost: totals.totalCost });
    };

    const handleConvertToQuoteClick = () => {
        if (!jobState.customerName.trim() || !jobState.reference.trim()) {
            alert('Customer and Reference must be filled in before saving or converting.');
            return;
        }
        onConvertToQuote(jobState);
    };

    const handleConvertToInvoiceClick = () => {
        if (!jobState.customerName.trim() || !jobState.reference.trim()) {
            alert('Customer and Reference must be filled in before saving or converting.');
            return;
        }
        onConvertToInvoice(jobState);
    };

    const handleOpenAddOnModalForExisting = (lineItemId: string) => {
        const lineItem = jobState.lineItems.find(li => li.id === lineItemId);
        if (!lineItem || !lineItem.inventoryItemId) return;
        
        const inventoryItem = inventory.find(i => i.id === lineItem.inventoryItemId);
        if (!inventoryItem) return;

        let parentAddOns: AddOnOption[] = [];
        if (inventoryItem.parentId) {
            const parent = inventory.find(i => i.id === inventoryItem.parentId);
            if (parent && parent.addOnOptions) {
                parentAddOns = parent.addOnOptions;
            }
        }
        
        const rawAddOns = [...(inventoryItem.addOnOptions || []), ...parentAddOns];
        // Deduplicate by Name + Price to avoid doubling visually
        const availableAddOns = Array.from(
            new Map(rawAddOns.map(opt => [`${opt.name.toLowerCase()}-${opt.price}`, opt])).values()
        );
        
        if (availableAddOns.length > 0) {
            setAddOnModalConfig({ 
                lineItemId, 
                inventoryItem: { ...inventoryItem, addOnOptions: availableAddOns } 
            });
            setIsAddOnModalOpen(true);
        } else {
            alert('No add-on options available for this item.');
        }
    };

    return (
        <>
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">{editingJobId ? 'Edit Job' : 'Job Builder'}</h2>
                    <p className="text-sm text-slate-500">Cost materials and labor to build a quote or invoice.</p>
                </div>
                <h1 className="text-4xl font-bold text-slate-400 uppercase tracking-widest">Job Costing</h1>
            </header>
            
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-8">
                <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-slate-600 mb-1">Customer</label>
                    <div className="flex items-start gap-2">
                        <div className="flex-grow">
                            <Input id="customerName" value={jobState.customerName} onChange={e => handleHeaderChange('customerName', e.target.value)} placeholder="Search or type name..." />
                             {isNewCustomer && <p className="text-xs text-slate-500 mt-1">New customer. Click '+' to save.</p>}
                        </div>
                        <Button type="button" size="icon" variant="outline" onClick={() => setCustomerSearchModalOpen(true)} title="Search for existing customer"><SearchIcon className="w-5 h-5"/></Button>
                        <Button type="button" size="icon" variant="outline" onClick={() => setNewCustomerModalOpen(true)} title="Add detailed new customer"><PlusIcon className="w-5 h-5"/></Button>
                        {isNewCustomer && <Button type="button" size="icon" variant="primary" onClick={() => handleSaveNewCustomer(jobState.customerName)} title="Quick save name only"><PlusIcon className="w-5 h-5"/></Button>}
                    </div>
                </div>
                <div>
                    <label htmlFor="reference" className="block text-sm font-medium text-slate-600 mb-1">Reference</label>
                    <Input id="reference" value={jobState.reference} onChange={e => handleHeaderChange('reference', e.target.value)} />
                </div>
                 <div>
                    <label htmlFor="jobNumber" className="block text-sm font-medium text-slate-600 mb-1">Job Number</label>
                    <Input id="jobNumber" value={jobState.jobNumber} readOnly disabled className="bg-slate-200" />
                </div>
                 <div>
                    <label htmlFor="issueDate" className="block text-sm font-medium text-slate-600 mb-1">Date</label>
                    <Input id="issueDate" type="date" value={jobState.issueDate} onChange={e => handleHeaderChange('issueDate', e.target.value)} />
                </div>
            </section>
            
            <section>
                <div className="space-y-4">
                    {jobState.lineItems.map(item => (
                        <JobBuilderItemRow
                            key={item.id}
                            item={item}
                            inventory={inventory}
                            supplierInventory={supplierInventory}
                            suppliers={suppliers}
                            taxMode={jobState.taxMode}
                            settings={settings}
                            onUpdate={handleUpdateItem}
                            onRemove={handleRemoveItem}
                            onOpenInventorySearch={handleOpenInventorySearch}
                            onOpenSupplierInventorySearch={handleOpenSupplierInventorySearch}
                            onOpenAddOns={() => handleOpenAddOnModalForExisting(item.id)}
                        />
                    ))}
                </div>
            </section>
            
            <Button variant="outline" onClick={handleAddItem} className="mt-4"><PlusIcon className="w-5 h-5 mr-2" />Add Line Item</Button>

            <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="mb-4">
                        <label htmlFor="taxMode" className="block text-sm font-medium text-slate-600">Tax Calculation (for Sale Price)</label>
                        <Select id="taxMode" value={jobState.taxMode} onChange={handleTaxModeChange}>
                            <option value="exclusive">Tax Exclusive</option>
                            <option value="inclusive">Tax Inclusive</option>
                            <option value="none">No Tax</option>
                        </Select>
                    </div>
                     <div>
                        <label htmlFor="jobNotes" className="block text-sm font-medium text-slate-600">Notes</label>
                        <TextArea id="jobNotes" value={jobState.notes} onChange={e => handleHeaderChange('notes', e.target.value)} rows={3} />
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="w-full max-w-xs space-y-2 text-slate-700">
                        <div className="flex justify-between">
                            <span>Total Sale Price (ex. VAT)</span>
                            <span className="font-medium">{currency}{totals.totalSale.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Total Material Cost</span>
                            <span className="font-medium">{currency}{totals.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="border-t my-2"></div>
                        <div className="flex justify-between text-xl font-bold text-slate-900">
                            <span>Gross Profit</span>
                            <span style={{ color: (totals.totalSale - totals.totalCost) >= 0 ? 'green' : 'red' }}>
                                {currency}{(totals.totalSale - totals.totalCost).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </section>
            
             <footer className="mt-12 pt-6 border-t">
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleSave}>
                        {editingJobId ? 'Update Job' : 'Save Job'}
                    </Button>
                    <Button variant="primary" onClick={handleConvertToQuoteClick}>Create Quote from Job</Button>
                    <Button variant="primary" onClick={handleConvertToInvoiceClick}>Create Invoice from Job</Button>
                </div>
            </footer>
        </div>
        
        <CustomerSearchModal
            isOpen={isCustomerSearchModalOpen}
            onClose={() => setCustomerSearchModalOpen(false)}
            customers={customers}
            onSelectCustomer={handleSelectCustomerFromSearch}
        />
        <NewCustomerModal
            isOpen={isNewCustomerModalOpen}
            onClose={() => setNewCustomerModalOpen(false)}
            onSave={handleDetailedCustomerSave}
        />
         <InventorySearchModal
            isOpen={isInventorySearchModalOpen}
            onClose={() => setInventorySearchModalOpen(false)}
            inventory={inventory}
            categories={categories}
            settings={settings}
            onSelectItem={handleSelectItemFromInventory}
            invoiceType={invoiceType}
        />
        <SupplierInventorySearchModal
            isOpen={isSupplierInventorySearchModalOpen}
            onClose={() => setSupplierInventorySearchModalOpen(false)}
            items={supplierInventory}
            onSelectItem={handleAddLinkedCostItem}
        />
        <AddOnSelectionModal
            isOpen={isAddOnModalOpen}
            onClose={() => setIsAddOnModalOpen(false)}
            addOnOptions={addOnModalConfig?.inventoryItem.addOnOptions || []}
            initiallySelectedIds={jobState.lineItems.find(li => li.id === addOnModalConfig?.lineItemId)?.selectedAddOnIds || []}
            onConfirm={handleConfirmAddOns}
            settings={settings}
            itemName={addOnModalConfig?.inventoryItem.name || ''}
        />
        </>
    );
};

export default JobBuilder;