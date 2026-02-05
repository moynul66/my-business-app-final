import React, { useState, useMemo } from 'react';
import { Job, AppSettings } from '../types';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { WrenchScrewdriverIcon } from './icons/WrenchScrewdriverIcon';
import { Input } from './ui/Input';
import { PencilIcon } from './icons/PencilIcon';
import { FilterIcon } from './icons/FilterIcon';

interface JobManagerProps {
    jobs: Job[];
    settings: AppSettings;
    onLoadJob: (id: string) => void;
    onDeleteJob: (id: string) => void;
}

const JobManager: React.FC<JobManagerProps> = ({ jobs, settings, onLoadJob, onDeleteJob }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const currency = settings.currencySymbol || '£';

    const customerNames = useMemo(() => {
        const names = new Set(jobs.map(j => j.state.customerName));
        return Array.from(names);
    }, [jobs]);

    const filteredJobs = useMemo(() => {
        let filtered = [...jobs];

        // Customer filter
        if (filterCustomer) {
            filtered = filtered.filter(j => j.state.customerName.toLowerCase().includes(filterCustomer.toLowerCase()));
        }

        // Date range filter
        if (filterStartDate) {
            const start = new Date(filterStartDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(j => new Date(j.state.issueDate) >= start);
        }
        if (filterEndDate) {
            const end = new Date(filterEndDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(j => new Date(j.state.issueDate) <= end);
        }
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(job =>
                job.state.customerName.toLowerCase().includes(lowercasedTerm) ||
                job.state.jobNumber.toLowerCase().includes(lowercasedTerm) ||
                (job.state.reference && job.state.reference.toLowerCase().includes(lowercasedTerm))
            );
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [jobs, searchTerm, filterCustomer, filterStartDate, filterEndDate]);

    const clearFilters = () => {
        setFilterCustomer('');
        setFilterStartDate('');
        setFilterEndDate('');
        setSearchTerm('');
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-slate-800 mb-6">Manage Jobs</h2>
            <div className="mb-4">
                 <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                        placeholder="Search by job #, reference, or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow"
                    />
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto">
                        <FilterIcon className="w-5 h-5 mr-2" />
                        Filters
                    </Button>
                </div>
                 {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border">
                        <div>
                            <label className="text-sm font-medium text-slate-600">Customer</label>
                            <Input list="customer-names-job" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} placeholder="All customers" />
                            <datalist id="customer-names-job">
                                {customerNames.map(name => <option key={name} value={name} />)}
                            </datalist>
                        </div>
                         <div>
                            <label className="text-sm font-medium text-slate-600">From Date</label>
                            <Input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600">To Date</label>
                            <Input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" onClick={clearFilters} className="w-full">
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="max-h-[65vh] overflow-y-auto pr-2">
                {filteredJobs.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        {jobs.length === 0 ? (
                            <>
                                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500">No jobs saved yet.</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No jobs found for your search.</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px] space-y-3">
                            {filteredJobs.map(job => {
                                const profit = job.totalSale - job.totalCost;
                                const margin = job.totalSale > 0 ? (profit / job.totalSale) * 100 : 0;
                                return (
                                <div key={job.id} className="bg-slate-100 p-4 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-800">{job.name}</p>
                                            <p className="text-sm text-slate-500">
                                                Created on {new Date(job.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" onClick={() => onLoadJob(job.id)}>
                                                <PencilIcon className="w-4 h-4 mr-2"/>
                                                Load / Edit
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onDeleteJob(job.id)} title="Delete Job">
                                                <TrashIcon className="w-5 h-5 text-slate-500 hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-4 gap-4 text-sm">
                                        <p><strong>Sale:</strong> <span className="font-medium">{currency}{job.totalSale.toFixed(2)}</span></p>
                                        <p><strong>Cost:</strong> <span className="font-medium">{currency}{job.totalCost.toFixed(2)}</span></p>
                                        <p><strong>Profit:</strong> <span className="font-medium" style={{ color: profit >= 0 ? 'green' : 'red' }}>{currency}{profit.toFixed(2)}</span></p>
                                        <p><strong>Margin:</strong> <span className="font-medium">{margin.toFixed(2)}%</span></p>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobManager;