
import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';

interface SupplierFormPageProps {
    initialSupplier?: Supplier;
    onSave: (supplier: Omit<Supplier, 'id'>) => void;
    onUpdate: (supplier: Supplier) => void;
    onCancel: () => void;
}

const initialFormState = {
    name: '',
    address: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    vatNumber: '',
    notes: '',
    // Bank Details
    bankBusinessName: '',
    bankSortCode: '',
    bankAccountNumber: '',
};

const SupplierFormPage: React.FC<SupplierFormPageProps> = ({
    initialSupplier,
    onSave,
    onUpdate,
    onCancel
}) => {
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (initialSupplier) {
            setFormData({
                name: initialSupplier.name,
                address: initialSupplier.address,
                contactPerson: initialSupplier.contactPerson || '',
                email: initialSupplier.email || '',
                phone: initialSupplier.phone || '',
                website: initialSupplier.website || '',
                vatNumber: initialSupplier.vatNumber || '',
                notes: initialSupplier.notes || '',
                bankBusinessName: initialSupplier.bankDetails?.businessName || '',
                bankSortCode: initialSupplier.bankDetails?.sortCode || '',
                bankAccountNumber: initialSupplier.bankDetails?.accountNumber || '',
            });
        } else {
            setFormData(initialFormState);
        }
    }, [initialSupplier]);

    const handleFormChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.address.trim()) {
            alert('Please provide both a name and an address.');
            return;
        }
        
        const supplierData = {
            name: formData.name,
            address: formData.address,
            contactPerson: formData.contactPerson || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            website: formData.website || undefined,
            vatNumber: formData.vatNumber || undefined,
            notes: formData.notes || undefined,
            bankDetails: {
                businessName: formData.bankBusinessName,
                sortCode: formData.bankSortCode,
                accountNumber: formData.bankAccountNumber,
            }
        };

        if (initialSupplier) {
            onUpdate({ id: initialSupplier.id, ...supplierData });
        } else {
            onSave(supplierData);
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b pb-4">
                <h2 className="text-3xl font-bold text-slate-800">
                    {initialSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label htmlFor="supplierName" className="block text-sm font-medium text-slate-600">Supplier/Business Name *</label>
                        <Input id="supplierName" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} required placeholder="e.g. ABC Supplies Ltd"/>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="supplierAddress" className="block text-sm font-medium text-slate-600">Address *</label>
                        <TextArea id="supplierAddress" value={formData.address} onChange={(e) => handleFormChange('address', e.target.value)} rows={3} required placeholder="Full address..." />
                    </div>
                    <div>
                        <label htmlFor="supplierContact" className="block text-sm font-medium text-slate-600">Contact Person</label>
                        <Input id="supplierContact" value={formData.contactPerson} onChange={(e) => handleFormChange('contactPerson', e.target.value)} placeholder="e.g. Jane Smith" />
                    </div>
                     <div>
                        <label htmlFor="supplierPhone" className="block text-sm font-medium text-slate-600">Phone</label>
                        <Input id="supplierPhone" value={formData.phone} onChange={(e) => handleFormChange('phone', e.target.value)} placeholder="e.g. 01234 567890" />
                    </div>
                    <div>
                        <label htmlFor="supplierEmail" className="block text-sm font-medium text-slate-600">Email</label>
                        <Input id="supplierEmail" type="email" value={formData.email} onChange={(e) => handleFormChange('email', e.target.value)} placeholder="orders@abcsupplies.com" />
                    </div>
                    <div>
                        <label htmlFor="supplierWebsite" className="block text-sm font-medium text-slate-600">Website</label>
                        <Input id="supplierWebsite" value={formData.website} onChange={(e) => handleFormChange('website', e.target.value)} placeholder="www.abcsupplies.com" />
                    </div>
                    <div>
                        <label htmlFor="supplierVat" className="block text-sm font-medium text-slate-600">VAT Number</label>
                        <Input id="supplierVat" value={formData.vatNumber} onChange={(e) => handleFormChange('vatNumber', e.target.value)} placeholder="GB..." />
                    </div>
                    
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Bank Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div>
                                <label htmlFor="bankBusinessName" className="block text-sm font-medium text-slate-600">Business Name</label>
                                <Input id="bankBusinessName" value={formData.bankBusinessName} onChange={(e) => handleFormChange('bankBusinessName', e.target.value)} placeholder="Name on account" />
                            </div>
                            <div>
                                <label htmlFor="bankSortCode" className="block text-sm font-medium text-slate-600">Sort Code</label>
                                <Input id="bankSortCode" value={formData.bankSortCode} onChange={(e) => handleFormChange('bankSortCode', e.target.value)} placeholder="00-00-00" />
                            </div>
                            <div>
                                <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-slate-600">Account Details</label>
                                <Input id="bankAccountNumber" value={formData.bankAccountNumber} onChange={(e) => handleFormChange('bankAccountNumber', e.target.value)} placeholder="12345678" />
                            </div>
                        </div>
                    </div>

                     <div className="md:col-span-2">
                        <label htmlFor="supplierNotes" className="block text-sm font-medium text-slate-600">Notes</label>
                        <TextArea id="supplierNotes" value={formData.notes} onChange={(e) => handleFormChange('notes', e.target.value)} rows={3} placeholder="Internal notes, payment terms, etc." />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        {initialSupplier ? <PencilIcon className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
                        {initialSupplier ? 'Update Supplier' : 'Add Supplier'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default SupplierFormPage;
