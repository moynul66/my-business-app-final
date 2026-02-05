
import React, { useState, useMemo } from 'react';
import { TrackedJob, User, TrackedJobPriority, TrackedJobStatus, TaskColumn, TaskGroup, InvoiceLineItem, Category } from '../types';
import TrackedJobCard from './TrackedJobCard';
import EditTrackedJobModal from './EditTrackedJobModal';
import { Button } from './ui/Button';
import { FilterIcon } from './icons/FilterIcon';
import { Input } from './ui/Input';
import { PlusIcon } from './icons/PlusIcon';
import CreateManualJobModal from './CreateManualJobModal';
import { Select } from './ui/Select';
import TasksView from './TasksView';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { TrashIcon } from './icons/TrashIcon';

interface JobBoardProps {
    jobs: TrackedJob[];
    onUpdateJob: (job: TrackedJob) => void;
    onDeleteTrackedJob: (jobId: string) => void;
    onCreateJob: (jobData: { customerName: string; description: string; dueDate: string; priority: TrackedJobPriority; assignedTeamMemberId?: string; masterId: string; }) => void;
    onCreateQuoteFromJobs: (customerName: string, lineItems: InvoiceLineItem[]) => void;
    users: User[];
    currentUser: User;
    taskColumns: TaskColumn[];
    setTaskColumns: React.Dispatch<React.SetStateAction<TaskColumn[]>>;
    // New Group-based props
    customTaskGroups: TaskGroup[];
    onUpdateCustomTask: (groupId: string, task: TrackedJob) => void;
    onCreateCustomTask: (groupId: string | undefined, taskData: Omit<TrackedJob, 'id' | 'createdAt'>) => void;
    onDeleteCustomTask: (groupId: string, taskId: string) => void;
    onAddCustomGroup: (afterGroupId?: string) => void;
    onDeleteGroup: (groupId: string) => void;
    onUpdateGroup: (groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'isCollapsed' | 'color'>>) => void;
    onUpdateGroupColumns: (groupId: string, newColumns: TaskColumn[]) => void;
    onDuplicateGroup: (groupId: string) => void;
    onDuplicateColumn: (groupId: string, columnId: string) => void;
    supplierCategories: Category[];
}

