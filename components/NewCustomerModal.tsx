
import React, { useState } from 'react';
import { Customer } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';

interface NewCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id'>) => void;
}

const initialFormState = {
    name: '',
    contactName: '',
    address: '',
    mobile: '',
    email: '',
    website: '',
    companyReg: '',
    notes: ''
};

const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState(initialFormState);

    const handleFormChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.address.trim()) {
            alert('Please provide both a business name and an address.');
            return;
        }
        
        onSave({
            name: formData.name.trim(),
            contactName: formData.contactName.trim() || undefined,
            address: formData.address.trim(),
            mobile: formData.mobile.trim() || undefined,
            email: formData.email.trim() || undefined,
            website: formData.website.trim() || undefined,
            companyReg: formData.companyReg.trim() || undefined,
            notes: formData.notes.trim() || undefined,
        });
        setFormData(initialFormState);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Detailed Customer" size="2xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Business Name *</label>
                        <Input value={formData.name} onChange={e => handleFormChange('name', e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Contact Person</label>
                        <Input value={formData.contactName} onChange={e => handleFormChange('contactName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Mobile</label>
                        <Input value={formData.mobile} onChange={e => handleFormChange('mobile', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Address *</label>
                        <TextArea value={formData.address} onChange={e => handleFormChange('address', e.target.value)} rows={3} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <Input type="email" value={formData.email} onChange={e => handleFormChange('email', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Website</label>
                        <Input value={formData.website} onChange={e => handleFormChange('website', e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary">Save Customer</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NewCustomerModal;
