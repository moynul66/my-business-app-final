import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { TrackedJob, TaskColumn, User, TrackedJobStatus, TrackedJobPriority, TaskColumnType, ActivityLogEntry, TaskGroup } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { PlusIcon } from './icons/PlusIcon';
import { EllipsisVerticalIcon } from './icons/EllipsisVerticalIcon';
import AddColumnModal from './AddColumnModal';
import { Select } from './ui/Select';
import ColorPickerModal from './ui/ColorPickerModal';
import TextEditModal from './TextEditModal';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import ActivityLogModal from './ActivityLogModal';
import { ChatBubbleLeftIcon } from './icons/ChatBubbleLeftIcon';
import { Modal } from './ui/Modal';
import { SnowflakeIcon } from './icons/SnowflakeIcon';
import DeadlineEditModal from './DeadlineEditModal';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { exportToCsv } from '../services/csvService';

// This is the old props interface for the single-table view
interface SingleTasksViewProps {
    jobs: TrackedJob[];
    onUpdateJob: (job: TrackedJob) => void;
    taskColumns: TaskColumn[];
    setTaskColumns: React.Dispatch<React.SetStateAction<TaskColumn[]>>;
    users: User[];
    currentUser: User;
}

// This is the new props interface for the group-based view
interface GroupedTasksViewProps {
    customTaskGroups: TaskGroup[];
    onUpdateCustomTask: (groupId: string, task: TrackedJob) => void;
    onCreateCustomTask: (groupId: string | undefined, taskData: Omit<TrackedJob, 'id' | 'createdAt'>) => void;
    onDeleteCustomTask: (groupId: string, taskId: string) => void;
    onAddCustomGroup: (afterGroupId?: string) => void;
    onDeleteGroup: (groupId: string) => void;
    onUpdateGroup: (groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'isCollapsed' | 'color'>>) => void;
    onUpdateGroupColumns: (groupId: string, newColumns: TaskColumn[]) => void;
    onDuplicateGroup: (groupId: string) => void;
    onDuplicateColumn: (groupId: string, columnId: string) => void;
    users: User[];
    currentUser: User;
    searchTerm?: string;
}

// Combine props into a single type that can handle both views
type TasksViewProps = (SingleTasksViewProps & { customTaskGroups?: never }) | (GroupedTasksViewProps & { jobs?: never });


