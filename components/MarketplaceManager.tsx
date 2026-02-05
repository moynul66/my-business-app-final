
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MarketplaceAccount, User, MarketplaceStatement, AppSettings } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { Select } from './ui/Select';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface MarketplaceManagerProps {
    marketplaceAccounts: MarketplaceAccount[];
    marketplaceStatements: MarketplaceStatement[];
    currentUser: User;
    settings: AppSettings;
    marketplaces: string[];
    setMarketplaces: React.Dispatch<React.SetStateAction<string[]>>;
    onAddAccount: (account: Omit<MarketplaceAccount, 'id'>) => void;
    onUpdateAccount: (account: MarketplaceAccount) => void;
    onRemoveAccount: (id: string) => void;
    onAddStatement: (statement: Omit<MarketplaceStatement, 'id' | 'createdAt'>) => void;
    onUpdateStatement: (statement: MarketplaceStatement) => void;
    onRemoveStatement: (id: string) => void;
}

type VatTreatmentData = NonNullable<MarketplaceStatement['vatTreatment']>;

const MarketplaceManager: React.FC<MarketplaceManagerProps> = ({
    marketplaceAccounts,
    marketplaceStatements,
    currentUser,
    settings,
    marketplaces,
    setMarketplaces,
    onAddAccount,
    onUpdateAccount,
    onRemoveAccount,
    onAddStatement,
    onUpdateStatement,
    onRemoveStatement
}) => {
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const currency = settings.currencySymbol || '£';
    const [newMarketplaceName, setNewMarketplaceName] = useState('');

    const initialFormState = useMemo(() => ({
        marketplace: marketplaces[0] || '',
        storeName: '',
        notes: ''
    }), [marketplaces]);

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (!editingAccountId && !marketplaces.includes(formData.marketplace)) {
            setFormData(prev => ({ ...prev, marketplace: marketplaces[0] || '' }));
        }
    }, [marketplaces, editingAccountId, formData.marketplace]);

    const initialStatementFormState = useMemo(() => ({
        marketplaceAccountId: selectedAccountId || '',
        statementType: 'weekly' as 'weekly' | 'monthly',
        startDate: '',
        endDate: '',
        orders: 0,
        ordersVatTreatment: 'exclusive' as 'inclusive' | 'exclusive' | 'none',
        claims: 0,
        refunds: 0,
        paymentDisputes: 0,
        postageLabelsFees: 0,
        otherFees: 0,
        adjustments: 0,
        purchases: 0,
        charges: 0,
        payouts: 0,
        fullVatClaim: 0,
        notes: '',
        vatTreatment: {} as VatTreatmentData
    }), [selectedAccountId]);

    const [statementFormData, setStatementFormData] = useState(initialStatementFormState);
    const [editingStatementId, setEditingStatementId] = useState<string | null>(null);

     useEffect(() => {
        if (selectedAccountId) {
            setStatementFormData({ ...initialStatementFormState, marketplaceAccountId: selectedAccountId });
        }
        setEditingStatementId(null);
    }, [selectedAccountId, initialStatementFormState]);

    const resetForm = () => {
        setFormData(initialFormState);
        setEditingAccountId(null);
    };
    
    const handleFormChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleStartEdit = (account: MarketplaceAccount) => {
        setEditingAccountId(account.id);
        setFormData({
            marketplace: account.marketplace,
            storeName: account.storeName,
            notes: account.notes || ''
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.storeName.trim()) {
            alert('Please provide a store name.');
            return;
        }
        if (!formData.marketplace) {
            alert('Please select a marketplace. If your list is empty, add one first.');
            return;
        }
        
        const accountData = {
            marketplace: formData.marketplace,
            storeName: formData.storeName,
            notes: formData.notes || undefined
        };

        if (editingAccountId) {
            onUpdateAccount({ id: editingAccountId, ...accountData });
        } else {
            onAddAccount(accountData);
        }
        resetForm();
    };

    const filteredAccounts = useMemo(() => {
        if (!searchTerm) {
            return marketplaceAccounts;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return marketplaceAccounts.filter(account =>
            account.storeName.toLowerCase().includes(lowercasedTerm) ||
            account.marketplace.toLowerCase().includes(lowercasedTerm)
        );
    }, [marketplaceAccounts, searchTerm]);

    const handleStatementFormChange = (field: keyof Omit<typeof statementFormData, 'vatTreatment'>, value: string | number) => {
        setStatementFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleVatTreatmentChange = (field: keyof VatTreatmentData, value: 'claim' | 'no-claim') => {
        setStatementFormData(prev => ({
            ...prev,
            vatTreatment: {
                ...prev.vatTreatment,
                [field]: value
            }
        }));
    };

    const resetStatementForm = () => {
        setStatementFormData(initialStatementFormState);
        setEditingStatementId(null);
    };

    const handleStatementSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!statementFormData.startDate || !statementFormData.endDate) {
            alert('Please provide a start and end date for the statement.');
            return;
        }

        const dataToSave = {
            marketplaceAccountId: statementFormData.marketplaceAccountId,
            statementType: statementFormData.statementType,
            startDate: statementFormData.startDate,
            endDate: statementFormData.endDate,
            ordersVatTreatment: statementFormData.ordersVatTreatment,
            notes: statementFormData.notes,
            vatTreatment: statementFormData.vatTreatment,
            // Inflows
            orders: Number(statementFormData.orders) || 0,
            payouts: Number(statementFormData.payouts) || 0,
            fullVatClaim: Number(statementFormData.fullVatClaim) || 0,
            // Can be positive or negative
            adjustments: Number(statementFormData.adjustments) || 0,
            // Outflows (convert to negative)
            claims: -Math.abs(Number(statementFormData.claims) || 0),
            refunds: -Math.abs(Number(statementFormData.refunds) || 0),
            paymentDisputes: -Math.abs(Number(statementFormData.paymentDisputes) || 0),
            postageLabelsFees: -Math.abs(Number(statementFormData.postageLabelsFees) || 0),
            otherFees: -Math.abs(Number(statementFormData.otherFees) || 0),
            purchases: -Math.abs(Number(statementFormData.purchases) || 0),
            charges: -Math.abs(Number(statementFormData.charges) || 0),
        };

        if (editingStatementId) {
            const existingStatement = marketplaceStatements.find(s => s.id === editingStatementId);
            if (existingStatement) {
                onUpdateStatement({ ...dataToSave, id: editingStatementId, createdAt: existingStatement.createdAt });
            }
        } else {
            onAddStatement(dataToSave);
        }
        resetStatementForm();
    };

    const handleStartEditStatement = (statement: MarketplaceStatement) => {
        setEditingStatementId(statement.id);
        setStatementFormData({
            marketplaceAccountId: statement.marketplaceAccountId,
            statementType: statement.statementType,
            startDate: statement.startDate,
            endDate: statement.endDate,
            orders: statement.orders,
            ordersVatTreatment: statement.ordersVatTreatment || 'exclusive',
            claims: Math.abs(statement.claims),
            refunds: Math.abs(statement.refunds),
            paymentDisputes: Math.abs(statement.paymentDisputes),
            postageLabelsFees: Math.abs(statement.postageLabelsFees),
            otherFees: Math.abs(statement.otherFees),
            adjustments: statement.adjustments,
            purchases: Math.abs(statement.purchases),
            charges: Math.abs(statement.charges),
            payouts: statement.payouts,
            fullVatClaim: statement.fullVatClaim || 0,
            notes: statement.notes || '',
            vatTreatment: statement.vatTreatment || {}
        });
    };

    const filteredStatements = useMemo(() => {
        if (!selectedAccountId) return [];
        return marketplaceStatements
            .filter(s => s.marketplaceAccountId === selectedAccountId)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [marketplaceStatements, selectedAccountId]);

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId) return null;
        return marketplaceAccounts.find(acc => acc.id === selectedAccountId);
    }, [marketplaceAccounts, selectedAccountId]);
    
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const handleAddMarketplace = (e: React.FormEvent) => {
        e.preventDefault();
        const name = newMarketplaceName.trim();
        if (name && !marketplaces.some(m => m.toLowerCase() === name.toLowerCase())) {
            setMarketplaces(prev => [...prev, name].sort());
            setNewMarketplaceName('');
        } else if (!name) {
            alert("Marketplace name cannot be empty.");
        } else {
            alert("This marketplace already exists.");
        }
    };

    const handleRemoveMarketplace = (marketplaceToRemove: string) => {
        const isUsed = marketplaceAccounts.some(acc => acc.marketplace === marketplaceToRemove);
        if (isUsed) {
            alert(`Cannot remove "${marketplaceToRemove}" as it is being used by one or more accounts.`);
            return;
        }
        if (window.confirm(`Are you sure you want to remove the "${marketplaceToRemove}" marketplace?`)) {
            setMarketplaces(prev => prev.filter(m => m !== marketplaceToRemove));
        }
    };

    const OutgoingFieldWithVat: React.FC<{
        id: keyof VatTreatmentData;
        label: string;
        value: number;
    }> = ({ id, label, value }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-600">{label} (Outgoing)</label>
            <div className="flex gap-2">
                <div className="relative flex-grow">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-500 sm:text-sm">- {currency}</span>
                    </div>
                    <Input id={id} type="number" step="0.01" value={value} onChange={e => handleStatementFormChange(id, e.target.value)} className="pl-12 text-right" />
                </div>
                <Select value={(statementFormData.vatTreatment as VatTreatmentData)[id] || 'no-claim'} onChange={e => handleVatTreatmentChange(id, e.target.value as 'claim' | 'no-claim')}>
                    <option value="no-claim">Do Not Claim VAT</option>
                    <option value="claim">Claim VAT</option>
                </Select>
            </div>
        </div>
    );

    if (selectedAccountId) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <Button variant="outline" onClick={() => setSelectedAccountId(null)} className="mb-4">
                    &larr; Back to All Accounts
                </Button>
                <h2 className="text-3xl font-bold text-slate-800 mb-1">Manage Statements</h2>
                <h3 className="text-xl text-slate-600 mb-6">{selectedAccount?.storeName} ({selectedAccount?.marketplace})</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-medium mb-4 text-slate-900">{editingStatementId ? 'Edit Statement' : 'Add New Statement'}</h3>
                        <form onSubmit={handleStatementSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">Statement Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input type="radio" name="statementType" value="weekly" checked={statementFormData.statementType === 'weekly'} onChange={() => handleStatementFormChange('statementType', 'weekly')} className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"/>
                                        <span className="ml-2 text-sm text-slate-700">Weekly</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input type="radio" name="statementType" value="monthly" checked={statementFormData.statementType === 'monthly'} onChange={() => handleStatementFormChange('statementType', 'monthly')} className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"/>
                                        <span className="ml-2 text-sm text-slate-700">Monthly</span>
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-600">Start Date</label>
                                    <Input id="startDate" type="date" value={statementFormData.startDate} onChange={e => handleStatementFormChange('startDate', e.target.value)} required />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-600">End Date</label>
                                    <Input id="endDate" type="date" value={statementFormData.endDate} onChange={e => handleStatementFormChange('endDate', e.target.value)} required />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="orders" className="block text-sm font-medium text-slate-600">Orders (Total minus fees)</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-slate-500 sm:text-sm">{currency}</span>
                                            </div>
                                            <Input id="orders" type="number" step="0.01" value={statementFormData.orders} onChange={e => handleStatementFormChange('orders', e.target.value)} className="pl-8 text-right"/>
                                        </div>
                                        <Select value={statementFormData.ordersVatTreatment} onChange={e => handleStatementFormChange('ordersVatTreatment', e.target.value)}>
                                            <option value="exclusive">Excludes VAT</option>
                                            <option value="inclusive">Includes VAT</option>
                                            <option value="none">No VAT</option>
                                        </Select>
                                    </div>
                                </div>
                                <OutgoingFieldWithVat id="refunds" label="Refunds" value={statementFormData.refunds} />
                                <OutgoingFieldWithVat id="claims" label="Claims" value={statementFormData.claims} />
                                <OutgoingFieldWithVat id="paymentDisputes" label="Payment Disputes" value={statementFormData.paymentDisputes} />
                                <OutgoingFieldWithVat id="postageLabelsFees" label="Postage Labels Fees" value={statementFormData.postageLabelsFees} />
                                <OutgoingFieldWithVat id="otherFees" label="Other Fees" value={statementFormData.otherFees} />
                                <OutgoingFieldWithVat id="purchases" label="Purchases" value={statementFormData.purchases} />
                                <OutgoingFieldWithVat id="charges" label="Charges" value={statementFormData.charges} />
                                
                                <div>
                                    <label htmlFor="adjustments" className="block text-sm font-medium text-slate-600">Adjustments</label>
                                    <Input id="adjustments" type="number" step="0.01" value={statementFormData.adjustments} onChange={e => handleStatementFormChange('adjustments', e.target.value)} />
                                </div>

                                <div>
                                    <label htmlFor="payouts" className="block text-sm font-medium text-slate-600">Payout Amount (Net)</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-slate-500 sm:text-sm">{currency}</span>
                                        </div>
                                        <Input id="payouts" type="number" step="0.01" value={statementFormData.payouts} onChange={e => handleStatementFormChange('payouts', e.target.value)} className="pl-8 text-right"/>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="fullVatClaim" className="block text-sm font-medium text-slate-600">Full VAT Claim</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <span className="text-slate-500 sm:text-sm">{currency}</span>
                                        </div>
                                        <Input id="fullVatClaim" type="number" step="0.01" value={statementFormData.fullVatClaim} onChange={e => handleStatementFormChange('fullVatClaim', e.target.value)} className="pl-8 text-right"/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="statementNotes" className="block text-sm font-medium text-slate-600">Notes</label>
                                <TextArea id="statementNotes" value={statementFormData.notes} onChange={e => handleStatementFormChange('notes', e.target.value)} rows={2} />
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <Button type="submit" variant="primary" className="w-full">
                                    {editingStatementId ? 'Update Statement' : 'Save Statement'}
                                </Button>
                                {editingStatementId && <Button type="button" variant="outline" onClick={resetStatementForm} className="w-full">Cancel Edit</Button>}
                            </div>
                        </form>
                    </div>
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-medium mb-4 text-slate-900">Statement History</h3>
                         <div className="max-h-[75vh] overflow-y-auto space-y-3 pr-2">
                            {filteredStatements.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                                    <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
                                    <p className="mt-2 text-sm text-slate-500">No statements recorded for this account yet.</p>
                                </div>
                            ) : (
                                filteredStatements.map(statement => {
                                    const totalFees = statement.postageLabelsFees + statement.otherFees + statement.purchases + statement.charges + statement.claims + statement.refunds + statement.paymentDisputes;
                                    const netTransactions = statement.orders + statement.adjustments;
                                    
                                    return (
                                    <div key={statement.id} className="bg-slate-100 p-4 rounded-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-slate-800 capitalize">
                                                    {statement.statementType} Statement
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {new Date(statement.startDate).toLocaleDateString()} - {new Date(statement.endDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center shrink-0">
                                                <Button variant="ghost" size="icon" onClick={() => handleStartEditStatement(statement)} title="Edit Statement"><PencilIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => onRemoveStatement(statement.id)} title="Delete Statement"><TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" /></Button>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                            <div><span className="font-medium text-slate-600">Transactions:</span> <span className="font-medium text-slate-800">{formatCurrency(netTransactions)}</span></div>
                                            <div><span className="font-medium text-slate-600">Fees/Outgoings:</span> <span className="font-medium text-slate-800">{formatCurrency(totalFees)}</span></div>
                                            <div><span className="font-medium text-slate-600">Payout:</span> <span className="font-bold text-green-700">{formatCurrency(statement.payouts)}</span></div>
                                        </div>
                                        {statement.notes && <p className="text-xs text-slate-500 mt-2 italic">Notes: {statement.notes}</p>}
                                    </div>
                                )})
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Manage Marketplaces</h2>
                 <div className="flex gap-2">
                    {!currentUser.subscriptionStatus.startsWith('trial_') && (
                        <>
                            <Button variant="outline" onClick={() => exportToCsv('marketplaces-backup.csv', marketplaceAccounts)}>
                                <DownloadIcon className="w-5 h-5 mr-2" /> Export
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-8">
                    <div>
                        <h3 className="text-lg font-medium mb-4 text-slate-900">Manage Marketplace List</h3>
                        <form onSubmit={handleAddMarketplace} className="space-y-4 bg-slate-50 p-4 rounded-lg">
                            <Input
                                value={newMarketplaceName}
                                onChange={(e) => setNewMarketplaceName(e.target.value)}
                                placeholder="Add new marketplace name..."
                            />
                            <Button type="submit" variant="outline" className="w-full">Add Marketplace</Button>
                        </form>
                        <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
                            {marketplaces.map(mp => (
                                <div key={mp} className="flex justify-between items-center bg-slate-100 p-2 rounded-md">
                                    <span className="text-sm text-slate-800">{mp}</span>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMarketplace(mp)} title={`Delete ${mp}`}>
                                        <TrashIcon className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-4 text-slate-900">{editingAccountId ? 'Edit Account' : 'Add New Account'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="marketplaceType" className="block text-sm font-medium text-slate-600">Marketplace</label>
                                <Select id="marketplaceType" value={formData.marketplace} onChange={(e) => handleFormChange('marketplace', e.target.value)}>
                                    {marketplaces.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="storeName" className="block text-sm font-medium text-slate-600">Store Name</label>
                                <Input id="storeName" value={formData.storeName} onChange={(e) => handleFormChange('storeName', e.target.value)} required />
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-slate-600">Notes</label>
                                <TextArea id="notes" value={formData.notes} onChange={(e) => handleFormChange('notes', e.target.value)} rows={3} />
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <Button type="submit" variant="primary" className="w-full">
                                    <PlusIcon className="w-5 h-5 mr-2" />
                                    {editingAccountId ? 'Update Account' : 'Add Account'}
                                </Button>
                                {editingAccountId && (
                                    <Button type="button" variant="outline" onClick={resetForm} className="w-full">
                                        Cancel Edit
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <h3 className="text-lg font-medium mb-4 text-slate-900">Existing Accounts</h3>
                    <div className="mb-4">
                        <Input 
                            placeholder="Search by store name or marketplace..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="max-h-[75vh] overflow-y-auto space-y-3 pr-2">
                        {marketplaceAccounts.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                                 <GlobeAltIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">No marketplace accounts saved yet.</p>
                            </div>
                        ) : filteredAccounts.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                                <p className="text-sm text-slate-500">No accounts found.</p>
                            </div>
                        ) : (
                            filteredAccounts.map(account => (
                                <div key={account.id} className="bg-slate-100 p-4 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-800">{account.storeName}</p>
                                            <p className="text-sm text-slate-800">{account.marketplace}</p>
                                        </div>
                                        <div className="flex items-center shrink-0 -ml-2">
                                            <Button variant="outline" onClick={() => setSelectedAccountId(account.id)} className="mr-2">
                                                <DocumentTextIcon className="w-5 h-5 mr-2" />
                                                Manage Statements
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(account)} title="Edit account">
                                                <PencilIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onRemoveAccount(account.id)} title="Delete account">
                                                <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                    {account.notes && 
                                    <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-sm text-slate-600">
                                        <p className="whitespace-pre-wrap"><strong>Notes:</strong> {account.notes}</p>
                                    </div>
                                    }
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketplaceManager;
