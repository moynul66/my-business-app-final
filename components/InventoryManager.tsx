import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InventoryItem, Category, ItemType, MeasurementUnit, AppSettings, User, InventoryStatus, SupplierInventoryItem, AddOnOption } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv } from '../services/csvService';
import { calculateEquivalentPrices } from '../services/conversionService';
import SupplierInventorySearchModal from './SupplierInventorySearchModal';
import { XIcon } from './icons/XIcon';
import { SearchIcon } from './icons/SearchIcon';
import { TagIcon } from './icons/TagIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';

interface InventoryItemWithId extends InventoryItem { id: string }

interface InventoryManagerProps {
    inventory: InventoryItem[];
    supplierInventory: SupplierInventoryItem[];
    categories: Category[];
    settings: AppSettings;
    currentUser: User;
    canUseMeasured: boolean;
    onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
    onAddItems: (items: Omit<InventoryItem, 'id'>[]) => void;
    onUpdateItem: (item: InventoryItem) => void;
    onRemoveItem: (id: string) => void;
    onUpdateItems: (items: InventoryItem[]) => void;
    onRemoveItems: (ids: string[]) => void;
    onAddCategory: (name: string) => void;
    onRemoveCategory: (id: string) => void;
    onUpdateCategory: (id: string, name: string) => void;
}

const initialNewItemState: Omit<InventoryItem, 'id'> = {
    name: '',
    sku: '',
    price: 0,
    vatRate: 0,
    quantity: 0,
    minStockLevel: 5,
    status: 'active',
    image: '',
    minPrice: undefined,
    type: ItemType.FIXED,
    measurementUnit: undefined,
    unitPrices: {},
    categoryId: undefined,
    linkedSupplierItemIds: [],
    isParent: false,
    definedAttributeKeys: [],
    definedAttributeValues: {},
    variantAttributes: undefined,
    addOnOptions: [],
};

