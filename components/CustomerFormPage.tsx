
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';

interface CustomerFormPageProps {
    initialCustomer?: Customer;
    onSave: (customer: Omit<Customer, 'id'>) => void;
    onUpdate: (customer: Customer) => void;
    onCancel: () => void;
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

const CustomerFormPage: React.FC<CustomerFormPageProps> = ({
    initialCustomer,
    onSave,
    onUpdate,
    onCancel
}) => {
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (initialCustomer) {
            setFormData({
                name: initialCustomer.name,
                contactName: initialCustomer.contactName || '',
                address: initialCustomer.address,
                mobile: initialCustomer.mobile || '',
                email: initialCustomer.email || '',
                website: initialCustomer.website || '',
                companyReg: initialCustomer.companyReg || '',
                notes: initialCustomer.notes || ''
            });
        } else {
            setFormData(initialFormState);
        }
    }, [initialCustomer]);

    const handleFormChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.address.trim()) {
            alert('Please provide both a business name and an address.');
            return;
        }
        
        const customerData = {
            name: formData.name,
            contactName: formData.contactName || undefined,
            address: formData.address,
            mobile: formData.mobile || undefined,
            email: formData.email || undefined,
            website: formData.website || undefined,
            companyReg: formData.companyReg || undefined,
            notes: formData.notes || undefined
        };

        if (initialCustomer) {
            onUpdate({ id: initialCustomer.id, ...customerData });
        } else {
            onSave(customerData);
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-4">
                <h2 className="text-3xl font-bold text-slate-800">
                    {initialCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label htmlFor="customerName" className="block text-sm font-medium text-slate-600">Business Name *</label>
                        <Input id="customerName" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} required placeholder="e.g. Acme Corp" />
                    </div>
                    <div>
                        <label htmlFor="contactName" className="block text-sm font-medium text-slate-600">Contact Name (Optional)</label>
                        <Input id="contactName" value={formData.contactName} onChange={(e) => handleFormChange('contactName', e.target.value)} placeholder="e.g. John Doe" />
                    </div>
                    <div>
                        <label htmlFor="customerMobile" className="block text-sm font-medium text-slate-600">Mobile</label>
                        <Input id="customerMobile" value={formData.mobile} onChange={(e) => handleFormChange('mobile', e.target.value)} placeholder="e.g. 07700 900000" />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="customerAddress" className="block text-sm font-medium text-slate-600">Address *</label>
                        <TextArea id="customerAddress" value={formData.address} onChange={(e) => handleFormChange('address', e.target.value)} rows={3} required placeholder="Full business address..." />
                    </div>
                    <div>
                        <label htmlFor="customerEmail" className="block text-sm font-medium text-slate-600">Email</label>
                        <Input id="customerEmail" type="email" value={formData.email} onChange={(e) => handleFormChange('email', e.target.value)} placeholder="contact@example.com" />
                    </div>
                    <div>
                        <label htmlFor="customerWebsite" className="block text-sm font-medium text-slate-600">Website</label>
                        <Input id="customerWebsite" value={formData.website} onChange={(e) => handleFormChange('website', e.target.value)} placeholder="www.example.com" />
                    </div>
                    <div>
                        <label htmlFor="customerCompanyReg" className="block text-sm font-medium text-slate-600">Company Reg #</label>
                        <Input id="customerCompanyReg" value={formData.companyReg} onChange={(e) => handleFormChange('companyReg', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="customerNotes" className="block text-sm font-medium text-slate-600">Notes</label>
                        <TextArea id="customerNotes" value={formData.notes} onChange={(e) => handleFormChange('notes', e.target.value)} rows={3} placeholder="Internal notes..." />
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        {initialCustomer ? <PencilIcon className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
                        {initialCustomer ? 'Update Customer' : 'Save Customer'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CustomerFormPage;