const JobBoard: React.FC<JobBoardProps> = ({ 
    jobs, onUpdateJob, onDeleteTrackedJob, onCreateJob, onCreateQuoteFromJobs, users, currentUser, taskColumns, setTaskColumns,
    customTaskGroups, onUpdateCustomTask, onCreateCustomTask, onDeleteCustomTask,
    onAddCustomGroup, onDeleteGroup, onUpdateGroup, onUpdateGroupColumns, onDuplicateGroup,
    onDuplicateColumn,
    supplierCategories
}) => {
    const [editingJob, setEditingJob] = useState<TrackedJob | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [recentlyCompletedJobIds, setRecentlyCompletedJobIds] = useState<string[]>([]);
    const [jobFilter, setJobFilter] = useState<'all' | 'mine'>(
        currentUser.role === 'team-member' ? 'mine' : 'all'
    );
    const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'createdAt'>('priority');
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterDueDateStart, setFilterDueDateStart] = useState('');
    const [filterDueDateEnd, setFilterDueDateEnd] = useState('');
    const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<TrackedJobStatus | null>(null);
    const [activeView, setActiveView] = useState<'board' | 'tasks' | 'custom-tasks'>('board');
    
    // State for custom tasks filters
    const [customSearchTerm, setCustomSearchTerm] = useState('');
    const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

    const canEditJobs = useMemo(() => 
        currentUser.role === 'admin' || 
        currentUser.role === 'master' || 
        currentUser.permissions?.jobBoard === 'edit',
    [currentUser]);


    const teamMembers = useMemo(() => {
        if (currentUser.role === 'master' || currentUser.role === 'admin') {
             const teamIds = new Set(jobs.map(j => j.masterId));
             const allTeamMembers: User[] = [];
             teamIds.forEach(teamId => {
                if(teamId) {
                    allTeamMembers.push(...users.filter(u => u.teamId === teamId && u.id !== teamId));
                }
             });
             // For the master user's own team
             allTeamMembers.push(...users.filter(user => user.teamId === currentUser.id && user.id !== currentUser.id));
             // Deduplicate
             return Array.from(new Map(allTeamMembers.map(item => [item['id'], item])).values());
        }
        return [];
    },[users, currentUser, jobs]);
    
    const customerNames = useMemo(() => {
        const names = new Set(jobs.map(j => j.customerName));
        return Array.from(names);
    }, [jobs]);

    const isJobOverdue = (job: TrackedJob): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(job.dueDate) < today && job.status !== 'complete';
    };

    const handleCardClick = (job: TrackedJob) => {
        if (selectedJobIds.length > 0 && job.invoiceId === 'MANUAL') {
            handleToggleJobSelection(job.id);
        } else {
            setEditingJob(job);
        }
    };

    const handleToggleJobSelection = (jobId: string) => {
        setSelectedJobIds(prev => {
            const isSelected = prev.includes(jobId);
            if (isSelected) {
                return prev.filter(id => id !== jobId);
            } else {
                return [...prev, jobId];
            }
        });
    };

    const handleCreateQuote = () => {
        const selectedJobs = jobs.filter(job => selectedJobIds.includes(job.id));
        if (selectedJobs.length === 0) {
            alert("Please select at least one job to create a quote.");
            return;
        }

        const firstCustomerName = selectedJobs[0].customerName;
        const allSameCustomer = selectedJobs.every(job => job.customerName === firstCustomerName);

        if (!allSameCustomer) {
            alert("Please select jobs for the same customer to create a single quote.");
            return;
        }

        const lineItems: InvoiceLineItem[] = selectedJobs.map(job => ({
            id: crypto.randomUUID(),
            inventoryItemId: null,
            description: job.description,
            quantity: 1,
            vatRate: 20, // Default VAT rate
            discount: { type: 'fixed', value: 0 },
            price: 0, // Manual jobs have no price, user must enter in quote
        }));
        
        onCreateQuoteFromJobs(firstCustomerName, lineItems);
        setSelectedJobIds([]); // Clear selection after creating quote
    };

    const handleDeleteSelected = () => {
        if (selectedJobIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedJobIds.length} manual job(s)?`)) {
            selectedJobIds.forEach(id => onDeleteTrackedJob(id));
            setSelectedJobIds([]);
        }
    };

    const filteredJobs = useMemo(() => {
        let filtered = [...jobs];

        if (currentUser.role !== 'admin' && jobFilter === 'mine') {
            filtered = filtered.filter(j => j.assignedTeamMemberId === currentUser.id);
        }

        // Customer filter
        if (filterCustomer) {
            filtered = filtered.filter(j => j.customerName.toLowerCase().includes(filterCustomer.toLowerCase()));
        }
        
        // Due Date range filter
        if (filterDueDateStart) {
            const start = new Date(filterDueDateStart);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(j => new Date(j.dueDate) >= start);
        }
        if (filterDueDateEnd) {
            const end = new Date(filterDueDateEnd);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(j => new Date(j.dueDate) <= end);
        }

        // Text search
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(j => 
                j.description.toLowerCase().includes(lowercasedTerm) ||
                j.customerName.toLowerCase().includes(lowercasedTerm) ||
                j.invoiceNumber.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        const priorityOrder: Record<TrackedJobPriority, number> = { high: 1, medium: 2, low: 3 };

        filtered.sort((a, b) => {
            if (sortBy === 'priority') {
                const priorityA = priorityOrder[a.priority || 'medium'];
                const priorityB = priorityOrder[b.priority || 'medium'];
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                // Secondary sort by due date if priorities are the same
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            if (sortBy === 'dueDate') {
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            // default to createdAt
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return filtered;
    }, [jobs, jobFilter, currentUser.id, searchTerm, filterCustomer, filterDueDateStart, filterDueDateEnd, currentUser.role, sortBy]);

    const overdueJobs = filteredJobs.filter(j => isJobOverdue(j));
    const newJobs = filteredJobs.filter(j => j.status === 'new' && !isJobOverdue(j));
    const inProgressJobs = filteredJobs.filter(j => j.status === 'in_progress' && !isJobOverdue(j));
    const completeJobs = filteredJobs.filter(j => j.status === 'complete');


    const handleSave = (updatedJob: TrackedJob) => {
        const originalJob = jobs.find(j => j.id === updatedJob.id);
        onUpdateJob(updatedJob);
        setEditingJob(null);

        if (originalJob && originalJob.status !== 'complete' && updatedJob.status === 'complete') {
            setRecentlyCompletedJobIds(prev => [...prev, updatedJob.id]);
            setTimeout(() => {
                setRecentlyCompletedJobIds(prev => prev.filter(id => id !== updatedJob.id));
            }, 4000); // Duration of confetti animation
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilterCustomer('');
        setFilterDueDateStart('');
        setFilterDueDateEnd('');
    };
    
    const totalJobs = overdueJobs.length + newJobs.length + inProgressJobs.length + completeJobs.length;

    const summaryData = [
        { status: 'Overdue', count: overdueJobs.length, color: 'bg-red-500', textColor: 'text-white' },
        { status: 'New', count: newJobs.length, color: 'bg-blue-500', textColor: 'text-white' },
        { status: 'In Progress', count: inProgressJobs.length, color: 'bg-orange-500', textColor: 'text-white' },
        { status: 'Complete', count: completeJobs.length, color: 'bg-green-500', textColor: 'text-white' },
    ];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, jobId: string) => {
        e.dataTransfer.setData('jobId', jobId);
        setDraggedJobId(jobId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: TrackedJobStatus) => {
        e.preventDefault();
        setDropTarget(status);
    };
    
    const handleDragLeave = () => {
        setDropTarget(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TrackedJobStatus) => {
        e.preventDefault();
        const jobId = e.dataTransfer.getData('jobId');
        const jobToUpdate = jobs.find(j => j.id === jobId);
        if (jobToUpdate && jobToUpdate.status !== newStatus) {
            handleSave({ ...jobToUpdate, status: newStatus });
        }
        setDraggedJobId(null);
        setDropTarget(null);
    };

    const handleDragEnd = () => {
        setDraggedJobId(null);
        setDropTarget(null);
    };
    
    const firstSelectedJobCustomer = useMemo(() => {
        if (selectedJobIds.length === 0) return null;
        const firstJob = jobs.find(j => j.id === selectedJobIds[0]);
        return firstJob?.customerName || null;
    }, [selectedJobIds, jobs]);

    return (
        <>
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-3xl font-bold text-slate-800">Jobs Board</h2>
                    <div className="flex items-center gap-4">
                        {selectedJobIds.length > 0 && (
                            <div className="flex gap-2">
                                <Button variant="danger" onClick={handleDeleteSelected}>
                                    <TrashIcon className="w-5 h-5 mr-2" />
                                    Delete Selected ({selectedJobIds.length})
                                </Button>
                                <Button variant="primary" onClick={handleCreateQuote}>
                                    <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" />
                                    Create Quote from Selected ({selectedJobIds.length})
                                </Button>
                            </div>
                        )}
                        {(activeView === 'board' || activeView === 'tasks') && ['admin', 'master'].includes(currentUser.role) && (
                            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Create New Job
                            </Button>
                        )}
                        {currentUser.role !== 'admin' && (
                            <div className="flex p-1 bg-slate-100 rounded-lg">
                                <Button
                                    variant={jobFilter === 'all' ? 'primary' : 'ghost'}
                                    onClick={() => setJobFilter('all')}
                                    className="!py-1 !px-3 text-sm"
                                >
                                    All Jobs
                                </Button>
                                <Button
                                    variant={jobFilter === 'mine' ? 'primary' : 'ghost'}
                                    onClick={() => setJobFilter('mine')}
                                    className="!py-1 !px-3 text-sm"
                                >
                                    My Jobs
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-b border-slate-200 mb-4">
                    <div className="flex -mb-px">
                        <button onClick={() => setActiveView('board')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeView === 'board' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Board View</button>
                        <button onClick={() => setActiveView('tasks')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeView === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Tasks View</button>
                        <button onClick={() => setActiveView('custom-tasks')} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeView === 'custom-tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Create Custom Tasks</button>
                    </div>
                </div>

                {(activeView === 'board' || activeView === 'tasks') && (
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 mb-4 pb-4 border-b">
                        <span className="font-semibold">Key:</span>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span>New</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                            <span>In Progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            <span>Complete</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            <span>Overdue</span>
                        </div>
                    </div>
                )}

                {totalJobs > 0 && activeView === 'board' && (
                    <div className="my-6">
                        <h3 className="text-sm font-semibold text-slate-600 mb-2">Jobs Summary</h3>
                        <div className="flex w-full h-8 rounded-md overflow-hidden bg-slate-200">
                            {summaryData.map(data => {
                                if (data.count === 0) return null;
                                const percentage = (data.count / totalJobs) * 100;
                                return (
                                    <div
                                        key={data.status}
                                        className={`flex items-center justify-center ${data.color}`}
                                        style={{ width: `${percentage}%` }}
                                        title={`${data.status}: ${data.count} job(s)`}
                                    >
                                        <span className={`text-xs font-bold ${data.textColor} whitespace-nowrap px-2`}>
                                            {`${data.status} (${data.count})`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {(activeView === 'board' || activeView === 'tasks') && (
                    <div className="mb-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Input
                                placeholder="Search description, customer, invoice #..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-grow"
                            />
                            <Select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                                <option value="priority">Sort by Priority</option>
                                <option value="dueDate">Sort by Due Date</option>
                                <option value="createdAt">Sort by Date Created</option>
                            </Select>
                            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto">
                                <FilterIcon className="w-5 h-5 mr-2" />
                                Filters
                            </Button>
                        </div>
                        {showFilters && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border">
                                <div>
                                    <label className="text-sm font-medium text-slate-600">Customer</label>
                                    <Input list="customer-names-jobboard" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} placeholder="All customers" />
                                    <datalist id="customer-names-jobboard">
                                        {customerNames.map(name => <option key={name} value={name} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600">Due Date From</label>
                                    <Input type="date" value={filterDueDateStart} onChange={e => setFilterDueDateStart(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-600">Due Date To</label>
                                    <Input type="date" value={filterDueDateEnd} onChange={e => setFilterDueDateEnd(e.target.value)} />
                                </div>
                                <div className="flex items-end">
                                    <Button variant="outline" onClick={clearFilters} className="w-full">
                                        Clear Filters
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeView === 'custom-tasks' && (
                    <div className="mb-4">
                        <Input
                            placeholder="Search tasks by any text content..."
                            value={customSearchTerm}
                            onChange={(e) => setCustomSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                {activeView === 'board' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Overdue Column */}
                        <div className="bg-slate-100 p-4 rounded-lg">
                            <h3 className="font-bold text-lg text-white mb-4 p-2 rounded-md bg-red-500 text-center">
                                Overdue ({overdueJobs.length})
                            </h3>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {overdueJobs.map(job => {
                                     const isSelectable = job.invoiceId === 'MANUAL';
                                     const isSelectionDisabled = !!firstSelectedJobCustomer && job.customerName !== firstSelectedJobCustomer;
                                     return (
                                        <TrackedJobCard 
                                            key={job.id} 
                                            job={job} 
                                            onClick={() => handleCardClick(job)} 
                                            users={users} 
                                            onDragStart={(e) => handleDragStart(e, job.id)}
                                            onDragEnd={handleDragEnd}
                                            isDragging={draggedJobId === job.id}
                                            isSelected={selectedJobIds.includes(job.id)}
                                            onToggleSelection={handleToggleJobSelection}
                                            isSelectable={isSelectable}
                                            isSelectionDisabled={isSelectionDisabled}
                                            supplierCategories={supplierCategories}
                                        />
                                     )
                                })}
                                {overdueJobs.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No overdue jobs.</p>}
                            </div>
                        </div>
                        {/* New Column */}
                        <div 
                            className={`bg-slate-100 p-4 rounded-lg transition-colors ${dropTarget === 'new' ? 'border-2 border-dashed border-blue-500 bg-blue-50' : ''}`}
                            onDragOver={(e) => handleDragOver(e, 'new')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'new')}
                        >
                            <h3 className="font-bold text-lg text-white mb-4 p-2 rounded-md bg-blue-500 text-center">
                                New ({newJobs.length})
                            </h3>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {newJobs.map(job => {
                                    const isSelectable = job.invoiceId === 'MANUAL';
                                    const isSelectionDisabled = !!firstSelectedJobCustomer && job.customerName !== firstSelectedJobCustomer;
                                    return (
                                        <TrackedJobCard 
                                            key={job.id} 
                                            job={job} 
                                            onClick={() => handleCardClick(job)} 
                                            users={users} 
                                            onDragStart={(e) => handleDragStart(e, job.id)}
                                            onDragEnd={handleDragEnd}
                                            isDragging={draggedJobId === job.id}
                                            isSelected={selectedJobIds.includes(job.id)}
                                            onToggleSelection={handleToggleJobSelection}
                                            isSelectable={isSelectable}
                                            isSelectionDisabled={isSelectionDisabled}
                                            supplierCategories={supplierCategories}
                                        />
                                    )
                                })}
                                {newJobs.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No new jobs.</p>}
                            </div>
                        </div>
                        {/* In Progress Column */}
                        <div 
                            className={`bg-slate-100 p-4 rounded-lg transition-colors ${dropTarget === 'in_progress' ? 'border-2 border-dashed border-orange-500 bg-orange-50' : ''}`}
                            onDragOver={(e) => handleDragOver(e, 'in_progress')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'in_progress')}
                        >
                            <h3 className="font-bold text-lg text-white mb-4 p-2 rounded-md bg-orange-500 text-center">
                                In Progress ({inProgressJobs.length})
                            </h3>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {inProgressJobs.map(job => {
                                     const isSelectable = job.invoiceId === 'MANUAL';
                                     const isSelectionDisabled = !!firstSelectedJobCustomer && job.customerName !== firstSelectedJobCustomer;
                                    return (
                                        <TrackedJobCard 
                                            key={job.id} 
                                            job={job} 
                                            onClick={() => handleCardClick(job)} 
                                            users={users} 
                                            onDragStart={(e) => handleDragStart(e, job.id)}
                                            onDragEnd={handleDragEnd}
                                            isDragging={draggedJobId === job.id}
                                            isSelected={selectedJobIds.includes(job.id)}
                                            onToggleSelection={handleToggleJobSelection}
                                            isSelectable={isSelectable}
                                            isSelectionDisabled={isSelectionDisabled}
                                            supplierCategories={supplierCategories}
                                        />
                                    )
                                })}
                                {inProgressJobs.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No jobs in progress.</p>}
                            </div>
                        </div>
                        {/* Complete Column */}
                        <div 
                            className={`bg-slate-100 p-4 rounded-lg transition-colors ${dropTarget === 'complete' ? 'border-2 border-dashed border-green-500 bg-green-50' : ''}`}
                            onDragOver={(e) => handleDragOver(e, 'complete')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'complete')}
                        >
                            <h3 className="font-bold text-lg text-white mb-4 p-2 rounded-md bg-green-500 text-center">
                                Complete ({completeJobs.length})
                            </h3>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {completeJobs.map(job => {
                                    const isSelectable = job.invoiceId === 'MANUAL';
                                    const isSelectionDisabled = !!firstSelectedJobCustomer && job.customerName !== firstSelectedJobCustomer;
                                    return (
                                        <TrackedJobCard 
                                            key={job.id} 
                                            job={job} 
                                            onClick={() => handleCardClick(job)} 
                                            users={users}
                                            isJustCompleted={recentlyCompletedJobIds.includes(job.id)}
                                            onDragStart={(e) => handleDragStart(e, job.id)}
                                            onDragEnd={handleDragEnd}
                                            isDragging={draggedJobId === job.id}
                                            isSelected={selectedJobIds.includes(job.id)}
                                            onToggleSelection={handleToggleJobSelection}
                                            isSelectable={isSelectable}
                                            isSelectionDisabled={isSelectionDisabled}
                                            supplierCategories={supplierCategories}
                                        />
                                    )
                                })}
                                {completeJobs.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No completed jobs.</p>}
                            </div>
                        </div>
                    </div>
                ) : activeView === 'tasks' ? (
                    <TasksView
                        jobs={filteredJobs}
                        onUpdateJob={onUpdateJob}
                        taskColumns={taskColumns}
                        setTaskColumns={setTaskColumns}
                        users={users}
                        currentUser={currentUser}
                    />
                ) : (
                    <TasksView
                        // Pass down all the new group-related props
                        customTaskGroups={customTaskGroups}
                        onUpdateCustomTask={onUpdateCustomTask}
                        onCreateCustomTask={onCreateCustomTask}
                        onDeleteCustomTask={onDeleteCustomTask}
                        onAddCustomGroup={onAddCustomGroup}
                        onDeleteGroup={onDeleteGroup}
                        onUpdateGroup={onUpdateGroup}
                        onUpdateGroupColumns={onUpdateGroupColumns}
                        onDuplicateGroup={onDuplicateGroup}
                        onDuplicateColumn={onDuplicateColumn}
                        users={users}
                        currentUser={currentUser}
                        searchTerm={customSearchTerm}
                    />
                )}
            </div>
            
            <EditTrackedJobModal
                job={editingJob}
                onClose={() => setEditingJob(null)}
                onSave={handleSave}
                onDelete={(id) => {
                    onDeleteTrackedJob(id);
                    setEditingJob(null);
                }}
                teamMembers={teamMembers}
            />
            {['admin', 'master'].includes(currentUser.role) && (
                <CreateManualJobModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreateJob={onCreateJob}
                    users={users}
                    currentUser={currentUser}
                />
            )}
        </>
    );
};

export default JobBoard;
