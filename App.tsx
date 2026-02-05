import React, { useState, ReactNode, useEffect, useMemo } from 'react';
import { AppSettings, Category, Customer, InventoryItem, Invoice, InvoiceDraft, InvoiceState, QuoteDraft, Payment, Supplier, PurchaseOrder, PurchaseOrderState, Bill, BillState, User, SupplierInventoryItem, InvoiceCreationType, SubscriptionPackage, DailyTaking, TaxMode, Job, JobState, TrackedJob, PackagePermissions, PageKey, CreditNote, CreditNoteState, TaskColumn, TaskGroup, InvoiceLineItem, TrackedJobPriority, Account, MeasurementUnit } from './types';
import SummaryDashboard from './components/SummaryDashboard';
import InvoiceCreator from './components/InvoiceCreator';
import PurchaseOrderCreator from './components/PurchaseOrderCreator';
import BillCreator from './components/BillCreator';
import InventoryManager from './components/InventoryManager';
import CustomerManager from './components/CustomerManager';
import CustomerFormPage from './components/CustomerFormPage';
import SupplierManager from './components/SupplierManager';
import SupplierFormPage from './components/SupplierFormPage';
import InvoicesManager from './components/InvoicesManager';
import PurchaseOrderManager from './components/PurchaseOrderManager';
import BillManager from './components/BillManager';
import QuoteManager from './components/QuoteManager';
import DraftsManager from './components/DraftsManager';
import SettingsManager from './components/SettingsManager';
import CustomerHistoryPage from './components/CustomerHistoryPage';
import ConfirmationModal from './components/ui/ConfirmationModal';
import { CreationTypeModal } from './components/ui/CreationTypeModal';
import SupplierInventoryManager from './components/SupplierInventoryManager';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import UserManagementPage from './components/UserManagementPage';
import SubscriptionManager from './components/SubscriptionManager';
import PackageSelectionPage from './components/PackageSelectionPage';
import AnnouncementBar from './components/AnnouncementBar';
import PackageSettingsManager from './components/PackageSettingsManager';
import ReportsPage from './components/ReportsPage';
import EmailModal from './components/EmailModal';
import DailyTakingsManager from './components/DailyTakingsManager';
import JobBuilder from './components/JobBuilder';
import JobManager from './components/JobManager';
import JobBoard from './components/JobBoard';
import AdminTeamManager from './components/AdminTeamManager';
import CreditNoteCreator from './components/CreditNoteCreator';
import CreditNoteManager from './components/CreditNoteManager';
import ChartOfAccountsManager from './components/ChartOfAccountsManager';

import { HomeIcon } from './components/icons/HomeIcon';
import { PlusIcon } from './components/icons/PlusIcon';
import { CreditCardIcon } from './components/icons/CreditCardIcon';
import { ChatBubbleBottomCenterTextIcon } from './components/icons/ChatBubbleBottomCenterTextIcon';
import { ClipboardDocumentListIcon } from './components/icons/ClipboardDocumentListIcon';
import { DocumentDuplicateIcon } from './components/icons/DocumentDuplicateIcon';
import { UsersIcon } from './components/icons/UsersIcon';
import { TruckIcon } from './components/icons/TruckIcon';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';
import { ArchiveBoxIcon } from './components/icons/ArchiveBoxIcon';
import { CogIcon } from './components/icons/CogIcon';
import { Bars3Icon } from './components/icons/Bars3Icon';
import { XIcon } from './components/icons/XIcon';
import { ArrowLeftOnRectangleIcon } from './components/icons/ArrowLeftOnRectangleIcon';
import { ReceiptIcon } from './components/icons/ReceiptIcon';
import { StarIcon } from './components/icons/StarIcon';
import { CurrencyPoundIcon } from './components/icons/CurrencyPoundIcon';
import PrintableDocument from './components/PrintableDocument';
import PrintablePurchaseOrder from './components/PrintablePurchaseOrder';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PrintableVatReport from './components/PrintableVatReport';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import PrintableReport from './components/PrintableReport';
import { EnvelopeIcon } from './components/icons/EnvelopeIcon';
import BulkEmailModal from './components/BulkEmailModal';
import PrintableBalanceSheet from './components/PrintableBalanceSheet';
import PrintableCashFlowStatement from './components/PrintableCashFlowStatement';
import PrintableIncomeByCustomer from './components/PrintableIncomeByCustomer';
import PrintablePaidToSuppliers from './components/PrintablePaidToSuppliers';
import PrintableAccountBalances from './components/PrintableAccountBalances';
import { CollapsibleNavSection } from './components/ui/CollapsibleNavSection';
import { WrenchScrewdriverIcon } from './components/icons/WrenchScrewdriverIcon';
import { BriefcaseIcon } from './components/icons/BriefcaseIcon';
import { UserGroupIcon } from './components/icons/UserGroupIcon';
import { DocumentMinusIcon } from './components/icons/DocumentMinusIcon';
import PrintableCreditNote from './components/PrintableCreditNote';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { usePersistence } from './hooks/usePersistence';

