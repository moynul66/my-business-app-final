
import React, { useState, useEffect } from 'react';
import { SubscriptionPackage, InvoiceCreationType, User, PackagePermissions, PageKey } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { Select } from './ui/Select';

interface PackageSettingsManagerProps {
    packages: SubscriptionPackage[];
    setPackages: React.Dispatch<React.SetStateAction<SubscriptionPackage[]>>;
    users: User[];
}

const newPackageInitialState: Omit<SubscriptionPackage, 'id'> = {
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    features: ['New Feature'],
    stripeLink: '',
    allowFixedPrice: true,
    allowMeasuredPrice: false,
    teamMemberLimit: 0,
    permissions: {},
};

const pagePermissionsConfig: { group: string; key: PageKey; label: string }[] = [
  { group: 'General', key: 'dashboard', label: 'Dashboard' },
  { group: 'Job Costing', key: 'job-builder', label: 'Job Builder' },
  { group: 'Job Costing', key: 'manage-jobs', label: 'Manage Jobs (Costing)' },
  { group: 'Sales', key: 'manage-invoices', label: 'Invoices' },
  { group: 'Sales', key: 'manage-quotes', label: 'Quotes' },
  { group: 'Sales', key: 'manage-drafts', label: 'Drafts' },
  { group: 'Sales', key: 'manage-daily-takings', label: 'Daily Takings' },
  { group: 'Sales', key: 'manage-credit-notes', label: 'Credit Notes' },
  { group: 'Purchasing', key: 'manage-purchase-orders', label: 'Purchase Orders' },
  { group: 'Purchasing', key: 'manage-bills', label: 'Bills' },
  { group: 'Customers & Suppliers', key: 'manage-customers', label: 'Customers' },
  { group: 'Customers & Suppliers', key: 'manage-suppliers', label: 'Suppliers' },
  { group: 'Management', key: 'manage-inventory', label: 'Inventory' },
  { group: 'Management', key: 'manage-supplier-inventory', label: 'Supplier Inventory' },
  { group: 'Management', key: 'job-board', label: 'Jobs Board' },
  { group: 'Management', key: 'manage-chart-of-accounts', label: 'Chart of Accounts' },
  { group: 'Management', key: 'reports', label: 'Reports' },
  { group: 'System', key: 'settings', label: 'Settings' },
];

const pageGroups = pagePermissionsConfig.reduce((acc, page) => {
    (acc[page.group] = acc[page.group] || []).push(page);
    return acc;
}, {} as Record<string, { key: PageKey; label: string }[]>);

