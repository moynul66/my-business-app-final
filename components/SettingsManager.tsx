// fix: Implemented the SettingsManager component to manage application settings.
import React, { useState, useEffect } from 'react';
import { AppSettings, User } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { Select } from './ui/Select';

interface SettingsManagerProps {
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
    onCancel: () => void;
    currentUser: User;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({ settings, onSave, onCancel, currentUser }) => {
    const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);
    
    const canEdit = currentUser.role === 'admin' || currentUser.role === 'master' || currentUser.permissions?.settings === 'edit';

    useEffect(() => {
        setCurrentSettings(prev => ({
            ...settings,
            nextJobNumber: settings.nextJobNumber || 1,
            nextCreditNoteNumber: settings.nextCreditNoteNumber || 1,
        }));
    }, [settings]);

    const handleChange = (field: keyof AppSettings, value: string | number) => {
        setCurrentSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleChange('companyLogo', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        handleChange('companyLogo', '');
    };
    
    const handleSave = () => {
        onSave(currentSettings);
    };

    const placeholders = ['[CustomerName]', '[InvoiceNumber]', '[TotalAmount]', '[DueDate]', '[CompanyName]'];

    return (
         <div className="bg-white p-8 rounded-lg shadow-lg">
             <h2 className="text-3xl font-bold mb-6 text-slate-800">Settings</h2>
            <fieldset disabled={!canEdit} className="space-y-8">
                {/* Company & Document Settings */}
                <div className="p-6 rounded-lg border border-slate-200">
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">Company & Document Settings</h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="companyName" className="block text-sm font-medium text-slate-600">Company Name</label>
                                <Input id="companyName" value={currentSettings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="companyRegistrationNumber" className="block text-sm font-medium text-slate-600">Company Registration Number</label>
                                <Input id="companyRegistrationNumber" value={currentSettings.companyRegistrationNumber || ''} onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="invoiceTitle" className="block text-sm font-medium text-slate-600">Invoice Title</label>
                                <Input id="invoiceTitle" value={currentSettings.invoiceTitle || ''} onChange={(e) => handleChange('invoiceTitle', e.target.value)} placeholder="e.g., INVOICE" />
                            </div>
                             <div>
                                <label htmlFor="quoteTitle" className="block text-sm font-medium text-slate-600">Quote Title</label>
                                <Input id="quoteTitle" value={currentSettings.quoteTitle || ''} onChange={(e) => handleChange('quoteTitle', e.target.value)} placeholder="e.g., QUOTE" />
                            </div>
                             <div>
                                <label htmlFor="nextInvoiceNumber" className="block text-sm font-medium text-slate-600">Next Invoice Number</label>
                                <Input id="nextInvoiceNumber" type="number" value={currentSettings.nextInvoiceNumber || 1} onChange={(e) => handleChange('nextInvoiceNumber', parseInt(e.target.value, 10) || 1)} className="no-spinners" />
                            </div>
                             <div>
                                <label htmlFor="nextQuoteNumber" className="block text-sm font-medium text-slate-600">Next Quote Number</label>
                                <Input id="nextQuoteNumber" type="number" value={currentSettings.nextQuoteNumber || 1} onChange={(e) => handleChange('nextQuoteNumber', parseInt(e.target.value, 10) || 1)} className="no-spinners" />
                            </div>
                             <div>
                                <label htmlFor="nextCreditNoteNumber" className="block text-sm font-medium text-slate-600">Next Credit Note Number</label>
                                <Input id="nextCreditNoteNumber" type="number" value={currentSettings.nextCreditNoteNumber || 1} onChange={(e) => handleChange('nextCreditNoteNumber', parseInt(e.target.value, 10) || 1)} className="no-spinners" />
                            </div>
                            <div>
                                <label htmlFor="nextJobNumber" className="block text-sm font-medium text-slate-600">Next Job Number</label>
                                <Input id="nextJobNumber" type="number" value={currentSettings.nextJobNumber || 1} onChange={(e) => handleChange('nextJobNumber', parseInt(e.target.value, 10) || 1)} className="no-spinners" />
                            </div>
                             <div>
                                <label htmlFor="poPrefix" className="block text-sm font-medium text-slate-600">Purchase Order Prefix</label>
                                <Input id="poPrefix" value={currentSettings.poPrefix || ''} onChange={(e) => handleChange('poPrefix', e.target.value)} placeholder="e.g., PO" />
                            </div>
                            <div>
                                <label htmlFor="nextPoNumber" className="block text-sm font-medium text-slate-600">Next Purchase Order Number</label>
                                <Input id="nextPoNumber" type="number" value={currentSettings.nextPoNumber || 1} onChange={(e) => handleChange('nextPoNumber', parseInt(e.target.value, 10) || 1)} className="no-spinners" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="companyAddress" className="block text-sm font-medium text-slate-600">Company Address</label>
                            <TextArea id="companyAddress" value={currentSettings.companyAddress} onChange={(e) => handleChange('companyAddress', e.target.value)} rows={3} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600">Company Logo</label>
                            <div className="mt-2 flex items-center gap-4">
                                {currentSettings.companyLogo ? (
                                    <>
                                        <img src={currentSettings.companyLogo} alt="Company Logo" className="h-16 w-auto rounded border p-1" />
                                        <Button variant="outline" onClick={handleRemoveLogo}>Remove Logo</Button>
                                    </>
                                ) : (
                                    <Input 
                                        type="file" 
                                        accept="image/png, image/jpeg" 
                                        onChange={handleLogoUpload} 
                                        className="!p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Settings */}
                <div className="p-6 rounded-lg border border-slate-200">
                     <h3 className="text-xl font-semibold text-slate-800 mb-4">Financial Settings</h3>
                     <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="vatNumber" className="block text-sm font-medium text-slate-600">VAT Number</label>
                                <Input id="vatNumber" value={currentSettings.vatNumber} onChange={(e) => handleChange('vatNumber', e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="defaultVatRate" className="block text-sm font-medium text-slate-600">Default VAT Rate (%)</label>
                                <Input id="defaultVatRate" type="number" value={currentSettings.defaultVatRate} onChange={(e) => handleChange('defaultVatRate', parseFloat(e.target.value) || 0)} className="no-spinners" />
                            </div>
                            <div>
                                <label htmlFor="currencySymbol" className="block text-sm font-medium text-slate-600">Currency</label>
                                <Select id="currencySymbol" value={currentSettings.currencySymbol || '£'} onChange={(e) => handleChange('currencySymbol', e.target.value)}>
                                    <option value="£">GBP (£)</option>
                                    <option value="$">USD ($)</option>
                                    <option value="€">EUR (€)</option>
                                    <option value="¥">JPY (¥)</option>
                                    <option value="₹">INR (₹)</option>
                                </Select>
                            </div>
                            <div>
                                <label htmlFor="bankName" className="block text-sm font-medium text-slate-600">Bank Name</label>
                                <Input id="bankName" value={currentSettings.bankName} onChange={(e) => handleChange('bankName', e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="accountNumber" className="block text-sm font-medium text-slate-600">Account Number</label>
                                <Input id="accountNumber" value={currentSettings.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="sortCode" className="block text-sm font-medium text-slate-600">Sort Code</label>
                                <Input id="sortCode" value={currentSettings.sortCode} onChange={(e) => handleChange('sortCode', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="paymentTerms" className="block text-sm font-medium text-slate-600">Payment Terms / Notes</label>
                            <TextArea id="paymentTerms" value={currentSettings.paymentTerms} onChange={(e) => handleChange('paymentTerms', e.target.value)} rows={3} />
                        </div>
                     </div>
                </div>

                 {/* Email Settings */}
                <div className="p-6 rounded-lg border border-slate-200">
                     <h3 className="text-xl font-semibold text-slate-800 mb-4">Email Settings</h3>
                     <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="emailFromName" className="block text-sm font-medium text-slate-600">"From" Name</label>
                                <Input id="emailFromName" value={currentSettings.emailFromName || ''} onChange={(e) => handleChange('emailFromName', e.target.value)} placeholder="The name customers will see" />
                            </div>
                            <div>
                                <label htmlFor="emailReplyTo" className="block text-sm font-medium text-slate-600">"Reply-To" Email</label>
                                <Input id="emailReplyTo" type="email" value={currentSettings.emailReplyTo || ''} onChange={(e) => handleChange('emailReplyTo', e.target.value)} placeholder="your-email@example.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="invoiceEmailSubject" className="block text-sm font-medium text-slate-600">Invoice Email Subject</label>
                                <Input id="invoiceEmailSubject" value={currentSettings.invoiceEmailSubject || ''} onChange={(e) => handleChange('invoiceEmailSubject', e.target.value)} />
                            </div>
                             <div>
                                <label htmlFor="quoteEmailSubject" className="block text-sm font-medium text-slate-600">Quote Email Subject</label>
                                <Input id="quoteEmailSubject" value={currentSettings.quoteEmailSubject || ''} onChange={(e) => handleChange('quoteEmailSubject', e.target.value)} />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="invoiceEmailBody" className="block text-sm font-medium text-slate-600">Invoice Email Body</label>
                            <TextArea id="invoiceEmailBody" value={currentSettings.invoiceEmailBody || ''} onChange={(e) => handleChange('invoiceEmailBody', e.target.value)} rows={5} />
                        </div>
                        <div>
                            <label htmlFor="quoteEmailBody" className="block text-sm font-medium text-slate-600">Quote Email Body</label>
                            <TextArea id="quoteEmailBody" value={currentSettings.quoteEmailBody || ''} onChange={(e) => handleChange('quoteEmailBody', e.target.value)} rows={5} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Available placeholders:</p>
                            <div className="flex flex-wrap gap-x-2 text-xs text-slate-600">
                                {placeholders.map(p => <code key={p} className="bg-slate-200 px-1 py-0.5 rounded">{p}</code>)}
                            </div>
                        </div>
                     </div>
                </div>

            </fieldset>
            <div className="mt-8 pt-6 border-t flex justify-end gap-2">
                 <Button variant="outline" onClick={onCancel}>Cancel</Button>
                 {canEdit && <Button variant="primary" onClick={handleSave}>Save Settings</Button>}
            </div>
        </div>
    );
};

export default SettingsManager;