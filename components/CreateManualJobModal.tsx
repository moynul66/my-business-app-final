import React, { useState, useMemo, useEffect } from 'react';
import { User, TrackedJob, TrackedJobPriority } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { TextArea } from './ui/TextArea';

interface CreateManualJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateJob: (jobData: { customerName: string; description: string; dueDate: string; priority: TrackedJobPriority; assignedTeamMemberId?: string; masterId: string; }) => void;
    users: User[];
    currentUser: User;
}

const CreateManualJobModal: React.FC<CreateManualJobModalProps> = ({ isOpen, onClose, onCreateJob, users, currentUser }) => {
    const masterUsers = useMemo(() => users.filter(u => u.role === 'master'), [users]);
    
    const [masterId, setMasterId] = useState<string>(currentUser.id);
    const [customerName, setCustomerName] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [assignedTeamMemberId, setAssignedTeamMemberId] = useState('');
    const [priority, setPriority] = useState<TrackedJobPriority>('medium');
    
    const teamMembers = useMemo(() => {
        if (!masterId) return [];
        return users.filter(u => u.teamId === masterId && u.role === 'team-member');
    }, [users, masterId]);

    useEffect(() => {
        // Reset assigned member if the master user changes and the current member is not in the new team
        if (!teamMembers.some(tm => tm.id === assignedTeamMemberId)) {
            setAssignedTeamMemberId('');
        }
    }, [teamMembers, assignedTeamMemberId]);

    const resetForm = () => {
        setMasterId(currentUser.id);
        setCustomerName('');
        setDescription('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setAssignedTeamMemberId('');
        setPriority('medium');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!masterId || !customerName.trim() || !description.trim() || !dueDate) {
            alert('Please fill out all required fields.');
            return;
        }

        onCreateJob({
            customerName,
            description,
            dueDate,
            priority,
            assignedTeamMemberId: assignedTeamMemberId || undefined,
            masterId: masterId,
        });

        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Job">
            <form onSubmit={handleSubmit} className="space-y-4">
                {currentUser.role === 'admin' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Job For</label>
                        <Select value={masterId} onChange={e => setMasterId(e.target.value)} required>
                            <option value={currentUser.id}>My Team ({currentUser.username})</option>
                            {masterUsers.map(mu => <option key={mu.id} value={mu.id}>{mu.name || mu.username}</option>)}
                        </Select>
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Customer Name</label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Job Description</label>
                    <TextArea value={description} onChange={e => setDescription(e.target.value)} required rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Due Date</label>
                        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Priority</label>
                        <Select value={priority} onChange={e => setPriority(e.target.value as TrackedJobPriority)} required>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </Select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Assign To</label>
                    <Select value={assignedTeamMemberId} onChange={e => setAssignedTeamMemberId(e.target.value)} disabled={!masterId || teamMembers.length === 0}>
                        <option value="">-- Unassigned --</option>
                        {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name || tm.username}</option>)}
                    </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary">Create Job</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateManualJobModal;