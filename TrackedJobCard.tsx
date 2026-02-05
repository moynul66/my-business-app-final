
import React from 'react';
import { TrackedJob, User } from '../types';
import { CalendarIcon } from './icons/CalendarIcon';
import { UsersIcon } from './icons/UsersIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { UserIcon } from './icons/UserIcon';
import { ChatBubbleLeftIcon } from './icons/ChatBubbleLeftIcon';
import Confetti from './Confetti';

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
    isSelectionDisabled
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

    const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        onToggleSelection?.(job.id);
    };

    return (
        <div 
            onClick={isSelectionDisabled ? undefined : onClick}
            draggable={true}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`relative p-4 rounded-lg shadow-sm cursor-pointer border-l-4 transition-all text-white ${cardColorClass} ${isDragging ? 'opacity-50' : ''} ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500' : ''} ${isSelectionDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
            {isSelectable && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // onChange is handled by onClick to use stopPropagation
                    onClick={handleCheckboxClick}
                    disabled={isSelectionDisabled}
                    className="absolute top-2 right-2 h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                    aria-label="Select job"
                />
            )}
            {isJustCompleted && <Confetti />}
            <p className="font-semibold break-words pr-8">{job.description}</p>
            
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
                    {hasNotes && (
                        <ChatBubbleLeftIcon className="w-4 h-4" title="This job has notes" />
                    )}
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
