import React, { useState, useMemo } from 'react';
import { DailyTaking, AppSettings, Customer } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { PlusIcon } from './icons/PlusIcon';
import { CurrencyPoundIcon } from './icons/CurrencyPoundIcon';
import { TrashIcon } from './icons/TrashIcon';
import CustomerSearchModal from './CustomerSearchModal';
import { SearchIcon } from './icons/SearchIcon';
import { PencilIcon } from './icons/PencilIcon';

interface DailyTakingsManagerProps {
    dailyTakings: DailyTaking[];
    settings: AppSettings;
    customers: Customer[];
    onAddTaking: (taking: Omit<DailyTaking, 'id'>) => void;
    onUpdateTaking: (taking: DailyTaking) => void;
    onRemoveTaking: (takingId: string) => void;
    onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
}

const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    businessName: '',
    details: '',
    type: 'Card' as 'Cash' | 'Card',
    amount: 0,
};

const DailyTakingsManager: React.FC<DailyTakingsManagerProps> = ({
    dailyTakings,
    settings,
    customers,
    onAddTaking,
    onUpdateTaking,
    onRemoveTaking,
    onAddCustomer,
}) => {
    const [formData, setFormData] = useState(initialFormState);
    const [editingTakingId, setEditingTakingId] = useState<string | null>(null);
    const [isCustomerSearchModalOpen, setCustomerSearchModalOpen] = useState(false);
    const [activeView, setActiveView] = useState<'record' | 'summary'>('record');
    const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchDate, setSearchDate] = useState('');
    const [searchBusinessName, setSearchBusinessName] = useState('');

    const currency = settings.currencySymbol || '£';
    const formatCurrency = (amount: number) => `${currency}${amount.toFixed(2)}`;

    const handleFormChange = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || formData.amount <= 0 || !formData.details.trim() || !formData.businessName.trim()) {
            alert('Please provide a business name, details, and an amount greater than zero.');
            return;
        }
        
        if (editingTakingId) {
            onUpdateTaking({ id: editingTakingId, ...formData });
        } else {
            onAddTaking(formData);
        }
        
        setFormData(prev => ({
            ...initialFormState,
            date: prev.date, 
        }));
        setEditingTakingId(null);
    };

    const filteredTakings = useMemo(() => {
        return [...dailyTakings]
            .filter(taking => {
                const dateMatch = !searchDate || taking.date === searchDate;
                const nameMatch = !searchBusinessName || taking.businessName.toLowerCase().includes(searchBusinessName.toLowerCase());
                return dateMatch && nameMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyTakings, searchDate, searchBusinessName]);
    
    const handleDelete = (takingId: string) => {
        if (window.confirm('Are you sure you want to delete this taking?')) {
            onRemoveTaking(takingId);
        }
    };

    const handleStartEdit = (taking: DailyTaking) => {
        setEditingTakingId(taking.id);
        setFormData({
            date: taking.date,
            businessName: taking.businessName,
            details: taking.details,
            type: taking.type,
            amount: taking.amount,
        });
        window.scrollTo(0, 0);
    };

    const handleSelectCustomerFromSearch = (customer: Customer) => {
        handleFormChange('businessName', customer.name);
        setCustomerSearchModalOpen(false);
    };

    const handleSaveNewCustomer = () => {
        onAddCustomer({
            name: formData.businessName.trim(),
            address: 'Please update address in Customer Manager'
        });
    };

    const isNewCustomer = formData.businessName.trim() !== '' && !customers.some(c => c.name.toLowerCase() === formData.businessName.toLowerCase().trim());

    const { periodTotals, dailyBreakdown } = useMemo(() => {
        const targetDate = new Date(selectedDate);
        targetDate.setUTCHours(0, 0, 0, 0);

        let startDate: Date;
        let endDate: Date;

        switch (filterType) {
            case 'weekly':
                const dayOfWeek = targetDate.getUTCDay();
                startDate = new Date(targetDate);
                startDate.setUTCDate(targetDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday as start of week
                endDate = new Date(startDate);
                endDate.setUTCDate(startDate.getUTCDate() + 6);
                break;
            case 'monthly':
                startDate = new Date(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1);
                endDate = new Date(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0);
                break;
            case 'daily':
            default:
                startDate = targetDate;
                endDate = new Date(targetDate);
                break;
        }

        endDate.setUTCHours(23, 59, 59, 999);

        const filtered = dailyTakings.filter(taking => {
            const takingDate = new Date(taking.date);
            return takingDate >= startDate && takingDate <= endDate;
        });

        const totals = filtered.reduce(
            (acc, taking) => {
                if (taking.type === 'Cash') acc.cash += taking.amount;
                if (taking.type === 'Card') acc.card += taking.amount;
                acc.total += taking.amount;
                return acc;
            },
            { cash: 0, card: 0, total: 0 }
        );

        const breakdown = filtered.reduce((acc, taking) => {
            const dateKey = taking.date;
            if (!acc[dateKey]) {
                acc[dateKey] = { cash: 0, card: 0, total: 0 };
            }
            if (taking.type === 'Cash') acc[dateKey].cash += taking.amount;
            if (taking.type === 'Card') acc[dateKey].card += taking.amount;
            acc[dateKey].total += taking.amount;
            return acc;
        }, {} as Record<string, { cash: number; card: number; total: number }>);
        
        const sortedBreakdown = Object.entries(breakdown).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());

        return { periodTotals: totals, dailyBreakdown: sortedBreakdown };
    }, [dailyTakings, filterType, selectedDate]);


    const renderRecordView = () => (
        <>
            <div>
                <h3 className="text-lg font-medium mb-4 text-slate-900">{editingTakingId ? 'Edit Taking' : 'Record a Taking'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg">
                    <div className="md:col-span-2">
                        <label htmlFor="takingDate" className="block text-sm font-medium text-slate-600 mb-1">Date</label>
                        <Input id="takingDate" type="date" value={formData.date} onChange={(e) => handleFormChange('date', e.target.value)} required />
                    </div>
                    <div className="md:col-span-3 lg:col-span-4">
                        <label htmlFor="businessName" className="block text-sm font-medium text-slate-600 mb-1">Business Name</label>
                         <div className="flex items-start gap-2">
                            <div className="flex-grow">
                                <Input
                                    id="businessName"
                                    value={formData.businessName}
                                    onChange={(e) => handleFormChange('businessName', e.target.value)}
                                    required
                                    placeholder="Search or type new..."
                                />
                                {isNewCustomer && <p className="text-xs text-slate-500 mt-1">New customer. Click '+' to save.</p>}
                            </div>
                            <Button type="button" size="icon" variant="outline" onClick={() => setCustomerSearchModalOpen(true)} title="Search for existing customer">
                                <SearchIcon className="w-5 h-5" />
                            </Button>
                            {isNewCustomer && (
                                <Button type="button" size="icon" variant="primary" onClick={handleSaveNewCustomer} title="Save new customer">
                                    <PlusIcon className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="takingDetails" className="block text-sm font-medium text-slate-600 mb-1">Job Details</label>
                        <Input id="takingDetails" value={formData.details} onChange={(e) => handleFormChange('details', e.target.value)} required />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="takingType" className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                        <Select id="takingType" value={formData.type} onChange={(e) => handleFormChange('type', e.target.value as 'Cash' | 'Card')} required>
                            <option value="Card">Card</option>
                            <option value="Cash">Cash</option>
                        </Select>
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="takingAmount" className="block text-sm font-medium text-slate-600 mb-1">Amount ({currency})</label>
                        <Input id="takingAmount" type="number" step="0.01" value={formData.amount || ''} onChange={(e) => handleFormChange('amount', parseFloat(e.target.value) || 0)} required />
                    </div>
                    <div className="md:col-span-1 lg:col-span-1 flex flex-col gap-2">
                        <Button type="submit" variant="primary" className="w-full justify-center">
                            {editingTakingId ? <PencilIcon className="w-5 h-5 md:mr-2" /> : <PlusIcon className="w-5 h-5 md:mr-2" />}
                            <span className="hidden md:inline">{editingTakingId ? 'Update' : 'Add'}</span>
                        </Button>
                        {editingTakingId && (
                            <Button type="button" variant="outline" onClick={() => {
                                setEditingTakingId(null);
                                setFormData(prev => ({ ...initialFormState, date: prev.date }));
                            }}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            </div>
            
            <div className="mt-8">
                <h3 className="text-lg font-medium mb-4 text-slate-900">Recorded Takings</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-lg mb-4">
                    <div>
                        <label htmlFor="searchDate" className="block text-sm font-medium text-slate-600 mb-1">Filter by Date</label>
                        <Input id="searchDate" type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="searchBusinessName" className="block text-sm font-medium text-slate-600 mb-1">Filter by Business Name</label>
                        <Input id="searchBusinessName" value={searchBusinessName} onChange={(e) => setSearchBusinessName(e.target.value)} placeholder="Search name..." />
                    </div>
                    <div>
                        <Button variant="outline" onClick={() => { setSearchDate(''); setSearchBusinessName(''); }} className="w-full">
                            Clear Filters
                        </Button>
                    </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {dailyTakings.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                            <CurrencyPoundIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500">No takings recorded yet.</p>
                        </div>
                    ) : filteredTakings.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                            <p className="mt-2 text-sm text-slate-500">No takings found for the selected filters.</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-left table-auto min-w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr className="text-sm text-slate-600">
                                        <th className="p-3 font-semibold">Date</th>
                                        <th className="p-3 font-semibold">Business Name</th>
                                        <th className="p-3 font-semibold">Job Details</th>
                                        <th className="p-3 font-semibold">Transaction Type</th>
                                        <th className="p-3 font-semibold text-right">Amount</th>
                                        <th className="p-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTakings.map(taking => (
                                        <tr key={taking.id} className="border-b last:border-b-0 hover:bg-slate-50 text-sm text-slate-800">
                                            <td className="p-3 whitespace-nowrap">{new Date(taking.date).toLocaleDateString()}</td>
                                            <td className="p-3">{taking.businessName}</td>
                                            <td className="p-3 whitespace-pre-wrap">{taking.details}</td>
                                            <td className="p-3">{taking.type}</td>
                                            <td className="p-3 text-right font-medium whitespace-nowrap">{currency}{taking.amount.toFixed(2)}</td>
                                            <td className="p-3 text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleStartEdit(taking)} title="Edit taking">
                                                    <PencilIcon className="w-5 h-5 text-slate-400 hover:text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(taking.id)} title="Delete taking">
                                                    <TrashIcon className="w-5 h-5 text-slate-400 hover:text-red-500" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    const renderSummaryView = () => (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-lg items-end">
                <div className="flex p-1 bg-white rounded-lg">
                    <Button variant={filterType === 'daily' ? 'primary' : 'ghost'} className="w-full" onClick={() => setFilterType('daily')}>Daily</Button>
                    <Button variant={filterType === 'weekly' ? 'primary' : 'ghost'} className="w-full" onClick={() => setFilterType('weekly')}>Weekly</Button>
                    <Button variant={filterType === 'monthly' ? 'primary' : 'ghost'} className="w-full" onClick={() => setFilterType('monthly')}>Monthly</Button>
                </div>
                <div>
                    <label htmlFor="summaryDate" className="block text-sm font-medium text-slate-600 mb-1">
                        {filterType === 'daily' ? 'Select Day' : filterType === 'weekly' ? 'Select Week' : 'Select Month'}
                    </label>
                    <Input id="summaryDate" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-blue-700">Total Card</p>
                    <p className="text-3xl font-bold text-blue-900">{formatCurrency(periodTotals.card)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-green-700">Total Cash</p>
                    <p className="text-3xl font-bold text-green-900">{formatCurrency(periodTotals.cash)}</p>
                </div>
                <div className="bg-slate-200 p-4 rounded-lg text-center">
                    <p className="text-sm font-medium text-slate-700">Overall Total</p>
                    <p className="text-3xl font-bold text-slate-900">{formatCurrency(periodTotals.total)}</p>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium mb-4 text-slate-900">Daily Breakdown</h3>
                <div className="max-h-[50vh] overflow-y-auto pr-2">
                    {dailyBreakdown.length === 0 ? (
                         <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                            <p className="mt-2 text-sm text-slate-500">No takings found for the selected period.</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-left table-auto min-w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr className="text-sm text-slate-600">
                                        <th className="p-3 font-semibold">Date</th>
                                        <th className="p-3 font-semibold text-right">Total Card</th>
                                        <th className="p-3 font-semibold text-right">Total Cash</th>
                                        <th className="p-3 font-semibold text-right">Daily Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyBreakdown.map(([date, totals]) => (
                                        <tr key={date} className="border-b last:border-b-0 hover:bg-slate-50 text-sm text-slate-800">
                                            <td className="p-3 font-medium whitespace-nowrap">{new Date(date).toLocaleDateString()}</td>
                                            <td className="p-3 text-right whitespace-nowrap">{formatCurrency(totals.card)}</td>
                                            <td className="p-3 text-right whitespace-nowrap">{formatCurrency(totals.cash)}</td>
                                            <td className="p-3 text-right font-bold whitespace-nowrap">{formatCurrency(totals.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h2 className="text-3xl font-bold text-slate-800">Daily Takings</h2>
                 <div className="flex p-1 bg-slate-100 rounded-lg">
                    <Button variant={activeView === 'record' ? 'primary' : 'ghost'} onClick={() => setActiveView('record')}>
                        Record Takings
                    </Button>
                    <Button variant={activeView === 'summary' ? 'primary' : 'ghost'} onClick={() => setActiveView('summary')}>
                        Summary
                    </Button>
                </div>
            </div>
            
            {activeView === 'record' ? renderRecordView() : renderSummaryView()}

        </div>
        <CustomerSearchModal
            isOpen={isCustomerSearchModalOpen}
            onClose={() => setCustomerSearchModalOpen(false)}
            customers={customers}
            onSelectCustomer={handleSelectCustomerFromSearch}
        />
        </>
    );
};

export default DailyTakingsManager;