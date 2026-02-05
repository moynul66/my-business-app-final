import React, { useState, useMemo } from 'react';
import {
    InvoiceState,
    InvoiceLineItem,
    InventoryItem,
    Customer,
    AppSettings,
    Category,
    ItemType,
    MeasurementUnit,
    TaxMode,
    Bill,
    Invoice,
    CreditNote,
    InvoiceCreationType,
    Account,
    AddOnOption,
} from '../types';
import InvoiceHeader from './InvoiceHeader';
import InvoiceItemRow from './InvoiceItemRow';
import InventorySearchModal from './InventorySearchModal';
import LinkBillModal from './LinkBillModal';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { PlusIcon } from './icons/PlusIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { calculateBasePrice } from '../services/conversionService';
import { TextArea } from './ui/TextArea';
import { LinkIcon } from './icons/LinkIcon';
import { XIcon } from './icons/XIcon';
import CustomerSearchModal from './CustomerSearchModal';
import NewCustomerModal from './NewCustomerModal';
import AddOnSelectionModal from './AddOnSelectionModal';

interface InvoiceCreatorProps {
    mode: 'invoice' | 'quote';
    editingInvoice: Invoice | null;
    editingQuoteId?: string | null;
    invoiceState: InvoiceState;
    setInvoiceState: React.Dispatch<React.SetStateAction<InvoiceState>>;
    inventory: InventoryItem[];
    customers: Customer[];
    settings: AppSettings;
    categories: Category[];
    bills: Bill[];
    unlinkedBills: Bill[];
    creditNotes: CreditNote[];
    accounts: Account[];
    onSaveDraft: (total: number) => void;
    onSaveQuote: (total: number) => void;
    onUpdateQuote?: (total: number) => void;
    onFinalizeInvoice: (state: InvoiceState, total: number) => void;
    onUpdateInvoice?: (state: InvoiceState, total: number) => void;
    onDownloadPdf: () => void;
    onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
    onViewCreditNote?: (creditNoteId: string) => void;
    onCancel?: () => void;
}

