
import React, { useState, useMemo, useEffect } from 'react';
import { SupplierInventoryItem, Supplier, AppSettings, User, MeasurementUnit, ItemType, Category } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { PlusIcon } from './icons/PlusIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';
import { isAreaUnit, isLinearUnit, calculateCostUnitPrices } from '../services/conversionService';
import { SearchIcon } from './icons/SearchIcon';
import { TagIcon } from './icons/TagIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import ColorPickerModal from './ui/ColorPickerModal';

interface SupplierInventoryManagerProps {
    supplierInventory: SupplierInventoryItem[];
    suppliers: Supplier[];
    settings: AppSettings;
    currentUser: User;
    categories: Category[];
    onAddItem: (item: Omit<SupplierInventoryItem, 'id'>) => void;
    onUpdateItem: (item: SupplierInventoryItem) => void;
    onRemoveItem: (id: string) => void;
    onAddCategory: (name: string) => void;
    onUpdateCategory: (id: string, name: string, color?: string) => void;
    onRemoveCategory: (id: string) => void;
    onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
}

const initialFormState = {
    name: '',
    supplierId: '',
    supplierName: '',
    itemCode: '',
    price: 0,
    type: ItemType.FIXED,
    length: undefined,
    width: undefined,
    measurementUnit: undefined,
    unitPrices: {},
    includeWastage: true,
    categoryId: undefined,
};

const linearUnits = Object.values(MeasurementUnit).filter(u => isLinearUnit(u));
const areaUnits = Object.values(MeasurementUnit).filter(u => isAreaUnit(u));

