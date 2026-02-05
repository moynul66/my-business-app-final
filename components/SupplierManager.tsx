
import React, { useState, useMemo, useRef } from 'react';
import { Supplier, User } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TruckIcon } from './icons/TruckIcon';
import { PencilIcon } from './icons/PencilIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { exportToCsv, parseCsv } from '../services/csvService';

interface SupplierManagerProps {
    suppliers: Supplier[];
    currentUser: User;
    onRemoveSupplier: (id: string) => void;
    onImportSuppliers: (suppliers: Supplier[]) => void;
    onNavigateToAdd: () => void;
    onNavigateToEdit: (supplier: Supplier) => void;
}

const SupplierManager: React.FC<SupplierManagerProps> = ({
    suppliers,
    currentUser,
    onRemoveSupplier,
    onImportSuppliers,
    onNavigateToAdd,
    onNavigateToEdit
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (window.confirm("Are you sure you want to import this file? This will overwrite all existing suppliers. This action cannot be undone.")) {
            try {
                const parsedData = await parseCsv<Supplier>(file);
                onImportSuppliers(parsedData);
            } catch (error) {
                console.error("Failed to parse CSV", error);
                alert("Failed to import suppliers. The file might be corrupted or in the wrong format.");
            }
        }
        event.target.value = ''; // Reset input
    };

    const filteredSuppliers = useMemo(() => {
        if (!searchTerm) {
            return suppliers;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return suppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(lowercasedTerm) ||
            supplier.address.toLowerCase().includes(lowercasedTerm) ||
            (supplier.email && supplier.email.toLowerCase().includes(lowercasedTerm)) ||
            (supplier.phone && supplier.phone.toLowerCase().includes(lowercasedTerm))
        );
    }, [suppliers, searchTerm]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-slate-800">All Suppliers</h2>
                 <div className="flex gap-2">
                    <Button variant="primary" onClick={onNavigateToAdd}>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Supplier
                    </Button>
                    {!currentUser.subscriptionStatus.startsWith('trial_') && (
                        <>
                            <Button variant="outline" onClick={() => exportToCsv('suppliers-backup.csv', suppliers)}>
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                Export
                            </Button>
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <UploadIcon className="w-5 h-5 mr-2" />
                                Import
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileImport}
                                accept=".csv"
                                style={{ display: 'none' }}
                            />
                        </>
                    )}
                </div>
            </div>
            
            <div className="mb-6">
                <Input 
                    placeholder="Search by name, address, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                />
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div className="max-h-[65vh] overflow-y-auto">
                    {suppliers.length === 0 ? (
                        <div className="text-center py-16">
                                <TruckIcon className="mx-auto h-16 w-16 text-slate-300" />
                            <p className="mt-4 text-lg text-slate-500">No suppliers saved yet.</p>
                            <Button variant="primary" onClick={onNavigateToAdd} className="mt-4">
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Add Your First Supplier
                            </Button>
                        </div>
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-lg text-slate-500">No suppliers found matching your search.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-sm font-semibold text-slate-600 sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 border-b">Supplier Name</th>
                                    <th className="p-4 border-b hidden md:table-cell">Contact</th>
                                    <th className="p-4 border-b hidden sm:table-cell">Details</th>
                                    <th className="p-4 border-b text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredSuppliers.map(supplier => (
                                    <tr key={supplier.id} className="hover:bg-white transition-colors">
                                        <td className="p-4 align-top">
                                            <p className="font-semibold text-slate-800">{supplier.name}</p>
                                            <p className="text-sm text-slate-500 whitespace-pre-wrap sm:hidden">{supplier.address}</p>
                                        </td>
                                        <td className="p-4 align-top hidden md:table-cell">
                                            {supplier.contactPerson && <p className="text-sm text-slate-800">{supplier.contactPerson}</p>}
                                            {supplier.email && <p className="text-sm text-slate-500">{supplier.email}</p>}
                                            {supplier.phone && <p className="text-sm text-slate-500">{supplier.phone}</p>}
                                        </td>
                                        <td className="p-4 align-top hidden sm:table-cell">
                                            <p className="text-sm text-slate-600 whitespace-pre-wrap max-w-xs">{supplier.address}</p>
                                            {supplier.vatNumber && <p className="text-xs text-slate-500 mt-1">VAT: {supplier.vatNumber}</p>}
                                        </td>
                                        <td className="p-4 align-top text-right">
                                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                                                <Button variant="outline" className="!py-1 !px-2 text-xs w-full sm:w-auto" onClick={() => onNavigateToEdit(supplier)} title="Edit supplier">
                                                    <PencilIcon className="w-4 h-4 mr-1.5" />
                                                    Edit
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => onRemoveSupplier(supplier.id)} title="Delete supplier" className="hidden sm:inline-flex">
                                                    <TrashIcon className="w-5 h-5 text-slate-400 hover:text-red-500" />
                                                </Button>
                                                <Button variant="danger" className="!py-1 !px-2 text-xs w-full sm:hidden" onClick={() => onRemoveSupplier(supplier.id)}>
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupplierManager;