type View = 
    | 'dashboard' 
    | 'create-invoice' 
    | 'create-quote'
    | 'create-purchase-order'
    | 'create-bill'
    | 'job-builder'
    | 'manage-jobs'
    | 'job-board'
    | 'manage-invoices' 
    | 'manage-quotes' 
    | 'manage-purchase-orders'
    | 'manage-bills'
    | 'manage-drafts' 
    | 'manage-customers'
    | 'add-customer'
    | 'manage-suppliers'
    | 'add-supplier'
    | 'manage-inventory'
    | 'manage-supplier-inventory'
    | 'manage-daily-takings'
    | 'manage-credit-notes'
    | 'manage-chart-of-accounts'
    | 'create-credit-note'
    | 'settings'
    | 'user-management'
    | 'manage-team-members'
    | 'customer-history'
    | 'manage-subscription'
    | 'manage-package-settings'
    | 'reports';

const defaultSettings: AppSettings = {
    companyName: 'Your Company Name',
    companyAddress: '123 Business Rd, Business City, 12345',
    vatNumber: 'GB123456789',
    companyRegistrationNumber: '12345678',
    defaultVatRate: 20,
    paymentTerms: 'Payment due within 30 days.',
    bankName: 'Business Bank',
    accountNumber: '12345678',
    sortCode: '12-34-56',
    invoiceTitle: 'Invoice',
    quoteTitle: 'Quote',
    nextInvoiceNumber: 1,
    nextQuoteNumber: 1,
    nextJobNumber: 1,
    nextCreditNoteNumber: 1,
    poPrefix: 'PO',
    nextPoNumber: 1,
    currencySymbol: '£',
    emailFromName: 'Your Company Name',
    emailReplyTo: 'reply@yourcompany.com',
    invoiceEmailSubject: 'Invoice [InvoiceNumber] from [CompanyName]',
    invoiceEmailBody: 'Dear [CustomerName],\n\nPlease find attached your invoice [InvoiceNumber] for the total amount of [TotalAmount].\n\nPayment is due by [DueDate].\n\nThank you for your business.\n\nSincerely,\n[CompanyName]',
    quoteEmailSubject: 'Quote [InvoiceNumber] from [CompanyName]',
    quoteEmailBody: 'Dear [CustomerName],\n\nPlease find attached your quote [InvoiceNumber] for the total amount of [TotalAmount].\n\nWe look forward to hearing from you.\n\nSincerely,\n[CompanyName]',
    showAccountOnInvoices: true,
};

const starterPermissions: PackagePermissions = {
    dashboard: true,
    'manage-invoices': true,
    'manage-quotes': true,
    'manage-drafts': true,
    'manage-daily-takings': true,
    'manage-purchase-orders': true,
    'manage-bills': true,
    'manage-customers': true,
    'manage-suppliers': true,
    'manage-inventory': true,
    'manage-supplier-inventory': true,
    'manage-chart-of-accounts': true,
    reports: true,
    settings: true,
    'job-builder': false,
    'manage-jobs': false,
    'job-board': false,
    'manage-credit-notes': false,
};

