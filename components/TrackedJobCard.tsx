
import React from 'react';
import { TrackedJob, User, Category } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { UsersIcon } from './icons/UsersIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { UserIcon } from './icons/UserIcon';
import { ChatBubbleLeftIcon } from './icons/ChatBubbleLeftIcon';
import Confetti from './Confetti';
import { Button } from './ui/Button';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface TrackedJobCardProps {
    job: TrackedJob;
    onClick: () => void;
    users: User[];
    isJustCompleted?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: () => void;
    isDragging?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (jobId: string) => void;
    isSelectable?: boolean;
    isSelectionDisabled?: boolean;
    // New props for edit/delete
    canEdit?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    supplierCategories: Category[];
}

const TrackedJobCard: React.FC<TrackedJobCardProps> = ({ 
    job, 
    onClick, 
    users, 
    isJustCompleted, 
    onDragStart, 
    onDragEnd, 
    isDragging,
    isSelected,
    onToggleSelection,
    isSelectable,
    isSelectionDisabled,
    canEdit,
    onEdit,
    onDelete,
    supplierCategories
}) => {
    const isOverdue = new Date(job.dueDate) < new Date() && job.status !== 'complete';
    const assignedUser = job.assignedTeamMemberId ? users.find(u => u.id === job.assignedTeamMemberId) : null;
    const hasNotes = job.notes && job.notes.trim() !== '';

    let cardColorClass = '';
    if (isOverdue) {
        // Vibrant red
        cardColorClass = 'bg-red-500 border-red-700 hover:bg-red-600';
    } else {
        switch (job.status) {
            case 'new':
                // Vibrant blue
                cardColorClass = 'bg-blue-500 border-blue-700 hover:bg-blue-600';
                break;
            case 'in_progress':
                // Vibrant orange
                cardColorClass = 'bg-orange-500 border-orange-700 hover:bg-orange-600';
                break;
            case 'complete':
                // Vibrant green
                cardColorClass = 'bg-green-500 border-green-700 hover:bg-green-600';
                break;
        }
    }

    const priorityConfig = {
        high: { text: 'High', badge: 'bg-red-200 text-red-800' },
        medium: { text: 'Medium', badge: 'bg-yellow-200 text-yellow-800' },
        low: { text: 'Low', badge: 'bg-sky-200 text-sky-800' },
    };
    const currentPriority = job.priority || 'medium';
    const { text, badge } = priorityConfig[currentPriority];

    const handleActionClick = (e: React.MouseEvent, action?: () => void) => {
        e.stopPropagation();
        action?.();
    };

    const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        onToggleSelection?.(job.id);
    };

    const getBadgeTextColor = (bgColor?: string) => {
        if (!bgColor || bgColor === 'bg-white' || bgColor.includes('yellow') || bgColor.includes('amber') || bgColor.includes('lime') || bgColor.includes('slate-200')) {
            return 'text-slate-900';
        }
        return 'text-white';
    };

    return (
        <div 
            onClick={isSelectionDisabled ? undefined : onClick}
            draggable={canEdit}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`relative p-4 rounded-lg shadow-sm border-l-4 transition-all text-white ${cardColorClass} ${isDragging ? 'opacity-50' : ''} ${isSelected ? 'ring-4 ring-offset-2 ring-black' : ''} ${canEdit ? 'cursor-grab' : 'cursor-pointer'} ${isSelectionDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
            {isSelectable && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // onChange is handled by onClick to use stopPropagation
                    onClick={handleCheckboxClick}
                    disabled={isSelectionDisabled}
                    className="absolute top-2 right-2 h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 cursor-pointer"
                    aria-label="Select job"
                />
            )}
            {isJustCompleted && <Confetti />}
            <p className="font-semibold break-words pr-8">{job.description}</p>
            
            {/* Category Tags - Modified for full width and slightly larger text with subtle white border */}
            <div className="flex flex-col gap-1 mt-3">
                {job.supplierCategoryIds?.map(catId => {
                    const category = supplierCategories.find(c => c.id === catId);
                    if (!category) return null;
                    return (
                        <span 
                            key={catId} 
                            className={`text-[11px] w-full text-center px-1.5 py-1 rounded font-bold border border-white/50 uppercase shadow-sm ${category.color || 'bg-slate-100 text-slate-800'} ${getBadgeTextColor(category.color)}`}
                        >
                            {category.name}
                        </span>
                    );
                })}
            </div>

            <div className="mt-2 space-y-1 text-xs text-white/80">
                <div className="flex items-center">
                    <UsersIcon className="w-4 h-4 mr-1.5 shrink-0" />
                    <span className="truncate" title={job.customerName}>{job.customerName}</span>
                </div>
                <div className="flex items-center">
                    <DocumentTextIcon className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>{job.invoiceNumber}</span>
                </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1.5 shrink-0" />
                        <span>{assignedUser ? (assignedUser.name || assignedUser.username) : 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center">
                        {hasNotes && (
                            <span title="This job has notes"><ChatBubbleLeftIcon className="w-4 h-4" /></span>
                        )}
                        {canEdit && (
                            <div className="flex items-center -mr-2">
                                <Button size="icon" variant="ghost" className="!text-white hover:!bg-white/20" onClick={(e) => handleActionClick(e, onEdit)} title="Edit Job">
                                    <PencilIcon className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="!text-white hover:!bg-white/20" onClick={(e) => handleActionClick(e, onDelete)} title="Delete Job">
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>Due: {new Date(job.dueDate).toLocaleDateString()}</span>
                </div>
                <div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-block ${badge}`}>
                        {text} Priority
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TrackedJobCard;
