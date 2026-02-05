import React, { useState, useEffect, useMemo } from 'react';
import { TaskColumn, TaskColumnType, DropdownOption } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { XIcon } from './icons/XIcon';
import { PlusIcon } from './icons/PlusIcon';
import ColorPickerModal from './ui/ColorPickerModal';

interface AddColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveColumn: (column: Omit<TaskColumn, 'id'> | TaskColumn) => void;
    existingColumns: TaskColumn[];
    editingColumn?: TaskColumn | null;
    forceCustom?: boolean;
}

const allColumnTypeInfo: { value: TaskColumnType; label: string; isCustom: boolean; isSingleInstance: boolean; creatable: boolean }[] = [
    // Non-custom, single instance, not creatable by user as they are default
    { value: 'customer', label: 'Customer Name', isCustom: false, isSingleInstance: true, creatable: false },
    { value: 'description', label: 'Description', isCustom: false, isSingleInstance: true, creatable: false },
    { value: 'status', label: 'Job Status', isCustom: false, isSingleInstance: true, creatable: false },
    { value: 'dueDate', label: 'Due Date', isCustom: false, isSingleInstance: true, creatable: false },
    
    // Non-custom, single instance, but user can add them if not present
    { value: 'notes', label: 'Notes (Large Text)', isCustom: false, isSingleInstance: true, creatable: true },
    { value: 'team', label: 'Assign Team Members', isCustom: false, isSingleInstance: true, creatable: true },
    { value: 'priority', label: 'Priority', isCustom: true, isSingleInstance: false, creatable: true },
    
    // Custom types, user can create multiple
    { value: 'task', label: 'Task / Job', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'jobStatus', label: 'Job Status Dropdown', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'text', label: 'Text Field', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'number', label: 'Numbers', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'dropdown', label: 'Dropdown', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'checkbox', label: 'Check Box', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'phone', label: 'Phone Number', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'date', label: 'Date', isCustom: true, isSingleInstance: false, creatable: true },
    { value: 'deadline', label: 'Deadline (Timeline)', isCustom: true, isSingleInstance: false, creatable: true },
];

const defaultStatusOptions: DropdownOption[] = [
    { id: crypto.randomUUID(), label: 'New', color: 'bg-blue-500' },
    { id: crypto.randomUUID(), label: 'In Progress', color: 'bg-orange-500' },
    { id: crypto.randomUUID(), label: 'Complete', color: 'bg-green-500' },
    { id: crypto.randomUUID(), label: 'Overdue', color: 'bg-red-500' },
];

const defaultPriorityOptions: DropdownOption[] = [
    { id: crypto.randomUUID(), label: 'High', color: 'bg-red-500' },
    { id: crypto.randomUUID(), label: 'Medium', color: 'bg-orange-500' },
    { id: crypto.randomUUID(), label: 'Low', color: 'bg-blue-500' },
];

