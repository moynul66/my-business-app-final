import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface DeadlineEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (value: { startDate: string; endDate: string }) => void;
    initialValue?: { startDate?: string; endDate?: string };
}

const DeadlineEditModal: React.FC<DeadlineEditModalProps> = ({ isOpen, onClose, onSave, initialValue }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStartDate(initialValue?.startDate || '');
            setEndDate(initialValue?.endDate || '');
        }
    }, [isOpen, initialValue]);

    const handleSave = () => {
        if (!startDate || !endDate) {
            alert('Please select both a start and end date.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('End date cannot be before the start date.');
            return;
        }
        onSave({ startDate, endDate });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Set Deadline"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save</Button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">Start Date</label>
                    <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">End Date</label>
                    <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>
        </Modal>
    );
};

export default DeadlineEditModal;