const SupplierInventoryManager: React.FC<SupplierInventoryManagerProps> = ({
    supplierInventory,
    suppliers,
    settings,
    currentUser,
    categories,
    onAddItem,
    onUpdateItem,
    onRemoveItem,
    onAddCategory,
    onUpdateCategory,
    onRemoveCategory,
    onAddSupplier
}) => {
    const [view, setView] = useState<'list' | 'form' | 'categories'>('list');
    
    const [formData, setFormData] = useState(initialFormState);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');
    
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [targetCategoryIdForColor, setTargetCategoryIdForColor] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    const currency = settings.currencySymbol || '£';

    useEffect(() => {
        const matchingSupplier = suppliers.find(s => s.name.toLowerCase() === formData.supplierName.toLowerCase().trim());
        if (matchingSupplier) {
            setFormData(prev => ({ ...prev, supplierId: matchingSupplier.id }));
        } else {
            setFormData(prev => ({ ...prev, supplierId: '' }));
        }
    }, [formData.supplierName, suppliers]);
    
    const isNewSupplier = formData.supplierName.trim() && !formData.supplierId;

    // --- Deletion Handlers ---
    const handleDeleteItem = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Delete this item?')) {
            onRemoveItem(id);
        }
    };

    const handleDeleteCategory = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if category contains any items
        const hasItems = supplierInventory.some(item => item.categoryId === id);
        
        if (hasItems) {
            alert('All items must be deleted before the category can be removed.');
            return;
        }

        if (window.confirm('Delete this category?')) {
            onRemoveCategory(id);
        }
    };

    const metrics = useMemo(() => {
        const totalItems = supplierInventory.length;
        const uniqueSuppliers = new Set(supplierInventory.map(i => i.supplierId)).size;
        const measuredItems = supplierInventory.filter(i => i.type === ItemType.MEASURED).length;
        return { totalItems, uniqueSuppliers, measuredItems };
    }, [supplierInventory]);

    const resetForm = () => {
        setFormData(initialFormState);
        setEditingItemId(null);
    };

    const handleFormChange = (field: keyof typeof formData, value: any) => {
        const updates = { ...formData, [field]: value };

        if (field === 'type') {
            if (value === ItemType.FIXED) {
                updates.length = undefined;
                updates.width = undefined;
                updates.measurementUnit = undefined;
                updates.unitPrices = {};
                updates.includeWastage = true;
            } else {
                updates.measurementUnit = MeasurementUnit.M;
            }
        }
        
        if (field === 'categoryId' && value === '') {
             updates.categoryId = undefined;
        }

        const { type, price, length, width, measurementUnit } = updates;
        if (type === ItemType.MEASURED) {
            updates.unitPrices = calculateCostUnitPrices(price, length || 0, width || 0, measurementUnit || MeasurementUnit.M);
        }

        setFormData(updates);
    };

    const handleStartEdit = (item: SupplierInventoryItem) => {
        setEditingItemId(item.id);
        const supplier = suppliers.find(s => s.id === item.supplierId);
        setFormData({
            name: item.name,
            supplierId: item.supplierId,
            supplierName: supplier ? supplier.name : '',
            itemCode: item.itemCode || '',
            price: item.price || 0,
            type: item.type || ItemType.FIXED,
            length: item.length,
            width: item.width,
            measurementUnit: item.measurementUnit,
            unitPrices: item.unitPrices || {},
            includeWastage: item.includeWastage !== false,
            categoryId: item.categoryId,
        });
        setView('form');
    };

    const handleAddItemClick = () => {
        resetForm();
        setView('form');
    };

    const handleAddNewSupplier = () => {
        if (!isNewSupplier) return;
        const newSupplier = onAddSupplier({
            name: formData.supplierName.trim(),
            address: 'Please update address in Supplier Manager'
        });
        setFormData(prev => ({ ...prev, supplierId: newSupplier.id }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalSupplierId = formData.supplierId;
        if (!finalSupplierId && formData.supplierName.trim()) {
            const newSupplier = onAddSupplier({
                name: formData.supplierName.trim(),
                address: 'Please update address in Supplier Manager'
            });
            finalSupplierId = newSupplier.id;
        }

        if (!formData.name.trim() || !finalSupplierId) {
            alert('Please provide an item name and select/create a supplier.');
            return;
        }

        const itemData = {
            name: formData.name,
            supplierId: finalSupplierId,
            itemCode: formData.itemCode || undefined,
            price: Number(formData.price) || 0,
            type: formData.type,
            length: formData.length ? Number(formData.length) : undefined,
            width: formData.width ? Number(formData.width) : undefined,
            measurementUnit: formData.measurementUnit || undefined,
            unitPrices: formData.unitPrices || {},
            includeWastage: formData.includeWastage,
            categoryId: formData.categoryId || undefined,
        };

        if (editingItemId) {
            onUpdateItem({ id: editingItemId, ...itemData });
        } else {
            onAddItem(itemData);
        }
        resetForm();
        setView('list');
    };

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedItems = useMemo(() => {
        let result = [...supplierInventory];

        const catFilter = activeCategoryId === 'uncategorized' ? 'uncategorized' : activeCategoryId;
        if (catFilter === 'uncategorized') {
            result = result.filter(i => !i.categoryId);
        } else if (catFilter) {
            result = result.filter(i => i.categoryId === catFilter);
        }

        if (filterSupplier) {
            result = result.filter(i => i.supplierId === filterSupplier);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(i => 
                i.name.toLowerCase().includes(term) || 
                (i.itemCode && i.itemCode.toLowerCase().includes(term))
            );
        }

        result.sort((a, b) => {
            let aValue: any = '';
            let bValue: any = '';

            if (sortConfig.key === 'supplierName') {
                aValue = suppliers.find(s => s.id === a.supplierId)?.name || '';
                bValue = suppliers.find(s => s.id === b.supplierId)?.name || '';
            } else {
                aValue = a[sortConfig.key as keyof SupplierInventoryItem];
                bValue = b[sortConfig.key as keyof SupplierInventoryItem];
            }

            if (aValue === undefined || aValue === null) aValue = '';
            if (bValue === undefined || bValue === null) bValue = '';

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [supplierInventory, suppliers, searchTerm, activeCategoryId, filterSupplier, sortConfig]);

    const handleAddCategorySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName.trim());
            setNewCategoryName('');
        }
    };

    const handleSaveCategoryEdit = () => {
        if (editingCategoryId && editingCategoryName.trim()) {
            const cat = categories.find(c => c.id === editingCategoryId);
            onUpdateCategory(editingCategoryId, editingCategoryName.trim(), cat?.color);
        }
        setEditingCategoryId(null);
        setEditingCategoryName('');
    };
    
    const handleSelectCategoryColor = (color: string) => {
        if (targetCategoryIdForColor) {
            const cat = categories.find(c => c.id === targetCategoryIdForColor);
            if (cat) {
                onUpdateCategory(targetCategoryIdForColor, cat.name, color);
            }
        }
        setIsColorModalOpen(false);
        setTargetCategoryIdForColor(null);
    };

    if (view === 'categories') {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => setView('list')}>
                            &larr; Back to Inventory
                        </Button>
                        <h2 className="text-3xl font-bold text-slate-800">
                            Manage Categories
                        </h2>
                    </div>
                </div>

                <div className="max-h-[80vh] overflow-y-auto pr-2">
                    <div className="max-w-4xl mx-auto">
                         <form onSubmit={handleAddCategorySubmit} className="flex gap-4 mb-8 p-6 bg-slate-50 rounded-lg border shadow-sm">
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-slate-800 mb-1">New Category Name</label>
                                <Input 
                                    placeholder="e.g. Timber, Hardware" 
                                    value={newCategoryName} 
                                    onChange={e => setNewCategoryName(e.target.value)} 
                                />
                            </div>
                            <div className="flex items-end">
                                <Button type="submit" variant="primary"><PlusIcon className="w-4 h-4 mr-2" /> Add Category</Button>
                            </div>
                        </form>

                        <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 text-sm font-semibold text-slate-800">
                                    <tr>
                                        <th className="p-4">Color</th>
                                        <th className="p-4">Category Name</th>
                                        <th className="p-4 text-center w-32">Items</th>
                                        <th className="p-4 text-right w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {categories.map(c => {
                                        const itemCount = supplierInventory.filter(i => i.categoryId === c.id).length;
                                        const isEditing = editingCategoryId === c.id;

                                        return (
                                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 w-16">
                                                    <button 
                                                        type="button"
                                                        onClick={() => { setTargetCategoryIdForColor(c.id); setIsColorModalOpen(true); }}
                                                        className={`w-8 h-8 rounded-full border border-slate-300 shadow-sm transition-transform hover:scale-110 ${c.color || 'bg-white'}`}
                                                        title="Assign color"
                                                    />
                                                </td>
                                                <td className="p-4 font-medium text-slate-800">
                                                    {isEditing ? (
                                                        <Input
                                                            value={editingCategoryName}
                                                            onChange={(e) => setEditingCategoryName(e.target.value)}
                                                            autoFocus
                                                            className="h-8 text-sm"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveCategoryEdit();
                                                                if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryName(''); }
                                                            }}
                                                        />
                                                    ) : c.name}
                                                </td>
                                                <td className="p-4 text-center text-slate-600">{itemCount}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={handleSaveCategoryEdit} type="button" className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors" title="Save">
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => { setEditingCategoryId(null); setEditingCategoryName(''); }} type="button" className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors" title="Cancel">
                                                                    <XIcon className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); }} type="button" className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors" title="Edit">
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={(e) => handleDeleteCategory(e, c.id)} type="button" className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors" title="Delete">
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {categories.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No categories created yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <ColorPickerModal
                    isOpen={isColorModalOpen}
                    onClose={() => setIsColorModalOpen(false)}
                    onSelectColor={handleSelectCategoryColor}
                />
            </div>
        );
    }

    if (view === 'form') {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => setView('list')}>
                            &larr; Back to Inventory
                        </Button>
                        <h2 className="text-3xl font-bold text-slate-800">
                            {editingItemId ? 'Edit Supplier Item' : 'Add New Item'}
                        </h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-800">Pricing Type</label>
                            <Select id="itemType" value={formData.type} onChange={(e) => handleFormChange('type', e.target.value as ItemType)}>
                                <option value={ItemType.FIXED}>Fixed Price Item</option>
                                <option value={ItemType.MEASURED}>Measured Item (Material)</option>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-800">Item Name *</label>
                            <Input id="itemName" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} required placeholder="Item Name"/>
                        </div>
                        
                        <div>
                            <label htmlFor="supplierName" className="block text-sm font-medium text-slate-800 mb-1">Supplier *</label>
                            <div className="flex items-start gap-2">
                                <div className="flex-grow">
                                    <Input 
                                        id="supplierName"
                                        list="suppliers-list"
                                        value={formData.supplierName} 
                                        onChange={(e) => handleFormChange('supplierName', e.target.value)}
                                        required
                                        placeholder="Type or select a supplier..."
                                    />
                                    <datalist id="suppliers-list">
                                        {suppliers.map(s => <option key={s.id} value={s.name} />)}
                                    </datalist>
                                    {isNewSupplier && <p className="text-xs text-slate-500 mt-1">New supplier. Click '+' to save.</p>}
                                </div>
                                {isNewSupplier && (
                                    <Button type="button" size="icon" variant="primary" onClick={handleAddNewSupplier} title="Save new supplier">
                                        <PlusIcon className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-800">Category</label>
                            <Select id="itemCategory" value={formData.categoryId || ''} onChange={(e) => handleFormChange('categoryId', e.target.value)}>
                                <option value="">-- No Category --</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-800">
                                {formData.type === ItemType.FIXED ? `Price per Item (${currency})` : `Total Price of Item (${currency})`} *
                            </label>
                            <Input id="itemPrice" type="number" step="0.01" min="0" value={formData.price} onChange={(e) => handleFormChange('price', e.target.value)} required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-800">Item Code (Optional)</label>
                            <Input id="itemCode" value={formData.itemCode} onChange={(e) => handleFormChange('itemCode', e.target.value)} placeholder="e.g. SUP-001"/>
                        </div>
                        
                        {formData.type === ItemType.MEASURED && (
                            <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                                <h4 className="text-sm font-medium text-slate-700">Material Dimensions</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600">Length</label>
                                        <Input type="number" value={formData.length || ''} onChange={(e) => handleFormChange('length', e.target.value)} placeholder="Length" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600">Width</label>
                                        <Input type="number" value={formData.width || ''} onChange={(e) => handleFormChange('width', e.target.value)} placeholder="Width" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600">Unit</label>
                                    <Select value={formData.measurementUnit || ''} onChange={(e) => handleFormChange('measurementUnit', e.target.value)}>
                                        <option value="">-- Select Unit for Dimensions --</option>
                                        {linearUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                                    </Select>
                                </div>
                                
                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                                    <label htmlFor="includeWastage" className="text-sm font-medium text-slate-700">Include Wastage Cost</label>
                                    <label htmlFor="includeWastage" className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="includeWastage"
                                            className="sr-only peer"
                                            checked={formData.includeWastage !== false}
                                            onChange={e => handleFormChange('includeWastage', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {Object.keys(formData.unitPrices || {}).length > 0 && (
                                     <div className="mt-2 p-3 border rounded-lg bg-white space-y-2">
                                        <h4 className="font-medium text-sm text-slate-700 mb-1">Calculated Cost Per Area</h4>
                                        {areaUnits.map(unit => (
                                            <div key={unit} className="grid grid-cols-2 items-center gap-2">
                                                <label className="text-xs text-slate-600">{`Cost / ${unit}`}</label>
                                                <Input type="text" value={`${currency}${(formData.unitPrices?.[unit as MeasurementUnit] ?? 0).toFixed(4)}`} disabled className="bg-slate-200 text-right !py-1 text-xs"/>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-6 border-t mt-4">
                        <Button type="button" variant="outline" onClick={() => setView('list')}>Cancel</Button>
                        <Button type="submit" variant="primary">{editingItemId ? 'Update Item' : 'Add Item'}</Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-sm text-slate-500 font-medium uppercase">Total Items</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{metrics.totalItems}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
                    <p className="text-sm text-slate-500 font-medium uppercase">Unique Suppliers</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{metrics.uniqueSuppliers}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p className="text-sm text-slate-500 font-medium uppercase">Measured Items</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{metrics.measuredItems}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-grow">
                        <div className="relative w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <SearchIcon className="w-4 h-4 text-gray-400" />
                            </div>
                            <Input 
                                placeholder="Search Name or Item Code..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="w-full md:w-48">
                            <option value="">All Suppliers</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {!currentUser.subscriptionStatus.startsWith('trial_') && (
                            <Button variant="outline" onClick={() => exportToCsv('supplier-inventory.csv', supplierInventory)}>
                                <DownloadIcon className="w-4 h-4 mr-2" /> Export
                            </Button>
                        )}
                        <Button variant="primary" onClick={handleAddItemClick}>
                            <PlusIcon className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </div>
                </div>

                <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <label htmlFor="catFilter" className="text-sm font-medium text-slate-700 whitespace-nowrap">Filter Category:</label>
                        <Select 
                            id="catFilter"
                            value={activeCategoryId || ''} 
                            onChange={(e) => setActiveCategoryId(e.target.value || null)}
                            className="w-full sm:w-64 bg-white"
                        >
                            <option value="">All Items</option>
                            <option value="uncategorized">Uncategorized</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </div>
                    
                    <button 
                        onClick={() => setView('categories')} 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center whitespace-nowrap bg-white px-3 py-1.5 rounded border border-blue-200 hover:border-blue-300 transition-colors shadow-sm"
                        type="button"
                    >
                        <TagIcon className="w-4 h-4 mr-2"/> Manage Categories
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-800 font-semibold">
                            <tr>
                                <th className="p-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('name')}>Item / Code</th>
                                <th className="p-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('supplierName')}>Supplier</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('price')}>Cost Price</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                            {filteredAndSortedItems.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No items found matching your filters.</td></tr>
                            ) : (
                                filteredAndSortedItems.map(item => {
                                    const supplier = suppliers.find(s => s.id === item.supplierId);
                                    const category = categories.find(c => c.id === item.categoryId);
                                    
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-medium text-slate-800">{item.name}</p>
                                                {item.itemCode && <p className="text-[10px] text-slate-500">Code: {item.itemCode}</p>}
                                            </td>
                                            <td className="p-4 text-slate-800">{supplier?.name || <span className="text-red-400 italic">Unknown Supplier</span>}</td>
                                            <td className="p-4 text-slate-800">{category?.name || <span className="text-slate-400 italic">Uncategorized</span>}</td>
                                            <td className="p-4 text-right text-slate-800">
                                                {currency}{item.price.toFixed(2)}
                                                {item.type === ItemType.MEASURED && item.measurementUnit && <span className="text-xs text-slate-500 ml-1">per {item.measurementUnit}</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleStartEdit(item)} type="button" className="p-2 rounded bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => handleDeleteItem(e, item.id)} type="button" className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupplierInventoryManager;