// SingleTaskTable component
const SingleTaskTable: React.FC<{
    tasks: TrackedJob[];
    columns: TaskColumn[];
    onUpdateTask: (task: TrackedJob) => void;
    onDeleteTask?: (taskId: string) => void;
    onUpdateColumns: (columns: TaskColumn[]) => void;
    onCreateTask?: (groupId?: string) => void;
    onDuplicateColumn?: (columnId: string) => void;
    users: User[];
    currentUser: User;
    centerAlign?: boolean;
}> = ({ tasks, columns, onUpdateTask, onDeleteTask, onUpdateColumns, onCreateTask, onDuplicateColumn, users, currentUser, centerAlign = false }) => {

    type EditingCell = { jobId: string; fieldId: string; } | null;

    const [editingCell, setEditingCell] = useState<EditingCell>(null);
    const [editingValue, setEditingValue] = useState<string | number | boolean>('');
    const [showColumnMenu, setShowColumnMenu] = useState<string | null>(null);
    const [addColumnModalState, setAddColumnModalState] = useState<{ isOpen: boolean; editingColumn: TaskColumn | null; insertionIndex?: number; }>({ isOpen: false, editingColumn: null });
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [teamAssignmentModal, setTeamAssignmentModal] = useState<{ isOpen: boolean; job: TrackedJob | null; fieldId: string | null; }>({ isOpen: false, job: null, fieldId: null });
    const [tempSelectedTeam, setTempSelectedTeam] = useState<string[]>([]);
    const [textEditModalState, setTextEditModalState] = useState<{ isOpen: boolean; jobId: string | null; fieldId: string | null; columnName: string; initialValue: string; }>({ isOpen: false, jobId: null, fieldId: null, columnName: '', initialValue: '' });
    const [activityLogState, setActivityLogState] = useState<{ isOpen: boolean; job: TrackedJob | null }>({ isOpen: false, job: null });
    const [frozenColumnOffsets, setFrozenColumnOffsets] = useState<Record<string, number>>({});
    const headerRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
    const [deadlineModalState, setDeadlineModalState] = useState<{ isOpen: boolean; jobId: string | null; fieldId: string | null; initialValue?: { startDate?: string; endDate?: string }; }>({ isOpen: false, jobId: null, fieldId: null, initialValue: undefined });

    const teamMembers = useMemo(() => {
        if (currentUser.role === 'admin') return users.filter(u => u.role === 'team-member');
        return users.filter(u => u.teamId === currentUser.id && u.role === 'team-member');
    }, [users, currentUser]);

    const handleMenuAction = (action: () => void) => {
        action();
        setShowColumnMenu(null);
    };

    const handleToggleFreeze = (columnId: string) => {
        onUpdateColumns(columns.map(col => col.id === columnId ? { ...col, isFrozen: !col.isFrozen } : col));
    };

    useLayoutEffect(() => {
        const newOffsets: Record<string, number> = {};
        let currentOffset = 0;
        columns.forEach(col => {
            if (col.isFrozen) {
                const headerEl = headerRefs.current[col.id];
                if (headerEl) {
                    newOffsets[col.id] = currentOffset;
                    currentOffset += headerEl.offsetWidth;
                }
            }
        });
        setFrozenColumnOffsets(newOffsets);
    }, [columns]);

    const handleCellClick = (job: TrackedJob, column: TaskColumn) => {
        const { id: fieldId, type, isCustom, name } = column;
        const textLikeTypes: TaskColumnType[] = ['description', 'text', 'notes', 'customer', 'task'];
        let currentValue: any = isCustom ? job.customFields?.[fieldId] : job[fieldId as keyof TrackedJob];
        if (textLikeTypes.includes(type)) {
            setTextEditModalState({ isOpen: true, jobId: job.id, fieldId, columnName: name, initialValue: currentValue || '' });
        } else {
            setEditingCell({ jobId: job.id, fieldId });
            setEditingValue(currentValue || '');
        }
    };
    
    const handleSaveEdit = () => {
        if (!editingCell) return;
        const { jobId, fieldId } = editingCell;
        const jobToUpdate = tasks.find(j => j.id === jobId);
        if (!jobToUpdate) return;
        const column = columns.find(c => c.id === fieldId);
        if (!column) return;
        
        let updatedJob: TrackedJob = column.isCustom
            ? { ...jobToUpdate, customFields: { ...(jobToUpdate.customFields || {}), [fieldId]: editingValue } }
            : { ...jobToUpdate, [fieldId]: editingValue };
        
        onUpdateTask(updatedJob);
        setEditingCell(null);
        setEditingValue('');
    };

    const handleSaveTextEdit = (newValue: string) => {
        const { jobId, fieldId } = textEditModalState;
        if (!jobId || !fieldId) return;
        const jobToUpdate = tasks.find(j => j.id === jobId);
        if (!jobToUpdate) return;
        const column = columns.find(c => c.id === fieldId);
        if (!column) return;
        
        let updatedJob: TrackedJob = column.isCustom
            ? { ...jobToUpdate, customFields: { ...(jobToUpdate.customFields || {}), [fieldId]: newValue } }
            : { ...jobToUpdate, [fieldId]: newValue };
        
        onUpdateTask(updatedJob);
        setTextEditModalState({ isOpen: false, jobId: null, fieldId: null, columnName: '', initialValue: '' });
    };

    const handleSaveActivityLog = (updatedLog: ActivityLogEntry[]) => {
        if (activityLogState.job) {
            onUpdateTask({ ...activityLogState.job, activityLog: updatedLog });
            setActivityLogState({ isOpen: false, job: null });
        }
    };

    const handleImmediateUpdate = (job: TrackedJob, field: string, value: any, isCustom: boolean) => {
        const updatedJob = isCustom
            ? { ...job, customFields: { ...(job.customFields || {}), [field]: value } }
            : { ...job, [field]: value };
        onUpdateTask(updatedJob);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const openMenuRef = showColumnMenu ? menuRefs.current[showColumnMenu] : null;
            if (openMenuRef && !openMenuRef.contains(event.target as Node)) setShowColumnMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showColumnMenu]);

    const handleSaveColumn = (columnData: Omit<TaskColumn, 'id'> | TaskColumn) => {
        if ('id' in columnData && columnData.id) {
            onUpdateColumns(columns.map(c => c.id === columnData.id ? columnData : c));
        } else {
            const newColumn = { ...columnData, id: crypto.randomUUID() };
            const newColumns = [...columns];
            if (addColumnModalState.insertionIndex !== undefined) {
                newColumns.splice(addColumnModalState.insertionIndex, 0, newColumn);
            } else {
                newColumns.push(newColumn);
            }
            onUpdateColumns(newColumns);
        }
        setAddColumnModalState({ isOpen: false, editingColumn: null });
    };

    const handleOpenCreateModal = (insertionIndex?: number) => {
        setAddColumnModalState({ isOpen: true, editingColumn: null, insertionIndex });
    };

    const handleOpenEditModal = (columnId: string) => {
        const columnToEdit = columns.find(c => c.id === columnId);
        if (columnToEdit) {
            setAddColumnModalState({ isOpen: true, editingColumn: columnToEdit, insertionIndex: undefined });
        }
    };

    const handleAddColumnRelative = (columnId: string, position: 'left' | 'right') => {
        const index = columns.findIndex(c => c.id === columnId);
        if (index !== -1) {
            const insertionIndex = position === 'left' ? index : index + 1;
            handleOpenCreateModal(insertionIndex);
        }
    };

    const handleDeleteColumn = (columnId: string) => {
        if (window.confirm('Are you sure you want to delete this column and all its data? This cannot be undone.')) {
            onUpdateColumns(columns.filter(c => c.id !== columnId));
        }
    };

    const handleOpenTeamModal = (job: TrackedJob, fieldId: string) => {
        const currentIds: string[] = (job.customFields?.[fieldId] as string[]) || [];
        setTempSelectedTeam(currentIds);
        setTeamAssignmentModal({ isOpen: true, job, fieldId });
    };

    const handleTempTeamSelection = (memberId: string, isSelected: boolean) => {
        setTempSelectedTeam(prev => {
            const newSet = new Set(prev);
            isSelected ? newSet.add(memberId) : newSet.delete(memberId);
            return Array.from(newSet);
        });
    };

    const handleSaveTeamAssignment = () => {
        const { job, fieldId } = teamAssignmentModal;
        if (!job || !fieldId) return;
        handleImmediateUpdate(job, fieldId, tempSelectedTeam, true);
        setTeamAssignmentModal({ isOpen: false, job: null, fieldId: null });
    };

    const handleSaveDeadline = (value: { startDate: string; endDate: string }) => {
        const { jobId, fieldId } = deadlineModalState;
        if (!jobId || !fieldId) return;
        const jobToUpdate = tasks.find(j => j.id === jobId);
        if (jobToUpdate) handleImmediateUpdate(jobToUpdate, fieldId, value, true);
        setDeadlineModalState({ isOpen: false, jobId: null, fieldId: null });
    };

    const tailwindColorToHex: Record<string, string> = {
        'bg-slate-500': '#64748b', 'bg-red-500': '#ef4444', 'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b',
        'bg-yellow-500': '#eab308', 'bg-lime-500': '#84cc16', 'bg-green-500': '#22c55e', 'bg-emerald-500': '#10b981',
        'bg-teal-500': '#14b8a6', 'bg-cyan-500': '#06b6d4', 'bg-sky-500': '#0ea5e9', 'bg-blue-500': '#3b82f6',
        'bg-indigo-500': '#6366f1', 'bg-violet-500': '#8b5cf6', 'bg-purple-500': '#a855f7', 'bg-fuchsia-500': '#d946ef',
        'bg-pink-500': '#ec4899', 'bg-rose-500': '#f43f5e', 'bg-slate-200': '#e2e8f0', 'bg-white': '#ffffff', 'bg-black': '#000000',
    };

    const isColorDark = (hexColor?: string) => {
        if (!hexColor) return false;
        const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
        if (color.length !== 6) return false;
        try {
            const r = parseInt(color.substring(0, 2), 16);
            const g = parseInt(color.substring(2, 4), 16);
            const b = parseInt(color.substring(4, 6), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return luminance < 0.6;
        } catch (e) { return false; }
    };

    const getTextColorForBg = (bgColorClass?: string) => {
        if (!bgColorClass) return 'text-slate-800';
        const hex = tailwindColorToHex[bgColorClass];
        return isColorDark(hex) ? 'text-white' : 'text-slate-800';
    };

    const renderCell = (job: TrackedJob, column: TaskColumn) => {
        const { id: fieldId, type, isCustom, unit, options } = column;
        const isEditing = editingCell?.jobId === job.id && editingCell?.fieldId === fieldId;
        const textLikeTypes: TaskColumnType[] = ['description', 'text', 'notes', 'customer', 'task'];

        let finalBgColor = tailwindColorToHex[column.color || ''] || '#ffffff';
        let textColorClass = getTextColorForBg(column.color);

        if (column.type === 'status') {
            const isOverdue = new Date(job.dueDate) < new Date() && job.status !== 'complete';
            finalBgColor = isOverdue ? '#ef4444' : job.status === 'new' ? '#3b82f6' : job.status === 'in_progress' ? '#f97316' : '#22c55e';
            textColorClass = 'text-white';
        } else if (['dropdown', 'jobStatus', 'priority'].includes(column.type)) {
            const currentValue = isCustom ? job.customFields?.[fieldId] : job[fieldId as keyof TrackedJob];
            const selectedOption = (options || []).find(opt => opt.label === currentValue);
            if (selectedOption?.color) {
                finalBgColor = tailwindColorToHex[selectedOption.color] || finalBgColor;
                textColorClass = getTextColorForBg(selectedOption.color);
            }
        }
        
        if (column.textColor === 'black') textColorClass = 'text-slate-800';
        else if (column.textColor === 'white') textColorClass = 'text-white';

        let currentValue: any = isCustom ? job.customFields?.[fieldId] : job[fieldId as keyof TrackedJob];

        if (isEditing && !textLikeTypes.includes(type)) {
            let inputType: 'text' | 'number' | 'date' | 'tel' = 'text';
            if (['date', 'dueDate'].includes(type)) inputType = 'date';
            if (type === 'number') inputType = 'number';
            if (type === 'phone') inputType = 'tel';
            return <Input type={inputType} value={typeof editingValue === 'boolean' ? String(editingValue) : editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={handleSaveEdit} onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingCell(null); }} autoFocus className="w-full h-full !rounded-none !border-2 !border-blue-500" />;
        }
        
        switch(type) {
            case 'customer':
            case 'description':
            case 'text':
            case 'notes':
                 return <div onClick={() => handleCellClick(job, column)} className={`px-2 cursor-pointer hover:bg-slate-200/50 rounded h-full truncate flex items-center ${centerAlign ? 'justify-center' : ''} ${textColorClass}`}>{currentValue || <span className="text-slate-400">...</span>}</div>;
            case 'task':
                return <div className="flex items-center justify-between h-full px-2 gap-2"><span onClick={() => handleCellClick(job, column)} className={`flex-grow truncate ${centerAlign ? 'text-center' : ''} cursor-pointer hover:bg-slate-200/50 rounded ${textColorClass}`}>{currentValue || <span className="text-slate-400">...</span>}</span><Button variant="ghost" size="icon" onClick={() => setActivityLogState({ isOpen: true, job })} title="View Activity Log"><ChatBubbleLeftIcon className={`w-5 h-5 ${textColorClass}`} /></Button></div>;
            case 'dueDate':
            case 'date':
                return <div onClick={() => handleCellClick(job, column)} className={`px-2 cursor-pointer hover:bg-slate-200/50 rounded h-full truncate flex items-center ${centerAlign ? 'justify-center' : ''} ${textColorClass}`}>{currentValue ? new Date(currentValue).toLocaleDateString() : <span className="text-slate-400">...</span>}</div>;
            case 'deadline': {
                const value = (currentValue || {}) as { startDate?: string; endDate?: string };
                const { startDate, endDate } = value;
                if (!startDate || !endDate) return <div className="flex items-center justify-center h-full px-2"><Button variant="ghost" size="sm" className={`!py-1 !px-2 text-xs w-full ${textColorClass}`} onClick={() => setDeadlineModalState({ isOpen: true, jobId: job.id, fieldId, initialValue: value })}>Set Deadline</Button></div>;
                const start = new Date(startDate + 'T00:00:00'), end = new Date(endDate + 'T23:59:59'), now = new Date();
                let progress = 0, totalDuration = end.getTime() - start.getTime();
                if (totalDuration > 0) progress = ((now.getTime() - start.getTime()) / totalDuration) * 100;
                if (now < start) progress = 0; if (now > end) progress = 100;
                const isOverdue = now > end;
                let dateText = `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
                return <div className="h-full p-1 cursor-pointer" onClick={() => setDeadlineModalState({ isOpen: true, jobId: job.id, fieldId, initialValue: value })} title={dateText}><div className="w-full h-full bg-black rounded-full overflow-hidden relative flex items-center justify-center"><div className={`h-full absolute left-0 top-0 ${isOverdue ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${progress}%` }} /><span className="relative z-10 text-xs font-medium px-2 whitespace-nowrap text-white">{dateText}</span></div></div>;
            }
            case 'number':
            case 'phone':
                 return <div onClick={() => handleCellClick(job, column)} className={`px-2 cursor-pointer hover:bg-slate-200/50 rounded h-full truncate flex items-center ${centerAlign ? 'justify-center' : ''} ${textColorClass}`}>{currentValue || <span className="text-slate-400">...</span>}</div>;
            case 'status':
                return <Select value={job.status} onChange={e => handleImmediateUpdate(job, 'status', e.target.value as TrackedJobStatus, false)} className={`!bg-transparent !border-0 !ring-0 focus:!ring-0 h-full w-full font-medium text-center !py-0 ${textColorClass}`}><option value="new" style={{color: 'black'}}>New</option><option value="in_progress" style={{color: 'black'}}>In Progress</option><option value="complete" style={{color: 'black'}}>Complete</option></Select>;
            case 'team': {
                const assignedIds: string[] = (currentValue as string[]) || [];
                const displayNames = teamMembers.filter(u => assignedIds.includes(u.id)).map(u => u.name || u.username).join(', ');
                return <div className="px-2 h-full flex items-center"><button type="button" className={`w-full ${centerAlign ? 'text-center' : 'text-left'} truncate py-1 ${textColorClass}`} onClick={() => handleOpenTeamModal(job, fieldId)}>{displayNames || <span className="text-slate-400">Unassigned</span>}</button></div>;
            }
            case 'checkbox':
                return <div className="flex justify-center items-center h-full"><Input type="checkbox" checked={!!currentValue} onChange={e => handleImmediateUpdate(job, fieldId, e.target.checked, true)} className="h-5 w-5"/></div>;
            case 'dropdown':
            case 'jobStatus':
            case 'priority':
                return <Select value={currentValue || ''} onChange={e => handleImmediateUpdate(job, fieldId, e.target.value, isCustom)} className={`!bg-transparent !border-0 w-full h-full !ring-0 focus:!ring-0 !py-0 ${centerAlign ? 'text-center' : ''} ${textColorClass}`}><option value="" style={{ color: 'black' }}>-- Select --</option>{(options || []).map(opt => <option key={opt.id} value={opt.label} style={{ color: 'black' }}>{opt.label}</option>)}</Select>;
            default:
                 return <div onClick={() => handleCellClick(job, column)} className={`px-2 cursor-pointer hover:bg-slate-200/50 rounded h-full truncate flex items-center ${centerAlign ? 'justify-center' : ''} ${textColorClass}`}>{currentValue || <span className="text-slate-400">...</span>}</div>;
        }
    };
    
    return (
        <div className="mt-4">
            <div ref={tableContainerRef} className={`w-full overflow-x-auto relative ${onDeleteTask ? 'pb-12' : ''}`}>
                <table className="w-full text-sm text-left border-collapse min-w-max">
                    <thead>
                        <tr>
                            {columns.map(column => {
                                const headerTextColorClass = column.textColor === 'black' ? 'text-slate-800' : column.textColor === 'white' ? 'text-white' : getTextColorForBg(column.color);
                                return <th key={column.id} ref={el => { headerRefs.current[column.id] = el; }} className={`p-2 border font-semibold relative whitespace-nowrap min-w-48 ${column.isFrozen ? 'sticky z-20' : ''}`} style={{ backgroundColor: tailwindColorToHex[column.color || ''] || '#f1f5f9', ...(column.isFrozen ? { left: frozenColumnOffsets[column.id] ?? 0 } : {}), }}><div className={`flex items-center ${headerTextColorClass}`}><span className={`flex-grow ${centerAlign ? 'text-center' : ''}`}>{column.name} {column.unit && `(${column.unit})`}</span><div ref={el => { menuRefs.current[column.id] = el; }} className="relative z-50"><Button size="icon" variant="ghost" onClick={() => setShowColumnMenu(showColumnMenu === column.id ? null : column.id)}><EllipsisVerticalIcon className="w-4 h-4" /></Button>{showColumnMenu === column.id && <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded shadow-lg z-50"><button onClick={() => handleMenuAction(() => handleToggleFreeze(column.id))} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">{column.isFrozen ? 'Unfreeze Column' : 'Freeze Column'}</button>{onDuplicateColumn && <button onClick={() => handleMenuAction(() => onDuplicateColumn(column.id))} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Duplicate Column</button>}{onDuplicateColumn && <button onClick={() => handleMenuAction(() => handleAddColumnRelative(column.id, 'left'))} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Add Column to the left</button>}{onDuplicateColumn && <button onClick={() => handleMenuAction(() => handleAddColumnRelative(column.id, 'right'))} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Add Column to the right</button>}<button onClick={() => handleMenuAction(() => handleOpenEditModal(column.id))} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Edit Column</button><button onClick={() => handleMenuAction(() => handleDeleteColumn(column.id))} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-red-600">Delete Column</button></div>}</div></div></th>
                            })}
                            {onDeleteTask && <th className="p-2 border bg-slate-100 w-16 text-black font-semibold sticky right-0 z-20">Actions</th>}
                            <th className="p-2 border w-[150px] bg-slate-100"><Button onClick={() => handleOpenCreateModal()} variant="outline" size="sm" className="w-full"><PlusIcon className="w-4 h-4 mr-1" /> Add Column</Button></th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-800">
                        {tasks.map(job => (
                            <tr key={job.id} className="border-b h-10">
                                {columns.map(column => {
                                    let finalBgColor = tailwindColorToHex[column.color || ''] || '#ffffff';
                                    if (column.type === 'status') {
                                        const isOverdue = new Date(job.dueDate) < new Date() && job.status !== 'complete';
                                        finalBgColor = isOverdue ? '#ef4444' : job.status === 'new' ? '#3b82f6' : job.status === 'in_progress' ? '#f97316' : '#22c55e';
                                    } else if (['dropdown', 'jobStatus', 'priority'].includes(column.type)) {
                                        const currentValue = column.isCustom ? job.customFields?.[column.id] : job[column.id as keyof TrackedJob];
                                        const selectedOption = (column.options || []).find(opt => opt.label === currentValue);
                                        if (selectedOption?.color) finalBgColor = tailwindColorToHex[selectedOption.color] || finalBgColor;
                                    }
                                    return <td key={column.id} className={`p-0 border align-middle ${centerAlign ? 'text-center' : ''} ${column.isFrozen ? 'sticky z-10' : ''}`} style={{ backgroundColor: finalBgColor, ...(column.isFrozen ? { left: frozenColumnOffsets[column.id] ?? 0 } : {}), }}>{renderCell(job, column)}</td>;
                                })}
                                {onDeleteTask && <td className="p-0 border bg-white text-center sticky right-0 z-10"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDeleteTask(job.id); }} title="Delete Task"><TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" /></Button></td>}
                                <td className="px-2 border bg-white"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-200 font-bold text-slate-800">
                            {columns.map(col => {
                                if (col.type === 'number') {
                                    const sum = tasks.reduce((acc, job) => {
                                        const value = job.customFields?.[col.id];
                                        const numericValue = parseFloat(String(value));
                                        return acc + (isNaN(numericValue) ? 0 : numericValue);
                                    }, 0);
                                    return (
                                        <td key={col.id} className={`p-2 border ${centerAlign ? 'text-center' : 'text-right'}`}>
                                            Sum Total: {sum.toFixed(2)} {col.unit}
                                        </td>
                                    );
                                }
                                return <td key={col.id} className="p-2 border"></td>;
                            })}
                            {onDeleteTask && <td className="p-2 border"></td>}
                            <td className="p-2 border"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <AddColumnModal isOpen={addColumnModalState.isOpen} onClose={() => setAddColumnModalState({ isOpen: false, editingColumn: null })} onSaveColumn={handleSaveColumn} existingColumns={columns} editingColumn={addColumnModalState.editingColumn} forceCustom />
            <TextEditModal isOpen={textEditModalState.isOpen} onClose={() => setTextEditModalState({ isOpen: false, jobId: null, fieldId: null, columnName: '', initialValue: '' })} onSave={handleSaveTextEdit} title={`Edit ${textEditModalState.columnName}`} initialValue={textEditModalState.initialValue} />
            <ActivityLogModal isOpen={activityLogState.isOpen} onClose={() => setActivityLogState({ isOpen: false, job: null })} job={activityLogState.job} currentUser={currentUser} onSaveLog={handleSaveActivityLog} />
            <Modal isOpen={teamAssignmentModal.isOpen} onClose={() => setTeamAssignmentModal({ isOpen: false, job: null, fieldId: null })} title={`Assign members to "${teamAssignmentModal.job?.description}"`} footer={<><Button variant="outline" onClick={() => setTeamAssignmentModal({ isOpen: false, job: null, fieldId: null })}>Cancel</Button><Button variant="primary" onClick={handleSaveTeamAssignment}>Save</Button></>}><div className="max-h-64 overflow-y-auto space-y-2 p-2">{teamMembers.map(member => <label key={member.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer"><input type="checkbox" checked={tempSelectedTeam.includes(member.id)} onChange={e => handleTempTeamSelection(member.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-slate-800">{member.name || member.username}</span></label>)}{teamMembers.length === 0 && <p className="text-xs text-slate-500 p-2 text-center">No team members available to assign.</p>}</div></Modal>
            <DeadlineEditModal isOpen={deadlineModalState.isOpen} onClose={() => setDeadlineModalState({ isOpen: false, jobId: null, fieldId: null })} onSave={handleSaveDeadline} initialValue={deadlineModalState.initialValue} />
        </div>
    );
}

const TasksView: React.FC<TasksViewProps> = (props) => {
    // Grouped View for "Create Custom Tasks"
    if (props.customTaskGroups) {
        const { 
            customTaskGroups, onUpdateCustomTask, onCreateCustomTask, onDeleteCustomTask, 
            onAddCustomGroup, onDeleteGroup, onUpdateGroup, onUpdateGroupColumns, 
            onDuplicateGroup, onDuplicateColumn, users, currentUser, searchTerm 
        } = props as GroupedTasksViewProps;
        
        const [groupMenuState, setGroupMenuState] = useState<{ anchorEl: HTMLElement | null; groupId: string | null; }>({ anchorEl: null, groupId: null });
        const [isColorModalOpen, setIsColorModalOpen] = useState(false);
        const [targetGroupIdForColor, setTargetGroupIdForColor] = useState<string | null>(null);
        const [editingGroupName, setEditingGroupName] = useState<{ id: string; name: string } | null>(null);


        const groupMenuRef = useRef<HTMLDivElement>(null);
        
        const filteredCustomTaskGroups = useMemo(() => {
            if (!searchTerm) {
                return customTaskGroups;
            }
            const lowercasedTerm = searchTerm.toLowerCase();

            return customTaskGroups.map(group => {
                const filteredTasks = group.tasks.filter(task => {
                    const textToSearch = [
                        task.customerName,
                        task.description,
                        task.invoiceNumber,
                        task.notes,
                        ...group.columns.map(col => {
                            const value = col.isCustom ? task.customFields?.[col.id] : task[col.id as keyof TrackedJob];
                            if (col.type === 'team') {
                                const assignedIds: string[] = (value as string[]) || [];
                                const displayNames = users.filter(u => assignedIds.includes(u.id)).map(u => u.name || u.username).join(', ');
                                return displayNames;
                            }
                            return String(value ?? '');
                        })
                    ].join(' ').toLowerCase();

                    return textToSearch.includes(lowercasedTerm);
                });

                return {
                    ...group,
                    tasks: filteredTasks,
                };
            }).filter(group => group.tasks.length > 0);

        }, [customTaskGroups, searchTerm, users]);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
                    setGroupMenuState({ anchorEl: null, groupId: null });
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleExportGroupToCsv = (group: TaskGroup) => {
            const dataToExport = group.tasks.map(task => {
                const row: Record<string, any> = {};
                group.columns.forEach(col => {
                    const value = col.isCustom ? task.customFields?.[col.id] : task[col.id as keyof TrackedJob];
                    row[col.name] = value ?? '';
                });
                return row;
            });
            exportToCsv(`${group.name.replace(/ /g, '_')}.csv`, dataToExport);
            setGroupMenuState({ anchorEl: null, groupId: null });
        };
        
        const tailwindColorToHex: Record<string, string> = { 'bg-slate-500': '#64748b', 'bg-red-500': '#ef4444', 'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b', 'bg-yellow-500': '#eab308', 'bg-lime-500': '#84cc16', 'bg-green-500': '#22c55e', 'bg-emerald-500': '#10b981', 'bg-teal-500': '#14b8a6', 'bg-cyan-500': '#06b6d4', 'bg-sky-500': '#0ea5e9', 'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1', 'bg-violet-500': '#8b5cf6', 'bg-purple-500': '#a855f7', 'bg-fuchsia-500': '#d946ef', 'bg-pink-500': '#ec4899', 'bg-rose-500': '#f43f5e', 'bg-white': '#ffffff' };
        
        const handleSelectGroupColor = (color: string) => {
            if (targetGroupIdForColor) {
                onUpdateGroup(targetGroupIdForColor, { color });
            }
            setIsColorModalOpen(false);
            setTargetGroupIdForColor(null);
        };

        return (
            <div className="space-y-6">
                {filteredCustomTaskGroups.map(group => {
                    const groupColor = group.color ? tailwindColorToHex[group.color] : undefined;
                    return (
                        <div key={group.id} className="bg-slate-50 border rounded-lg p-4" style={{ borderColor: groupColor }}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2 flex-grow">
                                    <Button size="icon" variant="ghost" onClick={() => onUpdateGroup(group.id, { isCollapsed: !group.isCollapsed })}>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${group.isCollapsed ? '-rotate-90' : ''}`} />
                                    </Button>
                                    {editingGroupName?.id === group.id ? (
                                        <Input
                                            value={editingGroupName.name}
                                            onChange={(e) => setEditingGroupName({ id: group.id, name: e.target.value })}
                                            onBlur={() => {
                                                if (editingGroupName) {
                                                    onUpdateGroup(editingGroupName.id, { name: editingGroupName.name });
                                                }
                                                setEditingGroupName(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    if (editingGroupName) {
                                                        onUpdateGroup(editingGroupName.id, { name: editingGroupName.name });
                                                    }
                                                    setEditingGroupName(null);
                                                    e.preventDefault();
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingGroupName(null);
                                                }
                                            }}
                                            autoFocus
                                            className="text-xl font-bold !bg-white !ring-2 !ring-blue-500"
                                        />
                                    ) : (
                                        <h2
                                            className={`text-xl font-bold truncate flex-grow ${!groupColor ? 'text-slate-800' : ''}`}
                                            style={{ color: groupColor }}
                                        >
                                            {group.name}
                                        </h2>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => onCreateCustomTask(group.id, { invoiceId: 'CUSTOM', invoiceNumber: 'Custom Task', customerName: '', description: 'New Task', dueDate: new Date().toISOString().split('T')[0], status: 'new', priority: 'medium', masterId: currentUser.role === 'admin' ? undefined : currentUser.teamId })}>
                                        <PlusIcon className="w-4 h-4 mr-2" /> Add Task
                                    </Button>
                                     <div className="relative">
                                        <Button size="icon" variant="ghost" onClick={(e) => setGroupMenuState({ anchorEl: e.currentTarget, groupId: group.id })}>
                                            <EllipsisVerticalIcon className="w-5 h-5" />
                                        </Button>
                                        {groupMenuState.groupId === group.id && (
                                            <div ref={groupMenuRef} className="absolute right-0 top-full mt-1 w-48 bg-white border rounded shadow-lg z-50">
                                                <button onClick={() => { setEditingGroupName({ id: group.id, name: group.name }); setGroupMenuState({ anchorEl: null, groupId: null }); }} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Edit Group Name</button>
                                                <button onClick={() => { setTargetGroupIdForColor(group.id); setIsColorModalOpen(true); setGroupMenuState({ anchorEl: null, groupId: null }); }} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Change Group Color</button>
                                                <button onClick={() => { onDuplicateGroup(group.id); setGroupMenuState({ anchorEl: null, groupId: null }); }} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Duplicate Group</button>
                                                <button onClick={() => { handleExportGroupToCsv(group); }} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-slate-800">Export to CSV</button>
                                                <button onClick={() => { onDeleteGroup(group.id); setGroupMenuState({ anchorEl: null, groupId: null }); }} className="block w-full text-left px-4 py-2 hover:bg-slate-100 text-sm text-red-600">Delete Group</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!group.isCollapsed && (
                                <SingleTaskTable
                                    tasks={group.tasks}
                                    columns={group.columns}
                                    onUpdateTask={(task) => onUpdateCustomTask(group.id, task)}
                                    onDeleteTask={(taskId) => onDeleteCustomTask(group.id, taskId)}
                                    onUpdateColumns={(newColumns) => onUpdateGroupColumns(group.id, newColumns)}
                                    onDuplicateColumn={(columnId) => onDuplicateColumn(group.id, columnId)}
                                    users={users}
                                    currentUser={currentUser}
                                    centerAlign={true}
                                />
                            )}
                            <div className="mt-4">
                                 <Button onClick={() => onAddCustomGroup(group.id)}>
                                    <PlusIcon className="w-4 h-4 mr-2" /> Add Group Below
                                </Button>
                            </div>
                        </div>
                    );
                })}
                {customTaskGroups.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        <p className="mt-2 text-sm text-slate-500">No groups created yet.</p>
                        <Button variant="primary" onClick={() => onAddCustomGroup()} className="mt-4">
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create First Group
                        </Button>
                    </div>
                )}
                 <ColorPickerModal
                    isOpen={isColorModalOpen}
                    onClose={() => setIsColorModalOpen(false)}
                    onSelectColor={handleSelectGroupColor}
                />
            </div>
        );
    }
    
    // Default single-table view for "Tasks View"
    const { jobs, onUpdateJob, taskColumns, setTaskColumns, users, currentUser } = props as SingleTasksViewProps;
    return (
        <SingleTaskTable
            tasks={jobs}
            columns={taskColumns}
            onUpdateTask={onUpdateJob}
            onUpdateColumns={setTaskColumns}
            users={users}
            currentUser={currentUser}
        />
    );
};

export default TasksView;