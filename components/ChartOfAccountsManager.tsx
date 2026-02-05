import React, { useState, useMemo } from 'react';
import { Account, AccountType, User, AppSettings } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { exportToCsv } from '../services/csvService';
import { DownloadIcon } from './icons/DownloadIcon';

interface ChartOfAccountsManagerProps {
    accounts: Account[];
    currentUser: User;
    onAddAccount: (account: Omit<Account, 'id'>) => void;
    onUpdateAccount: (account: Account) => void;
    onRemoveAccount: (accountId: string) => void;
    settings: AppSettings;
    onUpdateSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const accountTypes: { type: AccountType; label: string }[] = [
    { type: 'Assets', label: 'Assets' },
    { type: 'Liabilities', label: 'Liabilities & Credit Cards' },
    { type: 'Income', label: 'Income' },
    { type: 'Expenses', label: 'Expenses' },
    { type: 'Equity', label: 'Equity' },
];

const ChartOfAccountsManager: React.FC<ChartOfAccountsManagerProps> = ({ accounts, currentUser, onAddAccount, onUpdateAccount, onRemoveAccount, settings, onUpdateSettings }) => {
    const [activeTab, setActiveTab] = useState<AccountType>('Assets');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [formData, setFormData] = useState({ name: '', type: 'Assets' as AccountType, code: '', description: '' });

    const filteredAccounts = useMemo(() => {
        return accounts.filter(acc => acc.type === activeTab);
    }, [accounts, activeTab]);

    const handleOpenAdd = () => {
        setEditingAccount(null);
        setFormData({ name: '', type: activeTab, code: '', description: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (account: Account) => {
        setEditingAccount(account);
        setFormData({ name: account.name, type: account.type, code: account.code || '', description: account.description || '' });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Account name is required.');
            return;
        }

        const accountData = {
            name: formData.name.trim(),
            type: formData.type,
            code: formData.code.trim() || undefined,
            description: formData.description.trim() || undefined,
            isSystem: editingAccount?.isSystem, // Preserve system flag
        };

        if (editingAccount) {
            onUpdateAccount({ ...accountData, id: editingAccount.id });
        } else {
            onAddAccount(accountData);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (accountId: string) => {
        if (window.confirm('Are you sure you want to delete this account?')) {
            onRemoveAccount(accountId);
        }
    };

    const handleExport = () => {
        exportToCsv('chart-of-accounts.csv', accounts);
    };

    const handleToggleShowOnInvoices = () => {
        onUpdateSettings(prev => ({
            ...prev,
            showAccountOnInvoices: !prev.showAccountOnInvoices
        }));
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Chart of Accounts</h2>
                <div className="flex gap-2">
                     {!currentUser.subscriptionStatus.startsWith('trial_') && (
                        <Button variant="outline" onClick={handleExport}>
                            <DownloadIcon className="w-5 h-5 mr-2" />
                            Export to CSV
                        </Button>
                    )}
                    <Button variant="primary" onClick={handleOpenAdd}>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Account
                    </Button>
                </div>
            </div>

            {/* Global Settings Section */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-3">Invoice & Quote Settings</h3>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative inline-flex items-center">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.showAccountOnInvoices ?? true}
                            onChange={handleToggleShowOnInvoices}
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        Show Account column on Invoices and Quotes
                    </span>
                </label>
                <p className="mt-2 text-xs text-blue-600">
                    When disabled, the "Account" selector will be removed from the line item rows on the creation pages to simplify the interface.
                </p>
            </div>

            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
                {accountTypes.map((tab) => (
                    <button
                        key={tab.type}
                        onClick={() => setActiveTab(tab.type)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            activeTab === tab.type
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {filteredAccounts.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        <p className="text-sm text-slate-500">No accounts found in this category.</p>
                    </div>
                ) : (
                    filteredAccounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                            <div>
                                <p className="font-semibold text-slate-800">{account.name}</p>
                                {(account.code || account.description) && (
                                    <p className="text-sm text-slate-500">
                                        {account.code && <span className="mr-2 font-mono text-xs bg-slate-200 px-1 rounded">{account.code}</span>}
                                        {account.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(account)} title="Edit Account">
                                    <PencilIcon className="w-5 h-5 text-slate-500 hover:text-blue-600" />
                                </Button>
                                {!account.isSystem && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)} title="Delete Account">
                                        <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? 'Edit Account' : 'Add Account'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Account Type</label>
                        <Select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as AccountType }))} disabled={!!editingAccount}>
                            {accountTypes.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Account Name</label>
                        <Input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required placeholder="e.g. Office Supplies" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Account Code (Optional)</label>
                        <Input value={formData.code} onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="e.g. 6001" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Description (Optional)</label>
                        <Input value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ChartOfAccountsManager;