const PackageSettingsManager: React.FC<PackageSettingsManagerProps> = ({ packages, setPackages, users }) => {
    const [editablePackages, setEditablePackages] = useState<SubscriptionPackage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newPackageData, setNewPackageData] = useState(newPackageInitialState);

    useEffect(() => {
        // Deep copy and ensure defaults
        setEditablePackages(JSON.parse(JSON.stringify(packages)).map((p: SubscriptionPackage) => ({
            ...p,
            teamMemberLimit: p.teamMemberLimit ?? 0,
            permissions: p.permissions || {},
        })));
    }, [packages]);

    const handlePackageChange = (
        packageId: string,
        field: keyof Omit<SubscriptionPackage, 'id' | 'features' | 'permissions'>,
        value: string | number | boolean
    ) => {
        setEditablePackages(prev =>
            prev.map(pkg => pkg.id === packageId ? { ...pkg, [field]: value } : pkg)
        );
    };
    
    const handlePermissionChange = (packageId: string, key: PageKey, value: boolean) => {
        setEditablePackages(prev =>
            prev.map(pkg => 
                pkg.id === packageId 
                    ? { ...pkg, permissions: { ...(pkg.permissions || {}), [key]: value } }
                    : pkg
            )
        );
    };

    const handleFeatureChange = (
        packageId: string,
        index: number,
        value: string
    ) => {
        setEditablePackages(prev =>
            prev.map(pkg => {
                if (pkg.id !== packageId) return pkg;
                const newFeatures = [...pkg.features];
                newFeatures[index] = value;
                return { ...pkg, features: newFeatures };
            })
        );
    };

    const handleAddFeature = (packageId: string) => {
        setEditablePackages(prev =>
            prev.map(pkg =>
                pkg.id === packageId ? { ...pkg, features: [...pkg.features, ''] } : pkg
            )
        );
    };
    
    const handleRemoveFeature = (packageId: string, index: number) => {
         setEditablePackages(prev =>
            prev.map(pkg => {
                if (pkg.id !== packageId) return pkg;
                const newFeatures = pkg.features.filter((_, i) => i !== index);
                return { ...pkg, features: newFeatures };
            })
        );
    };

    const handleSaveChanges = () => {
        setPackages(editablePackages);
        alert('Package settings have been saved!');
    };
    
     const handleNewPackageDataChange = (
        field: keyof Omit<typeof newPackageData, 'features' | 'permissions'>,
        value: string | number | boolean
    ) => {
        setNewPackageData(prev => ({ ...prev, [field]: value }));
    };

    const handleNewPackagePermissionChange = (key: PageKey, value: boolean) => {
        setNewPackageData(prev => ({
            ...prev,
            permissions: { ...(prev.permissions || {}), [key]: value },
        }));
    };

    const handleCreateNewPackage = () => {
        if (!newPackageData.name.trim()) {
            alert('Please enter a package name.');
            return;
        }
        const newPackage: SubscriptionPackage = {
            ...newPackageData,
            id: crypto.randomUUID(),
        };
        setPackages(prev => [...prev, newPackage]);
        setNewPackageData(newPackageInitialState);
        setIsCreating(false);
    };

    const handleDeletePackage = (packageId: string) => {
        const pkgToDelete = packages.find(p => p.id === packageId);
        if (!pkgToDelete) return;

        const isPackageInUse = users.some(user => 
            user.subscriptionStatus === `package_${packageId}` || 
            user.subscriptionStatus === `trial_${packageId}`
        );

        if (isPackageInUse) {
            alert(`Cannot delete the "${pkgToDelete.name}" package because one or more users are currently subscribed to it.`);
            return;
        }

        if (window.confirm(`Are you sure you want to delete the "${pkgToDelete.name}" package? This action cannot be undone.`)) {
            setPackages(prev => prev.filter(p => p.id !== packageId));
        }
    };

    const renderPermissionsForm = (
        permissions: PackagePermissions,
        onChange: (key: PageKey, value: boolean) => void
    ) => (
         <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Page Access Permissions</label>
            <div className="space-y-4 rounded-lg border bg-white p-4">
                {Object.entries(pageGroups).map(([group, pages]) => (
                    <div key={group}>
                        <h4 className="font-semibold text-slate-600 mb-2">{group}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            {pages.map(({ key, label }) => (
                                <label key={key} className="flex items-center gap-2 text-sm text-slate-800">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={permissions?.[key] ?? false}
                                        onChange={e => onChange(key, e.target.checked)}
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderPackageForm = (
        pkg: SubscriptionPackage,
    ) => {
        if (!pkg) return null;
        return (
            <div className="bg-slate-50 p-6 rounded-lg border" key={pkg.id}>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{pkg.name} Package</h3>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-600">Package Name</label>
                        <Input value={pkg.name} onChange={e => handlePackageChange(pkg.id, 'name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Description</label>
                        <TextArea value={pkg.description} onChange={e => handlePackageChange(pkg.id, 'description', e.target.value)} rows={2} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Price (£)</label>
                            <Input type="number" value={pkg.price} onChange={e => handlePackageChange(pkg.id, 'price', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Original Price (£)</label>
                            <Input type="number" value={pkg.originalPrice} onChange={e => handlePackageChange(pkg.id, 'originalPrice', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">Package Type Permissions</label>
                        <div className="flex items-center gap-4 bg-white p-2 rounded-md border">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={pkg.allowFixedPrice ?? false}
                                    onChange={e => handlePackageChange(pkg.id, 'allowFixedPrice', e.target.checked)}
                                />
                                Allow Fixed Price
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={pkg.allowMeasuredPrice ?? false}
                                    onChange={e => handlePackageChange(pkg.id, 'allowMeasuredPrice', e.target.checked)}
                                />
                                Allow Measured Unit Price
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Team Member Limit</label>
                        <Input 
                            type="number"
                            min="0"
                            value={pkg.teamMemberLimit} 
                            onChange={e => handlePackageChange(pkg.id, 'teamMemberLimit', parseInt(e.target.value, 10) || 0)} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Stripe Payment Link (Optional)</label>
                        <Input 
                            type="url" 
                            placeholder="https://buy.stripe.com/..." 
                            value={pkg.stripeLink || ''} 
                            onChange={e => handlePackageChange(pkg.id, 'stripeLink', e.target.value)} 
                        />
                    </div>
                    {renderPermissionsForm(pkg.permissions || {}, (key, value) => handlePermissionChange(pkg.id, key, value))}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Features</label>
                        <div className="space-y-2">
                            {pkg.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input value={feature} onChange={e => handleFeatureChange(pkg.id, index, e.target.value)} />
                                    <Button size="icon" variant="ghost" type="button" onClick={() => handleRemoveFeature(pkg.id, index)}>
                                        <TrashIcon className="w-5 h-5 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                         <Button variant="outline" type="button" onClick={() => handleAddFeature(pkg.id)} className="mt-2">
                            <PlusIcon className="w-4 h-4 mr-2" /> Add Feature
                        </Button>
                    </div>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button
                        variant="danger"
                        onClick={() => handleDeletePackage(pkg.id)}
                        type="button"
                    >
                        <TrashIcon className="w-5 h-5 mr-2" />
                        Delete Package
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Package Settings</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsCreating(true)}>Create New Package</Button>
                    <Button variant="primary" onClick={handleSaveChanges}>Save All Changes</Button>
                </div>
            </div>
            
            {isCreating && (
                 <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">New Package</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Package Name</label>
                            <Input value={newPackageData.name} onChange={e => handleNewPackageDataChange('name', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Description</label>
                            <TextArea value={newPackageData.description} onChange={e => handleNewPackageDataChange('description', e.target.value)} rows={2} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600">Price (£)</label>
                                <Input type="number" value={newPackageData.price} onChange={e => handleNewPackageDataChange('price', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600">Original Price (£)</label>
                                <Input type="number" value={newPackageData.originalPrice} onChange={e => handleNewPackageDataChange('originalPrice', parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-600">Package Type Permissions</label>
                            <div className="flex items-center gap-4 bg-white p-2 rounded-md border">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={newPackageData.allowFixedPrice ?? false}
                                        onChange={e => handleNewPackageDataChange('allowFixedPrice', e.target.checked)}
                                    />
                                    Allow Fixed Price
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={newPackageData.allowMeasuredPrice ?? false}
                                        onChange={e => handleNewPackageDataChange('allowMeasuredPrice', e.target.checked)}
                                    />
                                    Allow Measured Unit Price
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Team Member Limit</label>
                            <Input type="number" min="0" value={newPackageData.teamMemberLimit} onChange={e => handleNewPackageDataChange('teamMemberLimit', parseInt(e.target.value, 10) || 0)} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600">Stripe Payment Link (Optional)</label>
                            <Input type="url" placeholder="https://buy.stripe.com/..." value={newPackageData.stripeLink} onChange={e => handleNewPackageDataChange('stripeLink', e.target.value)} />
                        </div>
                        {renderPermissionsForm(newPackageData.permissions || {}, handleNewPackagePermissionChange)}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleCreateNewPackage}>Save New Package</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {editablePackages.map(pkg => renderPackageForm(pkg))}
            </div>
        </div>
    );
};

export default PackageSettingsManager;
