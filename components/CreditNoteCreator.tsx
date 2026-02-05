
import React, { useState, useMemo } from 'react';
import {
    CreditNoteState,
    InvoiceLineItem,
    InventoryItem,
    AppSettings,
    TaxMode,
    Customer,
} from '../types';
import InvoiceItemRow from './InvoiceItemRow';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { calculateBasePrice } from '../services/conversionService';
import { TextArea } from './ui/TextArea';
import { Input } from './ui/Input';
import CustomerSearchModal from './CustomerSearchModal';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';

interface CreditNoteCreatorProps {
    creditNoteState: CreditNoteState;
    setCreditNoteState: React.Dispatch<React.SetStateAction<CreditNoteState>>;
    inventory: InventoryItem[];
    customers: Customer[];
    settings: AppSettings;
    onSave: (state: CreditNoteState, total: number) => void;
    onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
    readOnly?: boolean;
    onClose?: () => void;
}

const CreditNoteCreator: React.FC<CreditNoteCreatorProps> = ({
    creditNoteState,
    setCreditNoteState,
    inventory,
    customers,
    settings,
    onSave,
    onAddCustomer,
    readOnly = false,
    onClose,
}) => {
    const [isCustomerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
    const isStandAlone = creditNoteState.originalInvoiceNumber === undefined;

    const handleHeaderChange = (field: keyof CreditNoteState, value: string) => {
        setCreditNoteState(prev => ({ ...prev, [field]: value }));
    };

    const handleAddItem = () => {
        const newItem: InvoiceLineItem = {
            id: crypto.randomUUID(),
            inventoryItemId: null,
            description: '',
            quantity: 1,
            vatRate: settings.defaultVatRate,
            discount: { type: 'fixed', value: 0 },
            price: 0,
        };
        setCreditNoteState(prev => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
    };

    const handleUpdateItem = (id: string, updates: Partial<InvoiceLineItem>) => {
        setCreditNoteState(prev => ({
            ...prev,
            lineItems: prev.lineItems.map(item => (item.id === id ? { ...item, ...updates } : item)),
        }));
    };

    const handleRemoveItem = (id: string) => {
        setCreditNoteState(prev => ({
            ...prev,
            lineItems: prev.lineItems.filter(item => item.id !== id),
        }));
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCreditNoteState(prev => ({ ...prev, notes: e.target.value }));
    };
    
    const handleTaxModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTaxMode = e.target.value as TaxMode;
        setCreditNoteState(prev => ({ ...prev, taxMode: newTaxMode }));
    };
    
    const handleSelectCustomerFromSearch = (customer: Customer) => {
        setCreditNoteState(prev => ({ ...prev, customerName: customer.name }));
        setCustomerSearchModalOpen(false);
    };

    const handleSaveNewCustomer = (name: string) => {
        onAddCustomer({
            name: name.trim(),
            address: 'Please update address in Customer Manager',
        });
    };
    
    const isNewCustomer = isStandAlone && creditNoteState.customerName.trim() !== '' && !customers.some(c => c.name.toLowerCase() === creditNoteState.customerName.toLowerCase().trim());

    const totals = useMemo(() => {
        let subtotal = 0;
        let vatTotal = 0;
        let grandTotal = 0;

        creditNoteState.lineItems.forEach(item => {
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
            
            if (creditNoteState.taxMode === 'inclusive') {
                const itemVatRate = 1 + (item.vatRate / 100);
                const exclusivePrice = priceAfterDiscount / itemVatRate;
                const itemVat = priceAfterDiscount - exclusivePrice;
                
                subtotal += exclusivePrice;
                vatTotal += itemVat;
                grandTotal += priceAfterDiscount;

            } else if (creditNoteState.taxMode === 'exclusive') {
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
    }, [creditNoteState.lineItems, inventory, creditNoteState.taxMode]);

    const handleSaveClick = () => {
        if (!creditNoteState.customerName.trim() || !creditNoteState.reference.trim()) {
            alert('Customer and Reference must be filled in before saving.');
            return;
        }
        onSave(creditNoteState, totals.grandTotal);
    };

    const currency = settings.currencySymbol || '£';

    return (
        <>
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{settings.companyName}</h2>
                </div>
                <h1 className="text-4xl font-bold text-slate-400 uppercase tracking-widest">{readOnly ? 'View Credit Note' : 'Credit Note'}</h1>
            </header>
            
            <fieldset disabled={readOnly} className="disabled:opacity-70">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Customer</label>
                        {isStandAlone ? (
                            <div className="flex items-start gap-2">
                                <div className="flex-grow">
                                    <Input id="customerName" value={creditNoteState.customerName} onChange={e => handleHeaderChange('customerName', e.target.value)} />
                                    {isNewCustomer && <p className="text-xs text-slate-500 mt-1">New customer. Click '+' to save.</p>}
                                </div>
                                <Button type="button" size="icon" variant="outline" onClick={() => setCustomerSearchModalOpen(true)} title="Search for existing customer"><SearchIcon className="w-5 h-5"/></Button>
                                {isNewCustomer && <Button type="button" size="icon" variant="primary" onClick={() => handleSaveNewCustomer(creditNoteState.customerName)} title="Save new customer"><PlusIcon className="w-5 h-5"/></Button>}
                            </div>
                        ) : (
                            <Input value={creditNoteState.customerName} readOnly disabled className="bg-slate-200" />
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Credit Note #</label>
                            <Input value={creditNoteState.creditNoteNumber} readOnly disabled className="bg-slate-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Reference</label>
                            <Input value={creditNoteState.reference} onChange={e => handleHeaderChange('reference', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Issue Date</label>
                        <Input type="date" value={creditNoteState.issueDate} onChange={e => handleHeaderChange('issueDate', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Original Invoice #</label>
                        <Input 
                            value={creditNoteState.originalInvoiceNumber || ''} 
                            onChange={e => handleHeaderChange('originalInvoiceNumber', e.target.value)}
                            readOnly={!isStandAlone} 
                            disabled={!isStandAlone} 
                            className={!isStandAlone ? "bg-slate-200" : ""} 
                            placeholder={isStandAlone ? "(Optional)" : ""}
                        />
                    </div>
                </section>

                <section className="mb-2 hidden sm:block">
                    <div className="bg-slate-100 p-4 rounded-t-lg border-b border-slate-200 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-x-1 items-center text-sm font-semibold text-slate-600">
                        <div className={`pl-2 ${creditNoteState.taxMode === 'none' ? 'col-span-5' : 'col-span-4'}`}>Item / Description</div>
                        <div className="col-span-4 pl-2">Account</div>
                        <div className={`pl-2 ${creditNoteState.taxMode === 'none' ? 'col-span-7' : 'col-span-6'}`}>Unit Price / Dim</div>
                        <div className="col-span-2 text-center pl-1">Qty</div>
                        <div className="col-span-2 text-center pl-1">Discount</div>
                        {creditNoteState.taxMode !== 'none' && <div className="col-span-2 text-center pl-1">VAT (%)</div>}
                        <div className="col-span-3 text-right pl-2">Total</div>
                        <div className="col-span-1" />
                    </div>
                </section>

                <section>
                    <div className="space-y-4">
                        {creditNoteState.lineItems.map(item => (
                            <InvoiceItemRow 
                                key={item.id} 
                                item={item} 
                                inventory={inventory}
                                settings={settings}
                                taxMode={creditNoteState.taxMode}
                                onUpdate={handleUpdateItem}
                                onRemove={handleRemoveItem}
                                onOpenSearch={() => {}}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                </section>
                
                {isStandAlone && !readOnly && (
                    <Button variant="outline" onClick={handleAddItem} className="mt-4">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Line Item
                    </Button>
                )}

                <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="mb-4">
                            <label htmlFor="taxMode" className="block text-sm font-medium text-slate-600">Tax Calculation</label>
                            <Select id="taxMode" value={creditNoteState.taxMode} onChange={handleTaxModeChange}>
                                <option value="exclusive">Tax Exclusive</option>
                                <option value="inclusive">Tax Inclusive</option>
                                <option value="none">No Tax</option>
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="notes" className="text-sm font-medium text-slate-600">Notes</label>
                            <TextArea id="notes" value={creditNoteState.notes} onChange={handleNotesChange} placeholder="Reason for credit..." rows={2} />
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="w-full max-w-xs space-y-2 text-slate-700">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-medium">{currency}{totals.subtotal.toFixed(2)}</span>
                            </div>
                            {creditNoteState.taxMode !== 'none' && (
                            <div className="flex justify-between">
                                <span>VAT</span>
                                <span className="font-medium">{currency}{totals.vatTotal.toFixed(2)}</span>
                            </div>
                            )}
                            <div className="border-t my-2"></div>
                            <div className="flex justify-between text-xl font-bold text-slate-900">
                                <span>Total Credit</span>
                                <span>{currency}{totals.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </section>
            </fieldset>
            
            <footer className="mt-12 pt-6 border-t">
                <div className="flex justify-end gap-2">
                    {readOnly ? (
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={handleSaveClick}>
                            Save Credit Note
                        </Button>
                    )}
                </div>
            </footer>
        </div>
        <CustomerSearchModal
            isOpen={isCustomerSearchModalOpen}
            onClose={() => setCustomerSearchModalOpen(false)}
            customers={customers}
            onSelectCustomer={handleSelectCustomerFromSearch}
        />
        </>
    );
};

export default CreditNoteCreator;
