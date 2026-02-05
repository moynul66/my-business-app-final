
import React, { useState, useEffect } from 'react';
import { TrackedJob, TrackedJobStatus, User, TrackedJobPriority } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { ClockIcon } from './icons/ClockIcon';
import { TextArea } from './ui/TextArea';
import { TrashIcon } from './icons/TrashIcon';

interface EditTrackedJobModalProps {
    job: TrackedJob | null;
    onClose: () => void;
    onSave: (job: TrackedJob) => void;
    onDelete: (jobId: string) => void;
    teamMembers: User[];
}

const EditTrackedJobModal: React.FC<EditTrackedJobModalProps> = ({ job, onClose, onSave, onDelete, teamMembers }) => {
    const [editedJob, setEditedJob] = useState<TrackedJob | null>(null);
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        if (job) {
            setEditedJob({ ...job });
        } else {
            setEditedJob(null);
        }
    }, [job]);

    useEffect(() => {
        if (!editedJob?.dueDate) {
            setCountdown('');
            return;
        }

        const updateCountdown = () => {
            const dueDate = new Date(editedJob.dueDate + 'T23:59:59'); // Assume end of day for deadline
            const now = new Date();
            const diff = dueDate.getTime() - now.getTime();

            if (diff <= 0) {
                const overdueDiff = Math.abs(diff);
                const days = Math.floor(overdueDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((overdueDiff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((overdueDiff / 1000 / 60) % 60);
                const seconds = Math.floor((overdueDiff / 1000) % 60);
                setCountdown(`Overdue by ${days}d ${hours}h ${minutes}m ${seconds}s`);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s remaining`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [editedJob?.dueDate]);


    if (!editedJob) {
        return null;
    }

    const handleFieldChange = (field: keyof TrackedJob, value: string) => {
        setEditedJob(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSave = () => {
        if (editedJob) {
            onSave(editedJob);
        }
    };
    
    const handleDelete = () => {
        if (editedJob) {
            onDelete(editedJob.id);
        }
    };
    
    const isOverdue = countdown.startsWith('Overdue');
    const isManualEntry = editedJob.invoiceNumber === 'Manual Entry';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:my-8 w-full max-w-lg mx-4 border border-slate-200">
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                            Edit Job
                        </h3>
                         <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
                             <span className="sr-only">Close</span>
                             <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="mt-6 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                            {isManualEntry ? (
                                <div>
                                    <label htmlFor="jobDescription" className="block text-sm font-medium text-slate-600 mb-1">Job Description</label>
                                    <TextArea
                                        id="jobDescription"
                                        value={editedJob.description}
                                        onChange={(e) => handleFieldChange('description', e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            ) : (
                                <p className="font-medium text-slate-800">{editedJob.description}</p>
                            )}
                            <p className="text-sm text-slate-500 mt-1">{editedJob.customerName} - {editedJob.invoiceNumber}</p>
                        </div>
                        <div className={`flex items-center justify-center p-3 rounded-lg ${isOverdue ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            <ClockIcon className="w-6 h-6 mr-3" />
                            <span className="font-mono text-lg font-medium">{countdown}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="jobStatus" className="block text-sm font-medium text-slate-600">Status</label>
                                <Select 
                                    id="jobStatus" 
                                    value={editedJob.status} 
                                    onChange={(e) => handleFieldChange('status', e.target.value)}
                                >
                                    <option value="new">New</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="complete">Complete</option>
                                </Select>
                            </div>
                             <div>
                                <label htmlFor="jobDueDate" className="block text-sm font-medium text-slate-600">Due Date</label>
                                <Input 
                                    id="jobDueDate" 
                                    type="date"
                                    value={editedJob.dueDate}
                                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                                />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="jobPriority" className="block text-sm font-medium text-slate-600">Priority</label>
                            <Select 
                                id="jobPriority" 
                                value={editedJob.priority || 'medium'} 
                                onChange={(e) => handleFieldChange('priority', e.target.value)}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="jobAssignedTo" className="block text-sm font-medium text-slate-600">Assign To</label>
                            <Select
                                id="jobAssignedTo"
                                value={editedJob.assignedTeamMemberId || ''}
                                onChange={(e) => handleFieldChange('assignedTeamMemberId', e.target.value)}
                            >
                                <option value="">-- Unassigned --</option>
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>{member.name || member.username}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="jobNotes" className="block text-sm font-medium text-slate-600">Notes</label>
                            <TextArea
                                id="jobNotes"
                                value={editedJob.notes || ''}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                rows={4}
                                placeholder="Add any relevant notes for this job..."
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                    <Button variant="primary" onClick={handleSave}>
                        Save Changes
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete Job
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditTrackedJobModal;