const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onSaveColumn, existingColumns, editingColumn, forceCustom = false }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<TaskColumnType>('text');
    const [unit, setUnit] = useState('');
    const [options, setOptions] = useState<DropdownOption[]>([{ id: crypto.randomUUID(), label: '', color: 'bg-slate-200' }]);
    const [color, setColor] = useState<string>('bg-white');
    const [textColor, setTextColor] = useState<'auto' | 'black' | 'white'>('auto');
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [colorTarget, setColorTarget] = useState<'column' | string | null>(null); // 'column' or an optionId

    const isEditing = !!editingColumn;
    const isEditingDefaultColumn = isEditing && !editingColumn.isCustom && !forceCustom;

    const resetForm = () => {
        setName('');
        setType('text');
        setUnit('');
        setOptions([{ id: crypto.randomUUID(), label: '', color: 'bg-slate-200' }]);
        setColor('bg-white');
        setTextColor('auto');
    };

    useEffect(() => {
        if (isOpen) {
            if (editingColumn) {
                setName(editingColumn.name);
                setType(editingColumn.type);
                setUnit(editingColumn.unit || '');
                if ((editingColumn.type === 'jobStatus' || editingColumn.type === 'priority') && (!editingColumn.options || editingColumn.options.length === 0)) {
                    setOptions(editingColumn.type === 'jobStatus' ? defaultStatusOptions : defaultPriorityOptions);
                } else {
                    setOptions(editingColumn.options && editingColumn.options.length > 0 ? editingColumn.options : [{ id: crypto.randomUUID(), label: '', color: 'bg-slate-200' }]);
                }
                setColor(editingColumn.color || 'bg-white');
                setTextColor(editingColumn.textColor || 'auto');
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingColumn]);

    useEffect(() => {
        if (isOpen && !isEditing) {
            if (type === 'jobStatus') {
                setOptions(defaultStatusOptions);
            } else if (type === 'priority') {
                setOptions(defaultPriorityOptions);
            } else if (type === 'dropdown') {
                setOptions([{ id: crypto.randomUUID(), label: '', color: 'bg-slate-200' }]);
            }
        }
    }, [type, isEditing, isOpen]);
    
    const typeOptions = useMemo(() => {
        return allColumnTypeInfo.filter(typeInfo => {
            if (!isEditing) {
                if (!typeInfo.creatable) return false;
                if (typeInfo.isSingleInstance) {
                    return !existingColumns.some(ec => ec.type === typeInfo.value);
                }
                return true;
            }
            if (editingColumn && typeInfo.value === editingColumn.type) {
                return true;
            }
            if (!typeInfo.creatable) return false;
            if (typeInfo.isSingleInstance) {
                return !existingColumns.some(ec => ec.type === typeInfo.value);
            }
            return true;
        });
    }, [isEditing, editingColumn, existingColumns]);

    const handleAddOption = () => {
        setOptions(prev => [...prev, { id: crypto.randomUUID(), label: '', color: 'bg-slate-200' }]);
    };

    const handleRemoveOption = (id: string) => {
        setOptions(prev => prev.filter(opt => opt.id !== id));
    };

    const handleOptionChange = (id: string, label: string) => {
        setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, label } : opt));
    };
    
    const handleOptionColorChange = (optionId: string, color: string) => {
        setOptions(prev => prev.map(opt => opt.id === optionId ? { ...opt, color } : opt));
    };

    const handleColorSelect = (selectedColor: string) => {
        if (colorTarget === 'column') {
            setColor(selectedColor);
        } else if (colorTarget) {
            handleOptionColorChange(colorTarget, selectedColor);
        }
        setIsColorModalOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedTypeInfo = allColumnTypeInfo.find(t => t.value === type);
        if (!name.trim() || !type) {
            alert('Please provide a column name and select a type.');
            return;
        }

        const columnData: Omit<TaskColumn, 'id'> | TaskColumn = {
            ...(isEditing && { id: editingColumn.id }),
            name: name.trim(),
            type,
            isCustom: forceCustom ? true : (selectedTypeInfo?.isCustom ?? true),
            color,
            textColor,
        };

        if (type === 'number' && unit.trim()) {
            (columnData as TaskColumn).unit = unit.trim();
        }
        if (type === 'dropdown' || type === 'jobStatus' || type === 'priority') {
            (columnData as TaskColumn).options = options.filter(opt => opt.label.trim() !== '');
        }

        onSaveColumn(columnData);
        resetForm();
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-black bg-opacity-70" onClick={onClose}></div>
                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Column' : 'Add New Column'}</h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Column Name</label>
                                <Input value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Column Type</label>
                                <Select value={type} onChange={e => setType(e.target.value as TaskColumnType)} required disabled={isEditingDefaultColumn}>
                                    {typeOptions.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </Select>
                                {isEditingDefaultColumn ? (
                                    <p className="text-xs text-slate-500 mt-1">The type of a default column cannot be changed.</p>
                                ) : isEditing ? (
                                    <p className="text-xs text-orange-600 mt-1">Warning: Changing the column type may cause data in this column to be lost or reset.</p>
                                ): null}
                            </div>
                            {type === 'number' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Unit (Optional)</label>
                                    <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g., $, kg, hours" disabled={isEditingDefaultColumn}/>
                                </div>
                            )}
                            {(type === 'dropdown' || type === 'jobStatus' || type === 'priority') && (
                                <fieldset disabled={isEditingDefaultColumn}>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Dropdown Options</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-slate-50">
                                        {options.map((opt, index) => (
                                            <div key={opt.id} className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setColorTarget(opt.id); setIsColorModalOpen(true); }}
                                                    className={`w-8 h-8 rounded-md border shrink-0 ${opt.color || 'bg-white'}`}
                                                />
                                                <Input 
                                                    value={opt.label} 
                                                    onChange={e => handleOptionChange(opt.id, e.target.value)}
                                                    placeholder={`Option ${index + 1}`}
                                                    disabled={isEditingDefaultColumn}
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOption(opt.id)} disabled={isEditingDefaultColumn}>
                                                    <XIcon className="w-5 h-5 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button type="button" variant="outline" onClick={handleAddOption} className="mt-2 text-sm" disabled={isEditingDefaultColumn}>
                                        <PlusIcon className="w-4 h-4 mr-2" /> Add Option
                                    </Button>
                                </fieldset>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Column Background Color</label>
                                <div className="flex items-center gap-2">
                                    <div className={`w-10 h-10 rounded-md border ${color}`}></div>
                                    <Button type="button" variant="outline" onClick={() => { setColorTarget('column'); setIsColorModalOpen(true); }}>
                                        Change Color
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Column Text Color</label>
                                <Select value={textColor} onChange={e => setTextColor(e.target.value as 'auto' | 'black' | 'white')}>
                                    <option value="auto">Automatic</option>
                                    <option value="black">Black</option>
                                    <option value="white">White</option>
                                </Select>
                                <p className="text-xs text-slate-500 mt-1">"Automatic" ensures text is readable against the background color.</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                                <Button type="submit" variant="primary">{isEditing ? 'Save Changes' : 'Add Column'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <ColorPickerModal
                isOpen={isColorModalOpen}
                onClose={() => setIsColorModalOpen(false)}
                onSelectColor={handleColorSelect}
            />
        </>
    );
};

export default AddColumnModal;