const proPermissions: PackagePermissions = {
    dashboard: true,
    'job-builder': true,
    'manage-jobs': true,
    'manage-invoices': true,
    'manage-quotes': true,
    'manage-drafts': true,
    'manage-daily-takings': true,
    'manage-purchase-orders': true,
    'manage-bills': true,
    'manage-customers': true,
    'manage-suppliers': true,
    'manage-inventory': true,
    'manage-supplier-inventory': true,
    'job-board': true,
    'manage-credit-notes': true,
    'manage-chart-of-accounts': true,
    reports: true,
    settings: true,
};

const defaultSubscriptionPackages: SubscriptionPackage[] = [
    {
        id: 'package1',
        name: 'Starter',
        description: 'For straightforward fixed-price jobs.',
        price: 2.50,
        originalPrice: 5.00,
        features: [
            'Fixed Price Invoices',
            'Fixed Price Quotes',
            'Enable CSV Data Export',
        ],
        stripeLink: '',
        allowFixedPrice: true,
        allowMeasuredPrice: false,
        teamMemberLimit: 1,
        permissions: starterPermissions,
    },
    {
        id: 'package2',
        name: 'Pro',
        description: 'For professionals with measured work.',
        price: 5.00,
        originalPrice: 10.00,
        features: [
            'Unit Measurement Invoices',
            'Unit Measurement Quotes',
            'Enable CSV Data Export',
        ],
        stripeLink: '',
        allowFixedPrice: true,
        allowMeasuredPrice: true,
        teamMemberLimit: 5,
        permissions: proPermissions,
    }
];

const defaultAccounts: Account[] = [
    { id: 'acc-inc-1', name: 'Income', type: 'Income', code: '4000', isSystem: true },
    { id: 'acc-inc-2', name: 'Discount', type: 'Income', code: '4001', isSystem: true },
    { id: 'acc-exp-1', name: 'Operating Expense', type: 'Expenses', code: '5000', isSystem: true },
    { id: 'acc-asset-1', name: 'Cash and Bank', type: 'Assets', code: '1000', isSystem: true },
    { id: 'acc-liab-1', name: 'Credit Card', type: 'Liabilities', code: '2000', isSystem: true },
];

const getInitialInvoiceState = (settings: AppSettings, invoiceType: InvoiceCreationType): InvoiceState => ({
    customerName: '',
    reference: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    completionDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    lineItems: [],
    notes: '',
    taxMode: 'exclusive',
    linkedBillIds: [],
    invoiceType,
});

const getInitialPOState = (): PurchaseOrderState => ({
    supplierId: null,
    supplierName: '',
    reference: '',
    poNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    lineItems: [],
    notes: '',
    taxMode: 'exclusive',
});

const getInitialBillState = (): BillState => ({
    supplierId: null,
    supplierName: '',
    reference: '', 
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    lineItems: [],
    notes: '',
    taxMode: 'exclusive',
});

const getInitialJobState = (settings: AppSettings, invoiceType: InvoiceCreationType): JobState => ({
    customerName: '',
    reference: '',
    jobNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    lineItems: [],
    notes: '',
    taxMode: 'exclusive',
    invoiceType,
});

const defaultTaskColumns: TaskColumn[] = [
    { id: 'customer', name: 'Customer Name', type: 'customer', isCustom: false },
    { id: 'description', name: 'Description', type: 'description', isCustom: false },
    { id: 'status', name: 'Job Status', type: 'status', isCustom: false },
    { id: 'dueDate', name: 'Due Date', type: 'dueDate', isCustom: false },
];

const defaultCustomTaskColumns: TaskColumn[] = [
  { id: 'default-custom-task', name: 'Task / Job', type: 'task', isCustom: true },
  { id: 'default-custom-team', name: 'Assigned To', type: 'team', isCustom: true },
  { id: 'default-custom-jobStatus', name: 'Job Status', type: 'jobStatus', isCustom: true,
    options: [
      { id: 'default-status-1', label: 'New', color: 'bg-blue-500' },
      { id: 'default-status-2', label: 'In Progress', color: 'bg-orange-500' },
      { id: 'default-status-3', label: 'Complete', color: 'bg-green-500' },
    ],
  },
  { id: 'default-custom-notes', name: 'Notes', type: 'notes', isCustom: true },
];