const InvoiceCreator: React.FC<InvoiceCreatorProps> = ({
    mode,
    editingInvoice,
    editingQuoteId,
    invoiceState,
    setInvoiceState,
    inventory,
    customers,
    settings,
    categories,
    bills,
    unlinkedBills,
    creditNotes,
    accounts,
    onSaveDraft,
    onSaveQuote,
    onUpdateQuote,
    onFinalizeInvoice,
    onUpdateInvoice,
    onDownloadPdf,
    onAddCustomer,
    onViewCreditNote,
    onCancel,
}) => {
    const [isSearchModalOpen, setSearchModalOpen] = useState(false);
    const [isLinkBillModalOpen, setLinkBillModalOpen] = useState(false);
    const [targetLineItemId, setTargetLineItemId] = useState<string | null>(null);
    const [isCustomerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
    const [isNewCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
    
    // Add-on state
    const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
    const [addOnModalConfig, setAddOnModalConfig] = useState<{ 
        lineItemId: string; 
        inventoryItem: InventoryItem; 
    } | null>(null);

    const { invoiceType = 'measured' } = invoiceState;
    const isEditingInvoice = !!editingInvoice;
    const isEditingQuote = !!editingQuoteId;
    const isSavedOrFinalised = isEditingInvoice || isEditingQuote || !!invoiceState._isLoaded;
    const showAccount = settings.showAccountOnInvoices ?? true;

    const handleHeaderChange = (field: keyof InvoiceState, value: string) => {
        setInvoiceState(prev => ({ ...prev, [field]: value }));
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
            selectedAddOnIds: [],
        };
        setInvoiceState(prev => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
    };

    const handleUpdateItem = (id: string, updates: Partial<InvoiceLineItem>) => {
        setInvoiceState(prev => ({
            ...prev,
            lineItems: prev.lineItems.map(item => (item.id === id ? { ...item, ...updates } : item)),
        }));
    };

    const handleRemoveItem = (id: string) => {
        setInvoiceState(prev => ({
            ...prev,
            lineItems: prev.lineItems.filter(item => item.id !== id),
        }));
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInvoiceState(prev => ({ ...prev, notes: e.target.value }));
    };

    const handleOpenSearchModal = (lineItemId: string) => {
        setTargetLineItemId(lineItemId);
        setSearchModalOpen(true);
    };

    const handleSelectItemFromSearch = (inventoryItem: InventoryItem) => {
        if (targetLineItemId) {
            const lineItem = invoiceState.lineItems.find(li => li.id === targetLineItemId);
            if (!lineItem) return;

            const updates: Partial<InvoiceLineItem> = {
                inventoryItemId: inventoryItem.id,
                description: inventoryItem.name, // Overwrite with new name
                price: undefined, // Clear manual price
                vatRate: inventoryItem.vatRate ?? settings.defaultVatRate,
                selectedAddOnIds: [],
                length: undefined, // Clear dimensions on change
                width: undefined,
                unit: undefined,
            };

            if (inventoryItem.type === ItemType.MEASURED) {
                updates.unit = inventoryItem.measurementUnit || MeasurementUnit.M;
            }

            handleUpdateItem(targetLineItemId, updates);
            setSearchModalOpen(false);
            
            // Check for add-ons on the item itself or its parent
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

    const handleTaxModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTaxMode = e.target.value as TaxMode;
        
        const updatedLineItems = invoiceState.lineItems.map(item => ({
            ...item,
            vatRate: newTaxMode === 'none' ? 0 : item.vatRate === 0 ? settings.defaultVatRate : item.vatRate,
        }));
    
        setInvoiceState(prev => ({ 
            ...prev, 
            taxMode: newTaxMode,
            lineItems: updatedLineItems
        }));
    };

    const handleLinkBills = (selectedBillIds: string[]) => {
        setInvoiceState(prev => ({
            ...prev,
            linkedBillIds: selectedBillIds,
        }));
        setLinkBillModalOpen(false);
    };

    const handleUnlinkBill = (billId: string) => {
        setInvoiceState(prev => ({
            ...prev,
            linkedBillIds: (prev.linkedBillIds || []).filter(id => id !== billId),
        }));
    };

    const handleSelectCustomerFromSearch = (customer: Customer) => {
        setInvoiceState(prev => ({ ...prev, customerName: customer.name }));
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
        setInvoiceState(prev => ({ ...prev, customerName: customerData.name }));
        setNewCustomerModalOpen(false);
    };

    const currentlyLinkedBills = React.useMemo(() => {
        return (invoiceState.linkedBillIds || [])
            .map(id => bills.find(b => b.id === id))
            .filter((b): b is Bill => !!b);
    }, [invoiceState.linkedBillIds, bills]);

    const availableBillsToLink = React.useMemo(() => {
        // Bills that are unlinked globally, plus bills currently linked to this invoice
        return [...unlinkedBills, ...currentlyLinkedBills];
    }, [unlinkedBills, currentlyLinkedBills]);


    const totals = React.useMemo(() => {
        let subtotal = 0; // Tax exclusive subtotal
        let vatTotal = 0;
        let grandTotal = 0;

        invoiceState.lineItems.forEach(item => {
            let basePrice;
            const selectedInventoryItem = inventory.find(i => i.id === item.inventoryItemId);

            if (selectedInventoryItem) {
                // If it's a child variation, its parent might have the add-ons
                const parent = selectedInventoryItem.parentId ? inventory.find(i => i.id === selectedInventoryItem.parentId) : null;
                const rawAddOns = [...(selectedInventoryItem.addOnOptions || []), ...(parent?.addOnOptions || [])];
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
                // vatTotal remains 0
            }
        });

        return { subtotal, vatTotal, grandTotal };
    }, [invoiceState.lineItems, inventory, invoiceState.taxMode]);

    const { totalPaid, totalCredited, isFullyPaid, appliedCredits } = useMemo(() => {
        if (!isEditingInvoice || !editingInvoice) {
            return { totalPaid: 0, totalCredited: 0, isFullyPaid: false, appliedCredits: [] };
        }

        const credits: { id: string; number: string; amount: number }[] = [];
        creditNotes.forEach(cn => {
            (cn.applications || []).forEach(app => {
                if (app.invoiceId === editingInvoice.id) {
                    credits.push({ id: cn.id, number: cn.state.creditNoteNumber, amount: app.amount });
                }
            });
        });
        
        const credited = credits.reduce((sum, c) => sum + c.amount, 0);
        const paid = editingInvoice.payments.reduce((sum, p) => sum + p.amount, 0);
        
        const netTotal = editingInvoice.total - credited;
        const fullyPaid = paid >= netTotal - 0.001;

        return { totalPaid: paid, totalCredited: credited, isFullyPaid: fullyPaid, appliedCredits: credits };
    }, [isEditingInvoice, editingInvoice, creditNotes]);

    const handleSave = (action: 'draft' | 'quote' | 'finalize' | 'update') => {
        if (!invoiceState.customerName.trim()) {
            alert('Customer / Business Name must be filled in before saving.');
            return;
        }

        // Finalizing requires a reference/PO for accounting reasons, but drafts/quotes can be flexible.
        if (action === 'finalize' && !invoiceState.reference.trim()) {
            if (!window.confirm('No Reference (PO #) was provided. Would you like to finalize this invoice anyway?')) {
                return;
            }
        }

        switch (action) {
            case 'draft':
                onSaveDraft(totals.grandTotal);
                break;
            case 'quote':
                if (isEditingQuote && onUpdateQuote) {
                    onUpdateQuote(totals.grandTotal);
                } else {
                    onSaveQuote(totals.grandTotal);
                }
                break;
            case 'finalize':
                onFinalizeInvoice(invoiceState, totals.grandTotal);
                break;
            case 'update':
                if (onUpdateInvoice) {
                    onUpdateInvoice(invoiceState, totals.grandTotal);
                }
                break;
        }
    };

    const title = isEditingInvoice ? 'Edit Invoice' : isEditingQuote ? 'Edit Quote' : mode === 'invoice' ? (settings.invoiceTitle || 'Invoice') : (settings.quoteTitle || 'Quote');
    const currency = settings.currencySymbol || '£';

    const handleOpenAddOnModalForExisting = (lineItemId: string) => {
        const lineItem = invoiceState.lineItems.find(li => li.id === lineItemId);
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
            {/* Header section with company details and invoice title */}
            <header className="flex justify-between items-start mb-8 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{settings.companyName}</h2>
                    <p className="text-sm text-slate-500 whitespace-pre-wrap">{settings.companyAddress}</p>
                    {settings.vatNumber && <p className="text-sm text-slate-500">VAT: {settings.vatNumber}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {settings.companyLogo && (
                        <img src={settings.companyLogo} alt="Company Logo" className="h-16 w-auto max-w-xs object-contain" />
                    )}
                    <h1 className="text-4xl font-bold text-slate-400 uppercase tracking-widest">{title}</h1>
                     <p className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {invoiceType === 'fixed' ? 'Fixed Price' : 'Unit Measurement'}
                    </p>
                </div>
            </header>
            
            {/* Customer details, dates, etc. */}
            <section className="mb-8">
                <InvoiceHeader
                    mode={mode}
                    customers={customers}
                    customerName={invoiceState.customerName}
                    setCustomerName={(name) => handleHeaderChange('customerName', name)}
                    invoiceNumber={invoiceState.invoiceNumber}
                    reference={invoiceState.reference}
                    setReference={(ref) => handleHeaderChange('reference', ref)}
                    issueDate={invoiceState.issueDate}
                    setIssueDate={(date) => handleHeaderChange('issueDate', date)}
                    completionDate={invoiceState.completionDate || invoiceState.issueDate}
                    setCompletionDate={(date) => handleHeaderChange('completionDate', date)}
                    dueDate={invoiceState.dueDate}
                    setDueDate={(date) => handleHeaderChange('dueDate', date)}
                    onOpenSearch={() => setCustomerSearchModalOpen(true)}
                    onOpenNewCustomerModal={() => setNewCustomerModalOpen(true)}
                    onSaveCustomer={handleSaveNewCustomer}
                />
            </section>

            {/* Line Items Table Header */}
            <section className="mb-2 hidden sm:block">
                <div className="bg-slate-100 p-4 rounded-t-lg border-b border-slate-200 hidden sm:grid sm:grid-cols-[repeat(24,minmax(0,1fr))] gap-x-1 items-center text-sm font-semibold text-slate-600">
                    <div className={`pl-2 ${showAccount ? (invoiceState.taxMode === 'none' ? 'col-span-5' : 'col-span-4') : (invoiceState.taxMode === 'none' ? 'col-span-7' : 'col-span-6')}`}>Item / Description</div>
                    {showAccount && <div className="col-span-4 pl-2">Account</div>}
                    <div className={`pl-2 ${showAccount ? (invoiceState.taxMode === 'none' ? 'col-span-7' : 'col-span-6') : (invoiceState.taxMode === 'none' ? 'col-span-9' : 'col-span-8')}`}>{invoiceState.taxMode === 'inclusive' ? 'Unit Price (inc. Tax)' : 'Unit Price'} / Dim</div>
                    <div className="col-span-2 text-center pl-1">Qty</div>
                    <div className="col-span-2 text-center pl-1">Discount</div>
                    {invoiceState.taxMode !== 'none' && <div className="col-span-2 text-center pl-1">VAT (%)</div>}
                    <div className="col-span-3 text-right pl-2">Total</div>
                    <div className="col-span-1" />
                </div>
            </section>

            {/* Line Items */}
            <section>
                <div className="space-y-4">
                    {invoiceState.lineItems.map(item => (
                        <InvoiceItemRow 
                            key={item.id} 
                            item={item} 
                            inventory={inventory}
                            settings={settings}
                            taxMode={invoiceState.taxMode}
                            accounts={accounts}
                            onUpdate={handleUpdateItem}
                            onRemove={handleRemoveItem}
                            onOpenSearch={handleOpenSearchModal}
                            onOpenAddOns={() => handleOpenAddOnModalForExisting(item.id)}
                        />
                    ))}
                </div>
            </section>

            <Button variant="outline" onClick={handleAddItem} className="mt-4">
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Line Item
            </Button>

             {/* Linked Bills */}
            {(mode === 'invoice' || isEditingInvoice) && (
                <section className="mt-8">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Linked Bills (for Job Costing)</h3>
                    <div className="bg-slate-50 p-4 rounded-lg">
                        {currentlyLinkedBills.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {currentlyLinkedBills.map(bill => (
                                    <div key={bill.id} className="flex justify-between items-center bg-white p-2 rounded">
                                        <p className="text-sm">
                                            <span className="font-medium">{bill.state.supplierName}</span> - Ref: {bill.state.reference} - {currency}{bill.total.toFixed(2)}
                                        </p>
                                        <Button size="icon" variant="ghost" onClick={() => handleUnlinkBill(bill.id)}>
                                            <XIcon className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button variant="outline" onClick={() => setLinkBillModalOpen(true)}>
                            <LinkIcon className="w-5 h-5 mr-2" />
                            {currentlyLinkedBills.length > 0 ? 'Link More Bills' : 'Link Bills'}
                        </Button>
                    </div>
                </section>
            )}

            {/* Totals, Notes, and Payment Info */}
            <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="mb-4">
                        <label htmlFor="taxMode" className="block text-sm font-medium text-slate-600">Tax Calculation</label>
                        <Select id="taxMode" value={invoiceState.taxMode} onChange={handleTaxModeChange}>
                            <option value="exclusive">Tax Exclusive (add tax to prices)</option>
                            <option value="inclusive">Tax Inclusive (tax is included in prices)</option>
                            <option value="none">No Tax</option>
                        </Select>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Notes & Payment Details</h3>
                    <div>
                        <label htmlFor="notes" className="text-sm font-medium text-slate-600">Notes</label>
                        <TextArea 
                            id="notes" 
                            value={invoiceState.notes}
                            onChange={handleNotesChange}
                            placeholder="Any additional notes..."
                            rows={2}
                            className="mb-4"
                        />
                    </div>
                    <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                        <p className="font-bold mb-1">Payment Details:</p>
                        <p>{settings.paymentTerms}</p>
                        <p>Bank: {settings.bankName}</p>
                        <p>A/N: {settings.accountNumber} | Sort Code: {settings.sortCode}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="w-full max-w-xs space-y-2 text-slate-700">
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
                        <div className="flex justify-between text-xl font-bold text-slate-900">
                            <span>Total</span>
                            <span>{currency}{totals.grandTotal.toFixed(2)}</span>
                        </div>
                        {isEditingInvoice && !isFullyPaid && appliedCredits.length > 0 && (
                            <>
                                {appliedCredits.map(cn => (
                                    <div key={cn.id} className="flex justify-between text-sm">
                                        <button
                                            type="button"
                                            onClick={() => onViewCreditNote && onViewCreditNote(cn.id)}
                                            className="text-blue-600 hover:underline font-medium"
                                            title={`View Credit Note ${cn.number}`}
                                        >
                                            Credit Note #{cn.number}
                                        </button>
                                        <span className="font-medium text-red-600">-{currency}{cn.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </>
                        )}
                        {isEditingInvoice && !isFullyPaid && (
                            <div className="border-t my-2"></div>
                        )}
                        {isEditingInvoice && !isFullyPaid && (
                            <div className="flex justify-between text-xl font-bold text-slate-900 bg-slate-100 p-2 rounded">
                                <span>Amount Due</span>
                                <span>{currency}{(totals.grandTotal - totalCredited - totalPaid).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            
            {/* Action Buttons */}
            <footer className="mt-12 pt-6 border-t">
                <div className="flex justify-end gap-2">
                    {isEditingInvoice ? (
                         <Button variant="primary" onClick={() => handleSave('update')}>
                            Update Invoice
                        </Button>
                    ) : mode === 'invoice' ? (
                        <>
                            <Button variant="outline" onClick={() => handleSave('draft')}>
                                <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                Save Draft
                            </Button>
                            <Button variant="primary" onClick={() => handleSave('finalize')}>
                                Finalise & Save Invoice
                            </Button>
                        </>
                    ) : isEditingQuote ? (
                        <>
                            <Button variant="outline" onClick={onCancel}>
                                Back to Quotes
                            </Button>
                            <Button variant="primary" onClick={() => handleSave('quote')}>
                                <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                Update Quote
                            </Button>
                        </>
                    ) : (
                         <Button variant="outline" onClick={() => handleSave('quote')}>
                            <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                            Save Quote
                        </Button>
                    )}
                    <Button variant="primary" onClick={onDownloadPdf} disabled={!isSavedOrFinalised}>
                         <DownloadIcon className="w-5 h-5 mr-2" />
                        Download {isEditingInvoice ? 'Invoice' : title} PDF
                    </Button>
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
            isOpen={isSearchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            inventory={inventory}
            categories={categories}
            settings={settings}
            onSelectItem={handleSelectItemFromSearch}
            invoiceType={invoiceType}
        />
        <LinkBillModal
            isOpen={isLinkBillModalOpen}
            onClose={() => setLinkBillModalOpen(false)}
            unlinkedBills={availableBillsToLink}
            initiallySelectedIds={invoiceState.linkedBillIds || []}
            settings={settings}
            onLinkBills={handleLinkBills}
        />
        <AddOnSelectionModal
            isOpen={isAddOnModalOpen}
            onClose={() => setIsAddOnModalOpen(false)}
            addOnOptions={addOnModalConfig?.inventoryItem.addOnOptions || []}
            initiallySelectedIds={invoiceState.lineItems.find(li => li.id === addOnModalConfig?.lineItemId)?.selectedAddOnIds || []}
            onConfirm={handleConfirmAddOns}
            settings={settings}
            itemName={addOnModalConfig?.inventoryItem.name || ''}
        />
        </>
    );
};

export default InvoiceCreator;