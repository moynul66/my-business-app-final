import React, { useState } from 'react';
import { TrackedJob, User, ActivityLogEntry } from '../types';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { XIcon } from './icons/XIcon';

interface ActivityLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: TrackedJob | null;
    currentUser: User;
    onSaveLog: (updatedLog: ActivityLogEntry[]) => void;
}

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose, job, currentUser, onSaveLog }) => {
    const [newUpdate, setNewUpdate] = useState('');

    if (!isOpen || !job) return null;

    const handlePostUpdate = () => {
        if (!newUpdate.trim()) return;

        const newEntry: ActivityLogEntry = {
            userId: currentUser.id,
            username: currentUser.name || currentUser.username,
            timestamp: new Date().toISOString(),
            update: newUpdate.trim(),
        };

        const updatedLog = [...(job.activityLog || []), newEntry];
        onSaveLog(updatedLog);
        setNewUpdate('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black bg-opacity-70" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-900">Activity Log for "{job.description}"</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-4 pr-2 mb-4 border-b pb-4">
                        {(job.activityLog || []).length === 0 ? (
                            <p className="text-slate-500 text-center py-4">No activity yet.</p>
                        ) : (
                            [...(job.activityLog || [])].reverse().map((entry, index) => (
                                <div key={index} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                                        <span className="font-semibold">{entry.username}</span>
                                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.update}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div>
                        <h4 className="font-semibold text-slate-800 mb-2">Add New Update</h4>
                        <TextArea
                            value={newUpdate}
                            onChange={e => setNewUpdate(e.target.value)}
                            rows={3}
                            placeholder="Type your update here..."
                        />
                        <div className="flex justify-end mt-2">
                            <Button onClick={handlePostUpdate} disabled={!newUpdate.trim()}>Post Update</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogModal;