const MainApp: React.FC<{
    currentUser: User;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    subscriptionPackages: SubscriptionPackage[];
    setSubscriptionPackages: React.Dispatch<React.SetStateAction<SubscriptionPackage[]>>;
}> = ({ currentUser, setCurrentUser, users, setUsers, subscriptionPackages, setSubscriptionPackages }) => {
    
    const isJobBoardOnlyUser =
        currentUser.role === 'team-member' &&
        currentUser.permissions?.jobBoard === 'view' &&
        currentUser.permissions.sales === 'none';

    const dataPrefix = (currentUser.role === 'team-member' ? currentUser.teamId : currentUser.id) + '_';
    
    const [view, setView, isLoadingView] = usePersistence<View>(`${dataPrefix}active-view`, isJobBoardOnlyUser ? 'job-board' : 'dashboard');
    const [currentMode, setCurrentMode, isLoadingMode] = usePersistence<'invoice' | 'quote' | 'po' | 'bill' | 'job'>(`${dataPrefix}active-mode`, 'invoice');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [settings, setSettings, isLoadingSettings] = usePersistence<AppSettings>(`${dataPrefix}app-settings`, defaultSettings);
    const [customers, setCustomers, isLoadingCustomers] = usePersistence<Customer[]>(`${dataPrefix}customers`, []);
    const [suppliers, setSuppliers, isLoadingSuppliers] = usePersistence<Supplier[]>(`${dataPrefix}suppliers`, []);
    const [inventory, setInventory, isLoadingInventory] = usePersistence<InventoryItem[]>(`${dataPrefix}inventory`, []);
    const [supplierInventory, setSupplierInventory, isLoadingSupplierInventory] = usePersistence<SupplierInventoryItem[]>(`${dataPrefix}supplier-inventory`, []);
    const [categories, setCategories, isLoadingCategories] = usePersistence<Category[]>(`${dataPrefix}categories`, []);
    const [supplierCategories, setSupplierCategories, isLoadingSupplierCategories] = usePersistence<Category[]>(`${dataPrefix}supplier-categories`, []);
    const [invoices, setInvoices, isLoadingInvoices] = usePersistence<Invoice[]>(`${dataPrefix}invoices`, []);
    const [purchaseOrders, setPurchaseOrders, isLoadingPOs] = usePersistence<PurchaseOrder[]>(`${dataPrefix}purchase-orders`, []);
    const [bills, setBills, isLoadingBills] = usePersistence<Bill[]>(`${dataPrefix}bills`, []);
    const [jobs, setJobs, isLoadingJobs] = usePersistence<Job[]>(`${dataPrefix}jobs`, []);
    const [creditNotes, setCreditNotes, isLoadingCNs] = usePersistence<CreditNote[]>(`${dataPrefix}credit-notes`, []);
    const [taskColumns, setTaskColumns, isLoadingTCs] = usePersistence<TaskColumn[]>(`${dataPrefix}task-columns`, defaultTaskColumns);
    const [customTaskGroups, setCustomTaskGroups, isLoadingGroups] = usePersistence<TaskGroup[]>(`${dataPrefix}custom-task-groups`, [
        {
            id: crypto.randomUUID(),
            name: 'New Group',
            isCollapsed: false,
            columns: defaultCustomTaskColumns,
            tasks: [],
        }
    ]);
    const [accounts, setAccounts, isLoadingAccounts] = usePersistence<Account[]>(`${dataPrefix}chart-of-accounts`, defaultAccounts);
    
    const [currentInvoiceState, setCurrentInvoiceState, isLoadingCIS] = usePersistence<InvoiceState>(`${dataPrefix}current-invoice-state`, getInitialInvoiceState(settings, 'measured'));
    const [currentCreditNoteState, setCurrentCreditNoteState, isLoadingCCNS] = usePersistence<CreditNoteState | null>(`${dataPrefix}current-credit-note-state`, null);
    const [currentPOState, setCurrentPOState, isLoadingCPOS] = usePersistence<PurchaseOrderState>(`${dataPrefix}current-po-state`, getInitialPOState());
    const [currentBillState, setCurrentBillState, isLoadingCBS] = usePersistence<BillState>(`${dataPrefix}current-bill-state`, getInitialBillState());
    const [currentJobState, setCurrentJobState, isLoadingCJS] = usePersistence<JobState>(`${dataPrefix}current-job-state`, getInitialJobState(settings, 'measured'));
    
    const [editingInvoiceId, setEditingInvoiceId, isLoadingEI] = usePersistence<string | null>(`${dataPrefix}editing-invoice-id`, null);
    const [editingQuoteId, setEditingQuoteId, isLoadingEQ] = usePersistence<string | null>(`${dataPrefix}editing-quote-id`, null);
    const [editingPOId, setEditingPOId, isLoadingEP] = usePersistence<string | null>(`${dataPrefix}editing-po-id`, null);
    const [editingBillId, setEditingBillId, isLoadingEB] = usePersistence<string | null>(`${dataPrefix}editing-bill-id`, null);
    const [editingJobId, setEditingJobId, isLoadingEJ] = usePersistence<string | null>(`${dataPrefix}editing-job-id`, null);
    const [viewingCreditNoteId, setViewingCreditNoteId, isLoadingVCN] = usePersistence<string | null>(`${dataPrefix}viewing-credit-note-id`, null);

    const [trackedJobs, setTrackedJobs, isLoadingTrackedJobs] = usePersistence<TrackedJob[]>(`${dataPrefix}tracked-jobs`, []);
    const [invoiceDrafts, setInvoiceDrafts, isLoadingID] = usePersistence<InvoiceDraft[]>(`${dataPrefix}invoice-drafts`, []);
    const [quoteDrafts, setQuoteDrafts, isLoadingQD] = usePersistence<QuoteDraft[]>(`${dataPrefix}quote-drafts`, []);
    const [dailyTakings, setDailyTakings, isLoadingDT] = usePersistence<DailyTaking[]>(`${dataPrefix}daily-takings`, []);

    const isGlobalLoading = isLoadingView || isLoadingMode || isLoadingSettings || isLoadingCustomers || isLoadingSuppliers || isLoadingInventory || isLoadingSupplierInventory || isLoadingCategories || isLoadingSupplierCategories || isLoadingInvoices || isLoadingPOs || isLoadingBills || isLoadingJobs || isLoadingCNs || isLoadingTCs || isLoadingGroups || isLoadingAccounts || isLoadingCIS || isLoadingCCNS || isLoadingCPOS || isLoadingCBS || isLoadingCJS || isLoadingEI || isLoadingEQ || isLoadingEP || isLoadingEB || isLoadingEJ || isLoadingVCN || isLoadingTrackedJobs || isLoadingID || isLoadingQD || isLoadingDT;

    const [documentToPrint, setDocumentToPrint] = useState<{ type: string; data: any; appliedCredits?: { number: string; amount: number }[] } | null>(null);
    const [emailModalData, setEmailModalData] = useState<{ to: string; subject: string; body: string; } | null>(null);
    const [isBulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
    const [creationTypeModalConfig, setCreationTypeModalConfig] = useState<{ isOpen: boolean; action: 'invoice' | 'quote' | 'job' | null; }>({ isOpen: false, action: null });

    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
    const [selectedInvoiceIdForManager, setSelectedInvoiceIdForManager] = useState<string | null>(null);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    
    const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(null);
    const [fromCustomerHistory, setFromCustomerHistory] = useState(false);
    
    const isTrialing = currentUser.subscriptionStatus.startsWith('trial_');
    const isTrialExpired = isTrialing && currentUser.trialEndDate && new Date() > new Date(currentUser.trialEndDate);

    const navigate = (targetView: View) => {
        if (view === 'create-credit-note' && viewingCreditNoteId) setViewingCreditNoteId(null);
        if (isTrialExpired && currentUser.role !== 'admin') setView('manage-subscription');
        else setView(targetView);
    };

    const handleLogout = () => setCurrentUser(null);

    const userPackagePermissions = useMemo(() => {
        let userForSubscription = currentUser;
        if (currentUser.role === 'team-member') {
            const masterUser = users.find(u => u.id === currentUser.teamId);
            userForSubscription = masterUser || currentUser;
        }
        if (userForSubscription.role === 'admin' || userForSubscription.subscriptionStatus === 'lifetime_free') return { allowFixedPrice: true, allowMeasuredPrice: true };
        const packageId = userForSubscription.subscriptionStatus.replace(/^(trial_|package_)/, '');
        const currentPackage = subscriptionPackages.find(p => p.id === packageId);
        return { allowFixedPrice: currentPackage?.allowFixedPrice ?? false, allowMeasuredPrice: currentPackage?.allowMeasuredPrice ?? false };
    }, [currentUser, users, subscriptionPackages]);

    const handleFinalizeInvoice = (state: InvoiceState, total: number) => {
        const newInvoice: Invoice = {
            id: crypto.randomUUID(),
            name: `Invoice for ${state.customerName || 'N/A'} - #${state.invoiceNumber}`,
            createdAt: new Date().toISOString(),
            state,
            total,
            payments: [],
            linkedBillIds: state.linkedBillIds || [],
        };
        setInvoices(prev => [...prev, newInvoice]);
        const newTrackedJobs: TrackedJob[] = state.lineItems.map(item => ({
            id: crypto.randomUUID(),
            invoiceId: newInvoice.id,
            invoiceNumber: state.invoiceNumber,
            customerName: state.customerName,
            description: item.description || 'No Description',
            dueDate: state.completionDate || state.dueDate,
            status: 'new',
            createdAt: new Date().toISOString(),
            priority: 'medium',
        }));
        setTrackedJobs(prev => [...prev, ...newTrackedJobs]);
        const prefix = (settings.invoiceTitle || 'Invoice').replace(/\s+/g, '');
        if (state.invoiceNumber === `${prefix}-${String(settings.nextInvoiceNumber).padStart(4, '0')}`) {
            setSettings(s => ({ ...s, nextInvoiceNumber: (s.nextInvoiceNumber || 1) + 1 }));
        }
        navigate('manage-invoices');
        setConfirmation({ title: 'Success', message: 'Invoice finalized.' });
    };

    const handleDuplicateGroup = (groupId: string) => {
        const group = customTaskGroups.find(g => g.id === groupId);
        if (group) {
            const newGroup = { ...group, id: crypto.randomUUID(), name: `${group.name} (Copy)`, tasks: group.tasks.map(t => ({ ...t, id: crypto.randomUUID() })) };
            setCustomTaskGroups(prev => [...prev, newGroup]);
        }
    };

    const handleDuplicateColumn = (groupId: string, columnId: string) => {
        setCustomTaskGroups(prev => prev.map(group => {
            if (group.id === groupId) {
                const col = group.columns.find(c => c.id === columnId);
                if (col) {
                    const newCol = { ...col, id: crypto.randomUUID(), name: `${col.name} (Copy)` };
                    const index = group.columns.findIndex(c => c.id === columnId);
                    const newCols = [...group.columns];
                    newCols.splice(index + 1, 0, newCol);
                    return { ...group, columns: newCols };
                }
            }
            return group;
        }));
    };

    const handleNewDocumentClick = (action: 'invoice' | 'quote' | 'job') => {
        const { allowFixedPrice, allowMeasuredPrice } = userPackagePermissions;
        if (allowFixedPrice && allowMeasuredPrice) setCreationTypeModalConfig({ isOpen: true, action });
        else if (allowFixedPrice) action === 'job' ? resetJobBuilder('fixed') : resetCreator(action, 'fixed');
        else if (allowMeasuredPrice) action === 'job' ? resetJobBuilder('measured') : resetCreator(action, 'measured');
    };

    const resetCreator = (mode: 'invoice' | 'quote', type: InvoiceCreationType) => {
        const nextNum = mode === 'invoice' ? settings.nextInvoiceNumber : settings.nextQuoteNumber;
        const prefix = mode === 'invoice' ? (settings.invoiceTitle || 'Invoice').replace(/\s+/g, '') : (settings.quoteTitle || 'Quote').replace(/\s+/g, '');
        setCurrentMode(mode);
        setEditingInvoiceId(null);
        setEditingQuoteId(null);
        setCurrentInvoiceState({ ...getInitialInvoiceState(settings, type), invoiceNumber: `${prefix}-${String(nextNum).padStart(4, '0')}` });
        navigate(mode === 'invoice' ? 'create-invoice' : 'create-quote');
    };

    const resetJobBuilder = (type: InvoiceCreationType) => {
        setCurrentMode('job');
        setEditingJobId(null);
        setCurrentJobState({ ...getInitialJobState(settings, type), jobNumber: `JOB-${String(settings.nextJobNumber).padStart(4, '0')}` });
        navigate('job-builder');
    };

    const sidebarContent = (
        <>
            <div className="flex items-center justify-center h-16 bg-blue-900 text-white font-bold text-xl tracking-wide">InQuBu Pro</div>
            <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
                <button onClick={() => navigate('dashboard')} className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-blue-800 ${view === 'dashboard' ? 'bg-blue-600 text-white' : ''}`}><HomeIcon className="w-6 h-6 mr-3" /> Dashboard</button>
                <CollapsibleNavSection title="Sales" defaultOpen>
                    <button onClick={() => handleNewDocumentClick('invoice')} className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-blue-800"><PlusIcon className="w-6 h-6 mr-3" /> New Invoice</button>
                    <button onClick={() => navigate('manage-invoices')} className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-blue-800 ${view === 'manage-invoices' ? 'bg-blue-600 text-white' : ''}`}><CreditCardIcon className="w-6 h-6 mr-3" /> Invoices</button>
                    <button onClick={() => navigate('job-board')} className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-blue-800 ${view === 'job-board' ? 'bg-blue-600 text-white' : ''}`}><BriefcaseIcon className="w-6 h-6 mr-3" /> Job Board</button>
                </CollapsibleNavSection>
                <div className="mt-auto pt-4"><button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-200 hover:bg-red-800"><ArrowLeftOnRectangleIcon className="w-6 h-6 mr-3" /> Logout</button></div>
            </nav>
        </>
    );

    const renderView = () => {
        if (isGlobalLoading) return <div className="flex flex-col items-center justify-center h-full"><div className="loading-spinner mb-4"></div><p className="text-slate-600 animate-pulse">Syncing with cloud...</p></div>;
        switch (view) {
            case 'dashboard': return <SummaryDashboard invoices={invoices} quotes={quoteDrafts} drafts={invoiceDrafts} purchaseOrders={purchaseOrders} bills={bills} creditNotes={creditNotes} settings={settings} inventory={inventory} trackedJobs={trackedJobs} onViewJob={() => navigate('job-board')} onDownloadVatReportPdf={(d) => setDocumentToPrint({ type: 'vat-report', data: d })} />;
            case 'create-invoice': return <InvoiceCreator mode="invoice" editingInvoice={null} invoiceState={currentInvoiceState} setInvoiceState={setCurrentInvoiceState} inventory={inventory} customers={customers} settings={settings} categories={categories} bills={bills} unlinkedBills={bills} creditNotes={creditNotes} accounts={accounts} onSaveDraft={() => {}} onSaveQuote={() => {}} onFinalizeInvoice={handleFinalizeInvoice} onDownloadPdf={() => {}} onAddCustomer={(c) => setCustomers(prev => [...prev, { ...c, id: crypto.randomUUID() }])} />;
            case 'job-board': return <JobBoard jobs={trackedJobs} onUpdateJob={setTrackedJobs} users={users} currentUser={currentUser} taskColumns={taskColumns} setTaskColumns={setTaskColumns} customTaskGroups={customTaskGroups} onUpdateCustomTask={(gid, t) => setCustomTaskGroups(prev => prev.map(g => g.id === gid ? { ...g, tasks: g.tasks.map(task => task.id === t.id ? t : task) } : g))} onCreateCustomTask={(gid, td) => setCustomTaskGroups(prev => prev.map(g => g.id === gid ? { ...g, tasks: [...g.tasks, { ...td, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] } : g))} onDeleteCustomTask={(gid, tid) => setCustomTaskGroups(prev => prev.map(g => g.id === gid ? { ...g, tasks: g.tasks.filter(t => t.id !== tid) } : g))} onAddCustomGroup={(after) => setCustomTaskGroups(prev => [...prev, { id: crypto.randomUUID(), name: 'New Group', isCollapsed: false, columns: defaultCustomTaskColumns, tasks: [] }])} onDeleteGroup={(id) => setCustomTaskGroups(prev => prev.filter(g => g.id !== id))} onUpdateGroup={(id, up) => setCustomTaskGroups(prev => prev.map(g => g.id === id ? { ...g, ...up } : g))} onUpdateGroupColumns={(id, cols) => setCustomTaskGroups(prev => prev.map(g => g.id === id ? { ...g, columns: cols } : g))} onDuplicateGroup={handleDuplicateGroup} onDuplicateColumn={handleDuplicateColumn} supplierCategories={supplierCategories} onCreateJob={() => {}} onCreateQuoteFromJobs={() => {}} onDeleteTrackedJob={() => {}} />;
            case 'manage-invoices': return <InvoicesManager invoices={invoices} drafts={invoiceDrafts} creditNotes={creditNotes} settings={settings} currentUser={currentUser} onAddPayment={() => {}} onRemovePayment={() => {}} onRemoveInvoice={() => {}} onApplyCreditNote={() => {}} onLoadInvoiceForEdit={() => {}} onLoadInvoiceForCredit={() => {}} onLoadDraft={() => {}} onRemoveDraft={() => {}} selectedInvoiceId={null} setSelectedInvoiceId={() => {}} fromCustomerHistory={false} onBackToCustomerHistory={() => {}} onDownloadInvoice={() => {}} onOpenEmailModal={() => {}} />;
            case 'manage-subscription': return <SubscriptionManager currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={setUsers} packages={subscriptionPackages} />;
            default: return <div className="p-8 text-center text-slate-500">View not implemented in this demo fix.</div>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100">
            <aside className="hidden md:flex md:flex-shrink-0 w-64 bg-blue-900">{sidebarContent}</aside>
            <div className="flex flex-col flex-1 w-0 overflow-hidden">
                <main className="flex-1 relative overflow-y-auto p-4">{renderView()}</main>
            </div>
            <ConfirmationModal isOpen={!!confirmation} onClose={() => setConfirmation(null)} title={confirmation?.title || ''} message={confirmation?.message || ''} />
            <CreationTypeModal isOpen={creationTypeModalConfig.isOpen} onClose={() => setCreationTypeModalConfig({ isOpen: false, action: null })} onSelect={(t) => { if (creationTypeModalConfig.action === 'invoice') resetCreator('invoice', t); setCreationTypeModalConfig({ isOpen: false, action: null }); }} />
        </div>
    );
};

const App: React.FC = () => {
    const [users, setUsers, isLoadingUsers] = usePersistence<User[]>('users', []);
    const [currentUser, setCurrentUser, isLoadingCurrentUser] = usePersistence<User | null>('currentUser', null);
    const [subscriptionPackages, setSubscriptionPackages, isLoadingPackages] = usePersistence<SubscriptionPackage[]>('subscription-packages', defaultSubscriptionPackages);

    useEffect(() => {
        if (!isLoadingUsers && (users.length === 0 || !users.some(u => u.role === 'admin'))) {
            const admin: User = { id: 'admin-1', username: 'admin', password: 'password', role: 'admin', teamId: 'admin_team', subscriptionStatus: 'admin_free', isActive: true };
            setUsers([admin]);
        }
    }, [isLoadingUsers, users, setUsers]);

    if (isLoadingUsers || isLoadingCurrentUser || isLoadingPackages) {
        return <div className="flex items-center justify-center min-h-screen bg-slate-100"><div className="loading-spinner"></div></div>;
    }

    if (!currentUser) return <LoginPage onLogin={setCurrentUser} onNavigateToRegister={() => {}} users={users} />;

    return <MainApp currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={setUsers} subscriptionPackages={subscriptionPackages} setSubscriptionPackages={setSubscriptionPackages} />;
};

export default App;