const InventoryManager: React.FC<InventoryManagerProps> = ({
    inventory,
    supplierInventory,
    categories,
    settings,
    currentUser,
    canUseMeasured,
    onAddItem,
    onAddItems,
    onUpdateItem,
    onRemoveItem,
    onUpdateItems,
    onRemoveItems,
    onAddCategory,
    onRemoveCategory,
    onUpdateCategory,
}) => {
    const [itemFormData, setItemFormData] = useState<Omit<InventoryItem, 'id'>>(initialNewItemState);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // Category Editing State
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState('');

    // View State
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'form' | 'categories' | 'variants'>('list');
    const [editModalTab, setEditModalTab] = useState<'details' | 'variants' | 'addons'>('details');
    
    // Attribute Definition State (for Parent)
    const [newAttributeKey, setNewAttributeKey] = useState('');
    
    // Etsy-Style Variant Management State
    const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});
    const [editingValue, setEditingValue] = useState<{ attribute: string, index: number, value: string } | null>(null);

    // Variant Creation State (Defaults)
    const [variantQty, setVariantQty] = useState(0);
    const [variantPrice, setVariantPrice] = useState(0);
    
    // Bulk Update State
    const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());
    const [bulkUpdateData, setBulkUpdateData] = useState({ price: '', quantity: '', sku: '' });

    // Add-on State
    const [newAddOn, setNewAddOn] = useState({ name: '', price: 0 });

    // Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState<InventoryStatus | 'all' | 'low_stock'>('all');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem | 'value'; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    const [isSupplierSearchModalOpen, setSupplierSearchModalOpen] = useState(false);
    const currency = settings.currencySymbol || '£';
    const areaUnits = Object.values(MeasurementUnit).filter(u => u.startsWith('sq_'));

    // --- Deletion Handlers ---
    const handleDeleteItem = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Delete this item?')) {
            const idsToRemove = [id];
            const children = inventory.filter(i => i.parentId === id);
            children.forEach(child => idsToRemove.push(child.id));
            onRemoveItems(idsToRemove);
        }
    };

    const handleRemoveCategoryClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if category contains any items
        const hasItems = inventory.some(item => item.categoryId === id);
        
        if (hasItems) {
            alert('All items must be deleted before the category can be removed.');
            return;
        }

        if (window.confirm('Delete this category?')) {
            onRemoveCategory(id);
        }
    };

    const handleRemoveVariantClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('Delete this item?')) {
            onRemoveItem(id);
        }
    };

    // --- Metrics Calculations ---
    const metrics = useMemo(() => {
        const totalValue = inventory.reduce((acc, item) => acc + (item.price * (item.quantity || 0)), 0);
        const totalItems = inventory.filter(i => !i.parentId).length; // Count distinct products (parents + standalone)
        const lowStockItems = inventory.filter(i => !i.isParent && (i.quantity || 0) <= (i.minStockLevel || 5) && i.status !== 'discontinued').length;
        const outOfStockItems = inventory.filter(i => !i.isParent && (i.quantity || 0) === 0 && i.status !== 'discontinued').length;
        return { totalValue, totalItems, lowStockItems, outOfStockItems };
    }, [inventory]);

    // --- Handling Image Upload (Simple Base64) ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setItemFormData(prev => ({ ...prev, image: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Form Handling ---
    const handleItemFormChange = (field: keyof Omit<InventoryItem, 'id'>, value: any) => {
        const updates: Omit<InventoryItem, 'id'> = { ...itemFormData, [field]: value };
        
        if (field === 'type') {
            if (value === ItemType.FIXED) {
                updates.measurementUnit = undefined;
                updates.minPrice = undefined;
                updates.unitPrices = {};
            } else if (value === ItemType.MEASURED) {
                const defaultUnit = MeasurementUnit.SQ_M;
                const defaultPrice = updates.price > 0 ? updates.price : 10;
                updates.measurementUnit = defaultUnit;
                updates.price = defaultPrice;
                updates.unitPrices = calculateEquivalentPrices(defaultPrice, defaultUnit);
            }
        }
    
        if (updates.type === ItemType.MEASURED && (field === 'price' || field === 'measurementUnit')) {
            const basePrice = field === 'price' ? parseFloat(value) || 0 : updates.price;
            const baseUnit = field === 'measurementUnit' ? value : updates.measurementUnit;
            if (baseUnit && String(baseUnit).startsWith('sq_')) {
                updates.unitPrices = calculateEquivalentPrices(basePrice, baseUnit as MeasurementUnit);
            }
        }

        if (['price', 'minPrice', 'quantity', 'minStockLevel', 'vatRate'].includes(field)) {
            updates[field as 'price'] = parseFloat(value) || (field === 'minPrice' ? undefined : 0);
        }

        if (field === 'categoryId' && value === '') {
             updates.categoryId = undefined;
        }
        
        // Initialize defaults if switching to parent
        if (field === 'isParent' && value === true && (!updates.definedAttributeKeys || updates.definedAttributeKeys.length === 0)) {
            updates.definedAttributeKeys = ['Size', 'Colour'];
        }

        setItemFormData(updates);
    };

    const handleItemFormSubmit = (e: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!itemFormData.name.trim() || !itemFormData.price || itemFormData.price <= 0) {
            alert('Please provide a valid name and a price greater than zero.');
            return;
        }
        
        if (editingItemId) {
            onUpdateItem({ id: editingItemId, ...itemFormData } as InventoryItem);
        } else {
            onAddItem(itemFormData);
        }
        closeForm();
    };

    const handleDone = () => {
        if (!itemFormData.name.trim() || !itemFormData.price || itemFormData.price <= 0) {
            alert('Please provide a valid name and a price greater than zero.');
            return;
        }
        if (editingItemId) {
            onUpdateItem({ id: editingItemId, ...itemFormData } as InventoryItem);
        }
        closeForm();
    };

    const closeForm = () => {
        setEditingItemId(null);
        setItemFormData(initialNewItemState);
        setEditModalTab('details');
        setView('list');
        setNewValueInputs({});
        setVariantQty(0);
        setVariantPrice(0);
        setNewAttributeKey('');
        setSelectedVariantIds(new Set()); // Clear selection
    };

    const handleStartEditItem = (item: InventoryItem) => {
        setEditingItemId(item.id);
        setItemFormData({
            name: item.name,
            sku: item.sku || '',
            price: item.price,
            vatRate: item.vatRate ?? settings.defaultVatRate,
            quantity: item.quantity || 0,
            minStockLevel: item.minStockLevel || 5,
            status: item.status || 'active',
            image: item.image || '',
            minPrice: item.minPrice,
            type: item.type,
            measurementUnit: item.measurementUnit,
            unitPrices: item.unitPrices && Object.keys(item.unitPrices).length > 0
                ? item.unitPrices 
                : (item.type === ItemType.MEASURED ? calculateEquivalentPrices(item.price, item.measurementUnit!) : {}),
            categoryId: item.categoryId,
            linkedSupplierItemIds: item.linkedSupplierItemIds || [],
            isParent: item.isParent || false,
            definedAttributeKeys: item.definedAttributeKeys || (item.isParent ? ['Size', 'Colour'] : []),
            definedAttributeValues: item.definedAttributeValues || {},
            variantAttributes: item.variantAttributes,
            addOnOptions: item.addOnOptions || [],
        });
        
        setEditModalTab('details');
        setView('form');
        
        setVariantPrice(item.price);
        setSelectedVariantIds(new Set());
        setNewValueInputs({});
    };
    
    const handleAddItemClick = () => {
        setEditingItemId(null);
        setItemFormData({
            ...initialNewItemState,
            vatRate: settings.defaultVatRate,
        });
        setEditModalTab('details');
        setView('form');
        setSelectedVariantIds(new Set());
    };

    // --- Add-on Management ---
    const handleAddAddOn = () => {
        if (!newAddOn.name.trim()) return;
        const option: AddOnOption = {
            id: crypto.randomUUID(),
            name: newAddOn.name.trim(),
            price: newAddOn.price
        };
        const updatedAddOns = [...(itemFormData.addOnOptions || []), option];
        const updates = { ...itemFormData, addOnOptions: updatedAddOns };
        setItemFormData(updates);
        
        // Immediate persistence if in edit mode
        if (editingItemId) {
            onUpdateItem({ id: editingItemId, ...updates } as InventoryItem);
        }
        
        setNewAddOn({ name: '', price: 0 });
    };

    const handleRemoveAddOn = (id: string) => {
        const updatedAddOns = (itemFormData.addOnOptions || []).filter(opt => opt.id !== id);
        const updates = { ...itemFormData, addOnOptions: updatedAddOns };
        setItemFormData(updates);
        
        // Immediate persistence if in edit mode
        if (editingItemId) {
            onUpdateItem({ id: editingItemId, ...updates } as InventoryItem);
        }
    };

    // --- Attribute & Value Management (Etsy Style) ---
    
    const handleAddAttributeKey = () => {
        const key = newAttributeKey.trim();
        if (!key) return;
        if (itemFormData.definedAttributeKeys?.some(k => k.toLowerCase() === key.toLowerCase())) {
            alert('Attribute already exists.');
            return;
        }
        
        const updatedKeys = [...(itemFormData.definedAttributeKeys || []), key];
        const updatedValues = { ...itemFormData.definedAttributeValues, [key]: [] };
        
        const updates = { ...itemFormData, definedAttributeKeys: updatedKeys, definedAttributeValues: updatedValues };
        setItemFormData(updates);
        if(editingItemId) onUpdateItem({ ...updates, id: editingItemId } as InventoryItem);
        
        setNewAttributeKey('');
    };

    const handleRemoveAttributeKey = (keyToRemove: string) => {
        if(!window.confirm(`Removing "${keyToRemove}" will delete all variants that rely on this attribute. Continue?`)) return;

        const updatedKeys = (itemFormData.definedAttributeKeys || []).filter(k => k !== keyToRemove);
        const updatedValues = { ...itemFormData.definedAttributeValues };
        delete updatedValues[keyToRemove];

        // Clean up inventory: Remove variants that used this attribute using bulk removal
        if (editingItemId) {
            const childrenIds = inventory
                .filter(i => i.parentId === editingItemId)
                .map(child => child.id);
            if (childrenIds.length > 0) {
                onRemoveItems(childrenIds);
            }
        }

        const updates = { ...itemFormData, definedAttributeKeys: updatedKeys, definedAttributeValues: updatedValues };
        setItemFormData(updates);
        if(editingItemId) onUpdateItem({ ...updates, id: editingItemId } as InventoryItem);
    };

    const handleAddValueToAttribute = (attribute: string) => {
        const val = (newValueInputs[attribute] || '').trim();
        if (!val) return;

        const currentValues = itemFormData.definedAttributeValues?.[attribute] || [];
        if (currentValues.some(v => v.toLowerCase() === val.toLowerCase())) {
            alert('Value already exists.');
            return;
        }

        const updatedValuesList = [...currentValues, val];
        const updatedValuesMap = { ...itemFormData.definedAttributeValues, [attribute]: updatedValuesList };
        
        const updates = { ...itemFormData, definedAttributeValues: updatedValuesMap };
        setItemFormData(updates);
        if(editingItemId) onUpdateItem({ ...updates, id: editingItemId } as InventoryItem);

        setNewValueInputs(prev => ({ ...prev, [attribute]: '' }));
    };

    const handleEditValue = (attribute: string, index: number, newValue: string) => {
        if (!newValue.trim()) return;
        const currentValues = itemFormData.definedAttributeValues?.[attribute] || [];
        const oldValue = currentValues[index];
        
        if (oldValue === newValue) {
            setEditingValue(null);
            return;
        }

        const updatedValuesList = [...currentValues];
        updatedValuesList[index] = newValue;
        
        const updatedValuesMap = { ...itemFormData.definedAttributeValues, [attribute]: updatedValuesList };
        const updates = { ...itemFormData, definedAttributeValues: updatedValuesMap };
        
        // Update parent form data
        setItemFormData(updates);
        if(editingItemId) {
            const itemsToUpdate: InventoryItem[] = [];
            // 1. Update Parent
            itemsToUpdate.push({ ...updates, id: editingItemId } as InventoryItem);

            // 2. Cascading Update: Find all child variants using this value and update them
            const children = inventory.filter(i => i.parentId === editingItemId);
            children.forEach(child => {
                if (child.variantAttributes && child.variantAttributes[attribute] === oldValue) {
                    const newAttributes = { ...child.variantAttributes, [attribute]: newValue };
                    
                    // Reconstruct Name
                    const keys = itemFormData.definedAttributeKeys || [];
                    const suffix = keys.map(k => newAttributes[k] || '').join(' - ');
                    const newName = `${itemFormData.name} - ${suffix}`;

                    itemsToUpdate.push({ ...child, name: newName, variantAttributes: newAttributes });
                }
            });
            
            // Use bulk update
            onUpdateItems(itemsToUpdate);
        }
        setEditingValue(null);
    };

    const handleDeleteValue = (attribute: string, valueToDelete: string) => {
        if(!window.confirm(`Deleting "${valueToDelete}" will remove all variants with this ${attribute}. Continue?`)) return;

        const currentValues = itemFormData.definedAttributeValues?.[attribute] || [];
        const updatedValuesList = currentValues.filter(v => v !== valueToDelete);
        const updatedValuesMap = { ...itemFormData.definedAttributeValues, [attribute]: updatedValuesList };
        
        const updates = { ...itemFormData, definedAttributeValues: updatedValuesMap };
        setItemFormData(updates);

        if(editingItemId) {
            // 1. Update Parent
            onUpdateItem({ ...updates, id: editingItemId } as InventoryItem);

            // 2. Delete affected variants using bulk removal
            const childrenIds = inventory
                .filter(i => i.parentId === editingItemId && i.variantAttributes && i.variantAttributes[attribute] === valueToDelete)
                .map(c => c.id);
            
            if (childrenIds.length > 0) {
                onRemoveItems(childrenIds);
            }
        }
    };

    // --- Variant Handling ---
    const variants = useMemo(() => {
        if (!editingItemId) return [];
        // Reverse so new items appear at the top
        return inventory.filter(i => i.parentId === editingItemId).reverse();
    }, [inventory, editingItemId]);

    const handleGenerateVariants = () => {
        if (!editingItemId) return;

        const definedKeys = itemFormData.definedAttributeKeys || [];
        if (definedKeys.length === 0) {
            alert('Please add at least one attribute (e.g. Size).');
            return;
        }

        // Validate that every attribute has at least one value
        for (const key of definedKeys) {
            const values = itemFormData.definedAttributeValues?.[key] || [];
            if (values.length === 0) {
                alert(`Please add at least one value for attribute: ${key}`);
                return;
            }
        }

        // 1. Generate Cartesian Product of all defined values
        const generateCombinations = (keys: string[], index: number): Record<string, string>[] => {
            if (index === keys.length) return [{}];
            
            const key = keys[index];
            const values = itemFormData.definedAttributeValues?.[key] || [];
            const subCombinations = generateCombinations(keys, index + 1);
            
            const result: Record<string, string>[] = [];
            for (const val of values) {
                for (const subComb of subCombinations) {
                    result.push({ [key]: val, ...subComb });
                }
            }
            return result;
        };

        const allCombinations = generateCombinations(definedKeys, 0);

        // 2. Create NEW variants only (do not overwrite existing)
        const newVariants: Omit<InventoryItem, 'id'>[] = [];
        let createdCount = 0;

        allCombinations.forEach(combination => {
            // Check if variant already exists
            const exists = inventory.some(i => 
                i.parentId === editingItemId && 
                i.variantAttributes &&
                definedKeys.every(key => i.variantAttributes![key] === combination[key])
            );

            if (exists) return; // Skip existing

            const suffix = definedKeys.map(key => combination[key]).join(' - ');
            const variantName = `${itemFormData.name} - ${suffix}`;
            
            // Simple SKU generation
            const skuSuffix = definedKeys.map(key => combination[key].toUpperCase().substring(0, 3)).join('-');
            const variantSku = `${itemFormData.sku ? itemFormData.sku + '-' : ''}${skuSuffix}`;

            const newVariant: Omit<InventoryItem, 'id'> = {
                ...itemFormData, // Inherit defaults
                vatRate: itemFormData.vatRate, // Ensure VAT Rate is inherited
                name: variantName,
                sku: variantSku,
                price: variantPrice > 0 ? variantPrice : itemFormData.price,
                quantity: variantQty,
                parentId: editingItemId,
                isParent: false,
                definedAttributeKeys: undefined,
                definedAttributeValues: undefined,
                variantAttributes: combination, 
                linkedSupplierItemIds: [], 
            };

            newVariants.push(newVariant);
            createdCount++;
        });

        if (createdCount > 0) {
            onAddItems(newVariants);
            setView('variants'); // Redirect to list
        } else {
            alert('All combinations already exist. You can manage them in "View Existing Variants".');
        }
    };

    // --- Bulk Actions ---
    const handleSelectAllVariants = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(variants.map(v => v.id));
            setSelectedVariantIds(allIds);
        } else {
            setSelectedVariantIds(new Set());
        }
    };

    const handleSelectVariant = (id: string, isSelected: boolean) => {
        setSelectedVariantIds(prev => {
            const next = new Set(prev);
            if (isSelected) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const handleBulkUpdate = (field: 'price' | 'quantity' | 'sku') => {
        if (selectedVariantIds.size === 0) return;
        const value = bulkUpdateData[field];
        if (value === '') return;

        // Create update objects
        const updates = variants
            .filter(v => selectedVariantIds.has(v.id))
            .map(v => ({
                ...v,
                [field]: field === 'price' ? parseFloat(value) : field === 'quantity' ? parseInt(value, 10) : value
            }));

        // Apply updates using bulk handler
        onUpdateItems(updates);
        
        // Clear the input for that field
        setBulkUpdateData(prev => ({ ...prev, [field]: '' }));
        alert(`${field.toUpperCase()} updated for ${updates.length} items.`);
    };

    // --- Sorting & Filtering ---
    const handleSort = (key: keyof InventoryItem | 'value') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedInventory = useMemo(() => {
        // Filter out variants from the main list
        let result = inventory.filter(i => !i.parentId);

        // Filter by Category (either from dropdown or activeCategoryId prop logic)
        const catFilter = activeCategoryId === 'uncategorized' ? 'uncategorized' : (activeCategoryId || filterCategory);
        if (catFilter === 'uncategorized') {
            result = result.filter(i => !i.categoryId);
        } else if (catFilter) {
            result = result.filter(i => i.categoryId === catFilter);
        }

        // Filter by Status
        if (filterStatus === 'low_stock') {
            result = result.filter(i => (i.quantity || 0) <= (i.minStockLevel || 5) && i.status !== 'discontinued');
        } else if (filterStatus !== 'all') {
            result = result.filter(i => (i.status || 'active') === filterStatus);
        }

        // Filter by Search Term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(i => 
                i.name.toLowerCase().includes(term) || 
                (i.sku && i.sku.toLowerCase().includes(term))
            );
        }

        // Filter by Supplier
        if (filterSupplier) {
            result = result.filter(item => {
                if (!item.linkedSupplierItemIds) return false;
                return item.linkedSupplierItemIds.some(sid => {
                    const supplierItem = supplierInventory.find(si => si.id === sid);
                    return supplierItem && supplierItem.supplierId === filterSupplier;
                });
            });
        }

        // Sort
        result.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof InventoryItem];
            let bValue: any = b[sortConfig.key as keyof InventoryItem];

            // For parent items, calculate aggregations for sorting if needed
            const getAggregation = (item: InventoryItem) => {
                if (item.isParent) {
                    const children = inventory.filter(child => child.parentId === item.id);
                    if (sortConfig.key === 'quantity') return children.reduce((sum, c) => sum + (c.quantity || 0), 0);
                    if (sortConfig.key === 'value') return children.reduce((sum, c) => sum + (c.price * (c.quantity || 0)), 0);
                }
                if (sortConfig.key === 'value') return item.price * (item.quantity || 0);
                return item[sortConfig.key as keyof InventoryItem];
            };

            if (sortConfig.key === 'quantity' || sortConfig.key === 'value') {
                aValue = getAggregation(a);
                bValue = getAggregation(b);
            } else if (sortConfig.key === 'status') {
                // Custom sort for status badges priority
                const getStatusPriority = (item: InventoryItem) => {
                    if (item.status === 'discontinued') return 0;
                    if ((item.quantity || 0) === 0) return 1; // Out of stock
                    if ((item.quantity || 0) <= (item.minStockLevel || 5)) return 2; // Low stock
                    return 3; // In stock
                };
                aValue = getStatusPriority(a);
                bValue = getStatusPriority(b);
            } else {
                // Handle undefined/nulls for strings/numbers
                aValue = aValue ?? '';
                bValue = bValue ?? '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [inventory, activeCategoryId, filterCategory, filterStatus, searchTerm, filterSupplier, sortConfig, supplierInventory]);

    // --- Helper Components ---
    const StatusBadge = ({ item }: { item: InventoryItem }) => {
        if (item.status === 'discontinued') {
            return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Discontinued</span>;
        }
        // Use actual quantity for standalone, or sum of variants for parent
        let qty = item.quantity || 0;
        if (item.isParent) {
             const variants = inventory.filter(v => v.parentId === item.id);
             qty = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
        }

        if (qty === 0) {
            return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Out of Stock</span>;
        }
        if (qty <= (item.minStockLevel || 5)) {
            return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">Low Stock</span>;
        }
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">In Stock</span>;
    };

    // --- Supplier Linking Handlers ---
    const handleLinkSupplierItem = (supplierItem: SupplierInventoryItem) => {
        setItemFormData(prev => {
            const currentIds = prev.linkedSupplierItemIds || [];
            if (currentIds.includes(supplierItem.id)) return prev;
            return { ...prev, linkedSupplierItemIds: [...currentIds, supplierItem.id] };
        });
        setSupplierSearchModalOpen(false);
    };
    
    const handleUnlinkSupplierItem = (supplierItemId: string) => {
        setItemFormData(prev => ({
            ...prev,
            linkedSupplierItemIds: (prev.linkedSupplierItemIds || []).filter(id => id !== supplierItemId)
        }));
    };

    // --- Category Management Handlers ---
    const handleAddCategorySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            onAddCategory(newCategoryName);
            setNewCategoryName('');
        }
    };

    const handleStartEditCategory = (category: Category) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
    };

    const handleSaveCategoryEdit = () => {
        if (editingCategoryId && editingCategoryName.trim()) {
            onUpdateCategory(editingCategoryId, editingCategoryName.trim());
        }
        setEditingCategoryId(null);
        setEditingCategoryName('');
    };

    const handleCancelCategoryEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName('');
    };

    if (view === 'categories') {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => setView('list')}>
                            &larr; Back to Customer Inventory
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
                                    placeholder="e.g. Electronics, Furniture" 
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
                                        <th className="p-4">Category Name</th>
                                        <th className="p-4 text-center w-32">Items</th>
                                        <th className="p-4 text-right w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {categories.map(c => {
                                        const itemCount = inventory.filter(i => i.categoryId === c.id).length;
                                        const isEditing = editingCategoryId === c.id;

                                        return (
                                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-medium text-slate-800">
                                                    {isEditing ? (
                                                        <Input
                                                            value={editingCategoryName}
                                                            onChange={(e) => setEditingCategoryName(e.target.value)}
                                                            autoFocus
                                                            className="h-8 text-sm"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveCategoryEdit();
                                                                if (e.key === 'Escape') handleCancelCategoryEdit();
                                                            }}
                                                        />
                                                    ) : (
                                                        c.name
                                                    )}
                                                </td>
                                                <td className="p-4 text-center text-slate-600">{itemCount}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={handleSaveCategoryEdit} className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors" title="Save" type="button">
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={handleCancelCategoryEdit} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors" title="Cancel" type="button">
                                                                    <XIcon className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleStartEditCategory(c)} className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded transition-colors" title="Edit" type="button">
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={(e) => handleRemoveCategoryClick(e, c.id)} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors" title="Delete" type="button">
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
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-slate-500">No categories created yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'variants') {
        const parentItem = inventory.find(i => i.id === editingItemId);
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => { setView('form'); setEditModalTab('variants'); }}>
                            &larr; Back to Product
                        </Button>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800">
                                Existing Variants
                            </h2>
                            {parentItem && <p className="text-slate-500 text-sm">{parentItem.name}</p>}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-slate-800">Variants List ({variants.length})</h4>
                    </div>

                    {selectedVariantIds.size > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 flex flex-wrap items-end gap-4">
                            <div className="text-sm text-blue-800 font-medium mb-2 w-full sm:w-auto">
                                {selectedVariantIds.size} selected
                            </div>
                            
                            <div className="flex flex-col">
                                <label className="text-xs text-slate-800 font-medium mb-1">Set Price</label>
                                <div className="flex">
                                    <Input type="number" className="!h-8 !py-0 w-24 rounded-r-none" value={bulkUpdateData.price} onChange={e => setBulkUpdateData(prev => ({...prev, price: e.target.value}))} />
                                    <Button size="sm" variant="primary" className="!rounded-l-none" onClick={() => handleBulkUpdate('price')}>Update</Button>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-xs text-slate-800 font-medium mb-1">Set Stock</label>
                                <div className="flex">
                                    <Input type="number" className="!h-8 !py-0 w-24 rounded-r-none" value={bulkUpdateData.quantity} onChange={e => setBulkUpdateData(prev => ({...prev, quantity: e.target.value}))} />
                                    <Button size="sm" variant="primary" className="!rounded-l-none" onClick={() => handleBulkUpdate('quantity')}>Update</Button>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-xs text-slate-800 font-medium mb-1">Set SKU</label>
                                <div className="flex">
                                    <Input className="!h-8 !py-0 w-32 rounded-r-none" value={bulkUpdateData.sku} onChange={e => setBulkUpdateData(prev => ({...prev, sku: e.target.value}))} placeholder="New SKU"/>
                                    <Button size="sm" variant="primary" className="!rounded-l-none" onClick={() => handleBulkUpdate('sku')}>Update</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-xs uppercase text-slate-800 font-semibold sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 w-10">
                                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300" onChange={handleSelectAllVariants} checked={selectedVariantIds.size > 0 && selectedVariantIds.size === variants.length} />
                                    </th>
                                    <th className="p-4">Attributes</th>
                                    <th className="p-4 w-40">SKU</th>
                                    <th className="p-4 text-right w-32">Stock</th>
                                    <th className="p-4 text-right w-32">Price</th>
                                    <th className="p-4 text-right w-16">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {variants.map(v => {
                                    const attrString = v.variantAttributes 
                                        ? Object.entries(v.variantAttributes).map(([key, val]) => `${key}: ${val}`).join(' | ') 
                                        : 'No attributes';
                                    
                                    return (
                                        <tr key={v.id} className={selectedVariantIds.has(v.id) ? 'bg-blue-50' : ''}>
                                            <td className="p-4">
                                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedVariantIds.has(v.id)} onChange={(e) => handleSelectVariant(v.id, e.target.checked)} />
                                            </td>
                                            <td className="p-4 font-medium text-slate-800">{attrString}</td>
                                            <td className="p-4 text-slate-800">
                                                <Input 
                                                    value={v.sku || ''} 
                                                    onChange={e => onUpdateItem({ ...v, sku: e.target.value })}
                                                    className="!py-1 h-9"
                                                />
                                            </td>
                                            <td className="p-4 text-right">
                                                <Input 
                                                    type="number" 
                                                    value={v.quantity} 
                                                    onChange={e => onUpdateItem({ ...v, quantity: parseInt(e.target.value) || 0 })}
                                                    className="!py-1 text-right h-9"
                                                />
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-slate-400">{currency}</span>
                                                    <Input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={v.price} 
                                                        onChange={e => onUpdateItem({ ...v, price: parseFloat(e.target.value) || 0 })}
                                                        className="!py-1 !pl-6 text-right h-9"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button variant="ghost" size="icon" onClick={(e) => handleRemoveVariantClick(e, v.id)} type="button">
                                                    <TrashIcon className="w-5 h-5 text-red-500" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {variants.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No variants added yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex justify-end pt-6 border-t mt-4">
                    <Button type="button" variant="primary" onClick={handleDone}>Done</Button>
                </div>
            </div>
        );
    }

    if (view === 'form') {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={closeForm}>
                            &larr; Back to Customer Inventory
                        </Button>
                        <h2 className="text-3xl font-bold text-slate-800">
                            {editingItemId ? (itemFormData.isParent ? 'Manage Product Variations' : 'Edit Item') : 'Add New Item'}
                        </h2>
                    </div>
                </div>

                {itemFormData.isParent && editingItemId && (
                    <div className="flex border-b mb-6">
                        <button 
                            className={`px-4 py-2 font-medium text-sm ${editModalTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-800 hover:text-slate-700'}`}
                            onClick={() => setEditModalTab('details')}
                            type="button"
                        >
                            Product Details
                        </button>
                        <button 
                            className={`px-4 py-2 font-medium text-sm ${editModalTab === 'variants' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-800 hover:text-slate-700'}`}
                            onClick={() => setEditModalTab('variants')}
                            type="button"
                        >
                            Manage Variants
                        </button>
                        <button 
                            className={`px-4 py-2 font-medium text-sm ${editModalTab === 'addons' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-800 hover:text-slate-700'}`}
                            onClick={() => setEditModalTab('addons')}
                            type="button"
                        >
                            Optional Add-ons
                        </button>
                    </div>
                )}

                {editModalTab === 'details' ? (
                    <form onSubmit={handleItemFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h4 className="font-semibold text-slate-800 border-b pb-2">Basic Details</h4>
                            <div className="flex gap-4 items-start">
                                <div className="w-32 h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center relative hover:bg-slate-200 transition-colors cursor-pointer overflow-hidden">
                                    {itemFormData.image ? (
                                        <img src={itemFormData.image} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-2">
                                            <UploadIcon className="w-8 h-8 text-slate-400 mx-auto" />
                                            <span className="text-xs text-slate-500">Upload</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <div className="flex-grow space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800">Item Name *</label>
                                        <Input value={itemFormData.name} onChange={e => handleItemFormChange('name', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800">SKU (Stock Keeping Unit)</label>
                                        <Input value={itemFormData.sku} onChange={e => handleItemFormChange('sku', e.target.value)} placeholder="e.g. PRD-001" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-800">Category</label>
                                    <Select value={itemFormData.categoryId || ''} onChange={e => handleItemFormChange('categoryId', e.target.value)}>
                                        <option value="">Uncategorized</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-800">Status</label>
                                    <Select value={itemFormData.status || 'active'} onChange={e => handleItemFormChange('status', e.target.value)}>
                                        <option value="active">Active</option>
                                        <option value="discontinued">Discontinued</option>
                                    </Select>
                                </div>
                            </div>
                            
                            {!editingItemId && (
                                <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <input 
                                        type="checkbox" 
                                        id="isParent" 
                                        checked={itemFormData.isParent} 
                                        onChange={e => handleItemFormChange('isParent', e.target.checked)} 
                                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="isParent" className="ml-3 text-sm font-medium text-blue-800">This product has variants (Size, Colour, etc.)</label>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h4 className="font-semibold text-slate-800 border-b pb-2">Inventory & Pricing</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-800">Selling Price ({currency}) *</label>
                                    <Input type="number" step="0.01" min="0" value={itemFormData.price} onChange={e => handleItemFormChange('price', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-800">VAT Rate (%)</label>
                                    <Input type="number" step="0.01" min="0" value={itemFormData.vatRate} onChange={e => handleItemFormChange('vatRate', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-800">Min Price (Optional)</label>
                                <Input type="number" step="0.01" min="0" value={itemFormData.minPrice || ''} onChange={e => handleItemFormChange('minPrice', e.target.value)} />
                            </div>

                            {itemFormData.isParent ? (
                                <div className="p-4 bg-slate-100 rounded text-center text-sm text-slate-800 italic">
                                    Stock quantity is managed via individual variants in the "Manage Variants" tab.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800">Current Stock</label>
                                        <Input type="number" step="1" value={itemFormData.quantity} onChange={e => handleItemFormChange('quantity', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800">Low Stock Alert Level</label>
                                        <Input type="number" step="1" value={itemFormData.minStockLevel} onChange={e => handleItemFormChange('minStockLevel', e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-800">Pricing Type</label>
                                <Select value={itemFormData.type} onChange={e => handleItemFormChange('type', e.target.value as ItemType)}>
                                    <option value={ItemType.FIXED}>Fixed Price</option>
                                    <option value={ItemType.MEASURED} disabled={!canUseMeasured}>Measured (e.g. per m²)</option>
                                </Select>
                            </div>

                            {itemFormData.type === ItemType.MEASURED && (
                                <div className="bg-slate-50 p-4 rounded-lg border">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Base Unit</label>
                                    <Select value={itemFormData.measurementUnit || ''} onChange={e => handleItemFormChange('measurementUnit', e.target.value as MeasurementUnit)}>
                                        {areaUnits.map(u => <option key={u} value={u}>{u}</option>)}
                                    </Select>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-xs font-medium text-slate-800">Equivalent Prices:</p>
                                        {areaUnits.map(unit => (
                                            <div key={unit} className="flex justify-between text-xs text-slate-800">
                                                <span>Per {unit}:</span>
                                                <span>{currency}{(itemFormData.unitPrices?.[unit as MeasurementUnit] ?? 0).toFixed(4)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-800 mb-2">Linked Supplier Items</label>
                                <div className="space-y-2 p-4 border rounded-lg bg-slate-50 max-h-40 overflow-y-auto">
                                    {(itemFormData.linkedSupplierItemIds || []).length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center">No supplier items linked.</p>
                                    ) : (
                                        (itemFormData.linkedSupplierItemIds || []).map(id => {
                                            const linkedItem = supplierInventory.find(si => si.id === id);
                                            if (!linkedItem) return null;
                                            return (
                                                <div key={id} className="flex justify-between items-center bg-white p-2 rounded text-sm shadow-sm">
                                                    <span className="text-slate-800 truncate max-w-[250px]">{linkedItem.name}</span>
                                                    <Button type="button" size="icon" variant="ghost" onClick={() => handleUnlinkSupplierItem(id)}>
                                                        <XIcon className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    )}
                                    <Button type="button" variant="outline" size="sm" className="w-full mt-2" onClick={() => setSupplierSearchModalOpen(true)}>
                                        <PlusIcon className="w-4 h-4 mr-1" /> Link Material
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-2 pt-6 border-t mt-4">
                            <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                            <Button type="submit" variant="primary">{editingItemId ? 'Update Product' : (itemFormData.isParent ? 'Create Parent Product' : 'Add Item')}</Button>
                        </div>
                    </form>
                ) : editModalTab === 'variants' ? (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">1. Define Attributes & Values</h3>
                            <div className="flex gap-2 mb-6">
                                <Input 
                                    placeholder="Add attribute (e.g. Size, Colour, Material)" 
                                    value={newAttributeKey} 
                                    onChange={e => setNewAttributeKey(e.target.value)} 
                                    className="max-w-md"
                                />
                                <Button onClick={handleAddAttributeKey} variant="outline" disabled={!newAttributeKey.trim()}>
                                    Add Attribute
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {(itemFormData.definedAttributeKeys || []).map(key => (
                                    <div key={key} className="bg-slate-50 border rounded-lg p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold text-slate-700 text-lg">{key}</h4>
                                            <button onClick={() => handleRemoveAttributeKey(key)} type="button" className="text-red-500 hover:text-red-700 text-sm font-medium">Remove Attribute</button>
                                        </div>
                                        
                                        <div className="flex gap-2 mb-4">
                                            <Input 
                                                placeholder={`Add ${key} value (e.g. Small)`}
                                                value={newValueInputs[key] || ''}
                                                onChange={e => setNewValueInputs(prev => ({...prev, [key]: e.target.value}))}
                                                className="max-w-xs h-9 text-sm"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddValueToAttribute(key);
                                                    }
                                                }}
                                            />
                                            <Button size="sm" variant="outline" onClick={() => handleAddValueToAttribute(key)} type="button">Add</Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {(itemFormData.definedAttributeValues?.[key] || []).map((value, idx) => {
                                                const isEditing = editingValue?.attribute === key && editingValue?.index === idx;
                                                
                                                if (isEditing) {
                                                    return (
                                                        <Input
                                                            key={idx}
                                                            autoFocus
                                                            value={editingValue.value}
                                                            onChange={e => setEditingValue(prev => prev ? {...prev, value: e.target.value} : null)}
                                                            onBlur={() => handleEditValue(key, idx, editingValue.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleEditValue(key, idx, editingValue.value);
                                                                if (e.key === 'Escape') setEditingValue(null);
                                                            }}
                                                            className="h-8 w-32 text-sm"
                                                        />
                                                    )
                                                }

                                                return (
                                                    <div key={idx} className="group flex items-center bg-white border rounded-full px-3 py-1 text-sm text-slate-700 hover:border-blue-400 transition-colors">
                                                        <span>{value}</span>
                                                        <div className="flex ml-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity border-l pl-2 border-slate-200">
                                                            <button onClick={() => setEditingValue({ attribute: key, index: idx, value })} type="button" className="text-slate-400 hover:text-blue-600"><PencilIcon className="w-3 h-3" /></button>
                                                            <button onClick={() => handleDeleteValue(key, value)} type="button" className="text-slate-400 hover:text-red-600"><TrashIcon className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {(itemFormData.definedAttributeValues?.[key] || []).length === 0 && (
                                                <p className="text-xs text-slate-400 italic py-1">No values added yet.</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {(itemFormData.definedAttributeKeys || []).length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-slate-500 bg-slate-50">
                                        Add an attribute above to start defining variants.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">2. Defaults for New Variants</h3>
                            <p className="text-sm text-slate-500 mb-4">These values will only apply to newly created combinations. Existing variants will not be changed.</p>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-800">Default Price ({currency})</label>
                                    <Input type="number" value={variantPrice || ''} onChange={e => setVariantPrice(parseFloat(e.target.value))} placeholder="Same as parent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-800">Default Stock Qty</label>
                                    <Input type="number" value={variantQty} onChange={e => setVariantQty(parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t flex flex-col gap-4">
                            <h3 className="text-lg font-bold text-slate-800">3. Update Variants</h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                Clicking "Update Variants" will generate any missing combinations based on the attributes above. 
                                It will <strong>not</strong> change the price or stock of variants that already exist.
                            </div>
                            <div className="flex justify-between items-center">
                                <Button variant="outline" onClick={() => setView('variants')} type="button">
                                    <ListBulletIcon className="w-4 h-4 mr-2" />
                                    View Existing Variants ({variants.length})
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="primary" 
                                    size="normal" 
                                    className="px-8" 
                                    onClick={handleGenerateVariants} 
                                    disabled={(itemFormData.definedAttributeKeys || []).length === 0}
                                >
                                    Update / Generate Variants
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-6 border-t">
                             <Button type="button" variant="primary" onClick={handleDone}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Manage Optional Add-ons</h3>
                            <p className="text-sm text-slate-500 mb-6">Add options that customers can choose to include when this product is added to a quote or invoice.</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 border rounded-lg items-end">
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Add-on Name</label>
                                    <Input 
                                        placeholder="e.g. Gloss Finish" 
                                        value={newAddOn.name} 
                                        onChange={e => setNewAddOn(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Price ({currency})</label>
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        value={newAddOn.price} 
                                        onChange={e => setNewAddOn(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <Button variant="primary" className="w-full" onClick={handleAddAddOn}>
                                        <PlusIcon className="w-4 h-4 mr-2" /> Add Option
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-white border rounded-lg overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4">Option Name</th>
                                            <th className="p-4 text-right">Price ({currency})</th>
                                            <th className="p-4 text-right w-20">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(itemFormData.addOnOptions || []).map(opt => (
                                            <tr key={opt.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-medium text-slate-800">{opt.name}</td>
                                                <td className="p-4 text-right text-slate-800">{currency}{opt.price.toFixed(2)}</td>
                                                <td className="p-4 text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAddOn(opt.id)}>
                                                        <TrashIcon className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(itemFormData.addOnOptions || []).length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-slate-400 italic">No add-on options defined yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex justify-end pt-6 border-t">
                             <Button type="button" variant="primary" onClick={handleDone}>Done</Button>
                        </div>
                    </div>
                )}
                <SupplierInventorySearchModal
                    isOpen={isSupplierSearchModalOpen}
                    onClose={() => setSupplierSearchModalOpen(false)}
                    items={supplierInventory}
                    onSelectItem={handleLinkSupplierItem}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
                    <p className="text-sm text-slate-500 font-medium uppercase">Total Customer Inventory Value</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{currency}{metrics.totalValue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
                    <p className="text-sm text-slate-500 font-medium uppercase">Low / Out of Stock</p>
                    <div className="flex gap-3 mt-1">
                        <p className="text-2xl font-bold text-orange-600">{metrics.lowStockItems}</p>
                        <span className="text-gray-300 text-2xl">/</span>
                        <p className="text-2xl font-bold text-red-600">{metrics.outOfStockItems}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                    <p className="text-sm text-slate-500 font-medium uppercase">Total Products</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{metrics.totalItems}</p>
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
                                placeholder="Search Name or SKU..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full md:w-40">
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="low_stock">Low Stock</option>
                            <option value="discontinued">Discontinued</option>
                        </Select>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {!currentUser.subscriptionStatus.startsWith('trial_') && (
                            <Button variant="outline" onClick={() => exportToCsv('inventory.csv', inventory)}>
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
                        <label htmlFor="categoryFilter" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                            Filter Category:
                        </label>
                        <Select 
                            id="categoryFilter"
                            value={activeCategoryId || (filterCategory ? filterCategory : '')} 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'all') {
                                    setActiveCategoryId(null);
                                    setFilterCategory('');
                                } else if (val === 'uncategorized') {
                                    setActiveCategoryId('uncategorized');
                                } else {
                                    setActiveCategoryId(val);
                                    setFilterCategory(val);
                                }
                            }}
                            className="w-full sm:w-64 bg-white"
                        >
                            <option value="all">All Items</option>
                            <option value="uncategorized">Uncategorized</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
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
                                <th className="p-4 w-16">Img</th>
                                <th className="p-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('name')}>Product / SKU</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('status')}>Status</th>
                                <th className="p-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('quantity')}>Stock</th>
                                <th className="p-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('price')}>Price</th>
                                <th className="p-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('value')}>Value</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                            {filteredAndSortedInventory.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No items found matching your filters.</td></tr>
                            ) : (
                                filteredAndSortedInventory.map(item => {
                                    const category = categories.find(c => c.id === item.categoryId);
                                    
                                    let displayQty = item.quantity || 0;
                                    let totalVal = (item.price || 0) * displayQty;
                                    let displayPrice = `${currency}${item.price.toFixed(2)}`;

                                    if (item.isParent) {
                                        const children = inventory.filter(child => child.parentId === item.id);
                                        displayQty = children.reduce((sum, c) => sum + (c.quantity || 0), 0);
                                        totalVal = children.reduce((sum, c) => sum + (c.price * (c.quantity || 0)), 0);
                                        if (children.length > 0) {
                                            const prices = children.map(c => c.price);
                                            const minP = Math.min(...prices);
                                            const maxP = Math.max(...prices);
                                            if (minP !== maxP) displayPrice = `${currency}${minP.toFixed(2)} - ${currency}${maxP.toFixed(2)}`;
                                            else displayPrice = `${currency}${minP.toFixed(2)}`;
                                        }
                                    }

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-md overflow-hidden border flex items-center justify-center relative">
                                                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-300 text-xs">IMG</span>}
                                                    {item.isParent && (
                                                        <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-0.5 rounded-tl-md" title="Product with Variants">
                                                            <DocumentDuplicateIcon className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-medium text-slate-800">{item.name}</p>
                                                {item.sku && <p className="text-xs text-slate-500">SKU: {item.sku}</p>}
                                                {item.isParent && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mt-1 inline-block">Has Variants</span>}
                                            </td>
                                            <td className="p-4 text-slate-800">{category?.name || <span className="text-slate-400 italic">Uncategorized</span>}</td>
                                            <td className="p-4 text-center"><StatusBadge item={item} /></td>
                                            <td className="p-4 text-right font-medium text-slate-800">{displayQty}</td>
                                            <td className="p-4 text-right text-slate-800">{displayPrice} {item.measurementUnit ? ` / ${item.measurementUnit}` : ''}</td>
                                            <td className="p-4 text-right text-slate-800">{currency}{totalVal.toFixed(2)}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleStartEditItem(item)} className="p-2 rounded bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title={item.isParent ? "Manage Variants" : "Edit Item"} type="button">
                                                        {item.isParent ? <DocumentDuplicateIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={(e) => handleDeleteItem(e, item.id)} className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors" type="button">
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

export default InventoryManager;
