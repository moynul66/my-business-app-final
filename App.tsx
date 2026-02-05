import React, { useState, ReactNode, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
// fix: Import all types from the centralized types.ts file.
import { AppSettings, Category, Customer, InventoryItem, Invoice, InvoiceDraft, InvoiceState, QuoteDraft, Payment, Supplier, PurchaseOrder, PurchaseOrderState, Bill, BillState, User, SupplierInventoryItem, InvoiceCreationType, SubscriptionPackage, MarketplaceAccount, MarketplaceStatement, DailyTaking, TaxMode, Job, JobState, TrackedJob, PackagePermissions, PageKey, CreditNote, CreditNoteState, TaskColumn, TaskGroup, InvoiceLineItem, TrackedJobPriority, Account, ItemType, MeasurementUnit } from './types';
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
import { useLocalStorage } from './hooks/useLocalStorage';


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
    // Explicitly false for pro features
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
    // Income (4000-4999)
    { id: 'acc-inc-1', name: 'Income', type: 'Income', code: '4000', isSystem: true },
    { id: 'acc-inc-2', name: 'Discount', type: 'Income', code: '4001', isSystem: true },
    { id: 'acc-inc-3', name: 'Other Income', type: 'Income', code: '4002', isSystem: true },
    { id: 'acc-inc-4', name: 'Uncategorised Income', type: 'Income', code: '4090', isSystem: true },
    { id: 'acc-inc-5', name: 'Gain On Foreign Exchange', type: 'Income', code: '4900', isSystem: true },

    // Expenses (5000-5999)
    { id: 'acc-exp-1', name: 'Operating Expense', type: 'Expenses', code: '5000', isSystem: true },
    { id: 'acc-exp-2', name: 'Cost of Goods Sold', type: 'Expenses', code: '5100', isSystem: true },
    { id: 'acc-exp-3', name: 'Payment Processing Fee', type: 'Expenses', code: '5200', isSystem: true },
    { id: 'acc-exp-4', name: 'Payroll Expense', type: 'Expenses', code: '5300', isSystem: true },
    { id: 'acc-exp-5', name: 'Uncategorised Expense', type: 'Expenses', code: '5900', isSystem: true },
    { id: 'acc-exp-6', name: 'Loss On Foreign Exchange', type: 'Expenses', code: '5990', isSystem: true },

    // Assets (1000-1999)
    { id: 'acc-asset-1', name: 'Cash and Bank', type: 'Assets', code: '1000', isSystem: true },
    { id: 'acc-asset-2', name: 'Money in Transit', type: 'Assets', code: '1010', isSystem: true },
    { id: 'acc-asset-3', name: 'Expected Payments from Customers', type: 'Assets', code: '1100', isSystem: true },
    { id: 'acc-asset-4', name: 'Inventory', type: 'Assets', code: '1200', isSystem: true },
    { id: 'acc-asset-5', name: 'Property, Plant, Equipment', type: 'Assets', code: '1300', isSystem: true },
    { id: 'acc-asset-6', name: 'Depreciation and Amortisation', type: 'Assets', code: '1350', isSystem: true },
    { id: 'acc-asset-7', name: 'Supplier Prepayments and Supplier Credits', type: 'Assets', code: '1400', isSystem: true },
    { id: 'acc-asset-8', name: 'Other Short-Term Asset', type: 'Assets', code: '1500', isSystem: true },
    { id: 'acc-asset-9', name: 'Other Long-Term Asset', type: 'Assets', code: '1600', isSystem: true },

    // Liabilities (2000-2999)
    { id: 'acc-liab-1', name: 'Credit Card', type: 'Liabilities', code: '2000', isSystem: true },
    { id: 'acc-liab-2', name: 'Loan and Line of Credit', type: 'Liabilities', code: '2100', isSystem: true },
    { id: 'acc-liab-3', name: 'Expected Payments to Suppliers', type: 'Liabilities', code: '2200', isSystem: true },
    { id: 'acc-liab-4', name: 'Sales Taxes', type: 'Liabilities', code: '2300', isSystem: true },
    { id: 'acc-liab-5', name: 'Due For Payroll', type: 'Liabilities', code: '2400', isSystem: true },
    { id: 'acc-liab-6', name: 'Due to You and Other Business Owners', type: 'Liabilities', code: '2500', isSystem: true },
    { id: 'acc-liab-7', name: 'Customer Prepayments and Customer Credits', type: 'Liabilities', code: '2600', isSystem: true },
    { id: 'acc-liab-8', name: 'Other Short-Term Liability', type: 'Liabilities', code: '2700', isSystem: true },
    { id: 'acc-liab-9', name: 'Other Long-Term Liability', type: 'Liabilities', code: '2800', isSystem: true },

    // Equity (3000-3999)
    { id: 'acc-eq-1', name: 'Business Owner Contribution and Drawing', type: 'Equity', code: '3000', isSystem: true },
    { id: 'acc-eq-2', name: 'Retained Earnings: Profit', type: 'Equity', code: '3100', isSystem: true },
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
    reference: '', // Supplier's invoice number
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
  { id: 'default-custom-text', name: 'Text Field', type: 'text', isCustom: true },
  { id: 'default-custom-date', name: 'Date', type: 'date', isCustom: true },
  { id: 'default-custom-deadline', name: 'Deadline', type: 'deadline', isCustom: true },
  {
    id: 'default-custom-jobStatus',
    name: 'Job Status',
    type: 'jobStatus',
    isCustom: true,
    options: [
      { id: 'default-status-1', label: 'New', color: 'bg-blue-500' },
      { id: 'default-status-2', label: 'In Progress', color: 'bg-orange-500' },
      { id: 'default-status-3', label: 'Complete', color: 'bg-green-500' },
      { id: 'default-status-4', label: 'Overdue', color: 'bg-red-500' },
    ],
  },
  {
    id: 'default-custom-priority',
    name: 'Priority',
    type: 'priority',
    isCustom: true,
    options: [
      { id: 'prio-1', label: 'High', color: 'bg-red-500' },
      { id: 'prio-2', label: 'Medium', color: 'bg-orange-500' },
      { id: 'prio-3', label: 'Low', color: 'bg-blue-500' },
    ],
  },
  { id: 'default-custom-notes', name: 'Notes', type: 'notes', isCustom: true },
  { id: 'default-custom-number', name: 'Number', type: 'number', isCustom: true, unit: '' },
  {
    id: 'default-custom-dropdown',
    name: 'Dropdown',
    type: 'dropdown',
    isCustom: true,
    options: [{ id: 'default-opt-1', label: 'Option A', color: 'bg-slate-200' }, { id: 'default-opt-2', label: 'Option B', color: 'bg-slate-200' }],
  },
  { id: 'default-custom-checkbox', name: 'Checkbox', type: 'checkbox', isCustom: true },
  { id: 'default-custom-phone', name: 'Phone', type: 'phone', isCustom: true },
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
        currentUser.permissions.sales === 'none' &&
        currentUser.permissions.purchasing === 'none' &&
        currentUser.permissions.management === 'none' &&
        currentUser.permissions.reports === 'none' &&
        currentUser.permissions.settings === 'none';

    const dataPrefix = (currentUser.role === 'team-member' ? currentUser.teamId : currentUser.id) + '_';
    
    // Persisted Session State
    const [view, setView] = useLocalStorage<View>(`${dataPrefix}active-view`, isJobBoardOnlyUser ? 'job-board' : 'dashboard');
    const [currentMode, setCurrentMode] = useLocalStorage<'invoice' | 'quote' | 'po' | 'bill' | 'job'>(`${dataPrefix}active-mode`, 'invoice');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data state using user-prefixed localStorage keys
    const [settings, setSettings] = useLocalStorage<AppSettings>(`${dataPrefix}app-settings`, defaultSettings);
    const [customers, setCustomers] = useLocalStorage<Customer[]>(`${dataPrefix}customers`, []);
    const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>(`${dataPrefix}suppliers`, []);
    const [inventory, setInventory] = useLocalStorage<InventoryItem[]>(`${dataPrefix}inventory`, []);
    const [supplierInventory, setSupplierInventory] = useLocalStorage<SupplierInventoryItem[]>(`${dataPrefix}supplier-inventory`, []);
    const [categories, setCategories] = useLocalStorage<Category[]>(`${dataPrefix}categories`, []);
    const [supplierCategories, setSupplierCategories] = useLocalStorage<Category[]>(`${dataPrefix}supplier-categories`, []);
    const [invoices, setInvoices] = useLocalStorage<Invoice[]>(`${dataPrefix}invoices`, []);
    const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>(`${dataPrefix}purchase-orders`, []);
    const [bills, setBills] = useLocalStorage<Bill[]>(`${dataPrefix}bills`, []);
    const [jobs, setJobs] = useLocalStorage<Job[]>(`${dataPrefix}jobs`, []);
    const [creditNotes, setCreditNotes] = useLocalStorage<CreditNote[]>(`${dataPrefix}credit-notes`, []);
    const [taskColumns, setTaskColumns] = useLocalStorage<TaskColumn[]>(`${dataPrefix}task-columns`, defaultTaskColumns);
    const [customTaskGroups, setCustomTaskGroups] = useLocalStorage<TaskGroup[]>(`${dataPrefix}custom-task-groups`, [
        {
            id: crypto.randomUUID(),
            name: 'New Group',
            isCollapsed: false,
            columns: defaultCustomTaskColumns,
            tasks: [],
        }
    ]);
    const [accounts, setAccounts] = useLocalStorage<Account[]>(`${dataPrefix}chart-of-accounts`, defaultAccounts);
    
    // Active Creation States (Persisted)
    const [currentInvoiceState, setCurrentInvoiceState] = useLocalStorage<InvoiceState>(`${dataPrefix}current-invoice-state`, getInitialInvoiceState(settings, 'measured'));
    const [currentCreditNoteState, setCurrentCreditNoteState] = useLocalStorage<CreditNoteState | null>(`${dataPrefix}current-credit-note-state`, null);
    const [currentPOState, setCurrentPOState] = useLocalStorage<PurchaseOrderState>(`${dataPrefix}current-po-state`, getInitialPOState());
    const [currentBillState, setCurrentBillState] = useLocalStorage<BillState>(`${dataPrefix}current-bill-state`, getInitialBillState());
    const [currentJobState, setCurrentJobState] = useLocalStorage<JobState>(`${dataPrefix}current-job-state`, getInitialJobState(settings, 'measured'));
    
    const [editingInvoiceId, setEditingInvoiceId] = useLocalStorage<string | null>(`${dataPrefix}editing-invoice-id`, null);
    const [editingQuoteId, setEditingQuoteId] = useLocalStorage<string | null>(`${dataPrefix}editing-quote-id`, null);
    const [editingPOId, setEditingPOId] = useLocalStorage<string | null>(`${dataPrefix}editing-po-id`, null);
    const [editingBillId, setEditingBillId] = useLocalStorage<string | null>(`${dataPrefix}editing-bill-id`, null);
    const [editingJobId, setEditingJobId] = useLocalStorage<string | null>(`${dataPrefix}editing-job-id`, null);
    const [viewingCreditNoteId, setViewingCreditNoteId] = useLocalStorage<string | null>(`${dataPrefix}viewing-credit-note-id`, null);

    // Migration to add codes to system accounts if missing
    useEffect(() => {
        setAccounts(prev => {
            let changed = false;
            const newAccounts = prev.map(acc => {
                if (acc.isSystem && !acc.code) {
                    const defaultAcc = defaultAccounts.find(da => da.name === acc.name && da.type === acc.type);
                    if (defaultAcc && defaultAcc.code) {
                        changed = true;
                        return { ...acc, code: defaultAcc.code };
                    }
                }
                return acc;
            });
            return changed ? newAccounts : prev;
        });
    }, []);

    // Tracked jobs for Master Admin need to aggregate from all users
    const getAggregatedTrackedJobs = (): TrackedJob[] => {
        if (currentUser.role !== 'admin') {
            return []; // Only admin sees all jobs
        }
        const allJobs: TrackedJob[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.endsWith('_tracked-jobs')) {
                const masterId = key.split('_')[0];
                const jobsData = JSON.parse(localStorage.getItem(key) || '[]') as TrackedJob[];
                allJobs.push(...jobsData.map(job => ({ ...job, masterId })));
            }
        }
        return allJobs;
    };
    
    const [trackedJobs, setTrackedJobs] = useLocalStorage<TrackedJob[]>(
        currentUser.role === 'admin' ? 'admin_aggregated_jobs' : `${dataPrefix}tracked-jobs`,
        currentUser.role === 'admin' ? getAggregatedTrackedJobs() : []
    );

    const [invoiceDrafts, setInvoiceDrafts] = useLocalStorage<InvoiceDraft[]>(`${dataPrefix}invoice-drafts`, []);
    const [quoteDrafts, setQuoteDrafts] = useLocalStorage<QuoteDraft[]>(`${dataPrefix}quote-drafts`, []);
    const [dailyTakings, setDailyTakings] = useLocalStorage<DailyTaking[]>(`${dataPrefix}daily-takings`, []);
    
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
    
    useEffect(() => {
        // One-time migration to fix old manual jobs that might be missing the invoiceId: 'MANUAL' flag.
        const jobsNeedMigration = trackedJobs.some(job => job.invoiceNumber === 'Manual Entry' && job.invoiceId !== 'MANUAL');
        if (jobsNeedMigration) {
            setTrackedJobs(prevJobs => {
                return prevJobs.map(job => {
                    if (job.invoiceNumber === 'Manual Entry' && job.invoiceId !== 'MANUAL') {
                        return { ...job, invoiceId: 'MANUAL' };
                    }
                    return job;
                });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isTrialing = currentUser.subscriptionStatus.startsWith('trial_');
    const isTrialExpired = isTrialing && currentUser.trialEndDate && new Date() > new Date(currentUser.trialEndDate);

    const navigate = (targetView: View) => {
        if (view === 'create-credit-note' && viewingCreditNoteId) {
            setViewingCreditNoteId(null);
        }
        if (isTrialExpired && currentUser.role !== 'admin') {
            setView('manage-subscription');
        } else {
            setView(targetView);
        }
    };

    useEffect(() => {
        if (isTrialExpired && currentUser.role !== 'admin') {
            setView('manage-subscription');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTrialExpired, currentUser.role]);


    useEffect(() => {
        if (view !== 'manage-invoices') {
            setFromCustomerHistory(false);
        }
    }, [view]);

    const handleLogout = () => {
        setCurrentUser(null);
    };

    const userPackagePermissions = useMemo(() => {
        let userForSubscription = currentUser;
        if (currentUser.role === 'team-member') {
            const masterUser = users.find(u => u.id === currentUser.teamId);
            userForSubscription = masterUser || currentUser;
        }

        if (userForSubscription.role === 'admin' || userForSubscription.subscriptionStatus === 'lifetime_free') {
            return { allowFixedPrice: true, allowMeasuredPrice: true };
        }
        
        const packageId = userForSubscription.subscriptionStatus.replace(/^(trial_|package_)/, '');
        const currentPackage = subscriptionPackages.find(p => p.id === packageId);
        
        if (!currentPackage) {
            return { allowFixedPrice: false, allowMeasuredPrice: false };
        }
        
        return {
            allowFixedPrice: currentPackage.allowFixedPrice ?? false,
            allowMeasuredPrice: currentPackage.allowMeasuredPrice ?? false,
        };
    }, [currentUser, users, subscriptionPackages]);

    const resetCreator = (mode: 'invoice' | 'quote', type: InvoiceCreationType) => {
        const nextNumber = mode === 'invoice' ? settings.nextInvoiceNumber || 1 : settings.nextQuoteNumber || 1;
        const prefix = mode === 'invoice' 
            ? (settings.invoiceTitle || 'Invoice').replace(/\s+/g, '') 
            : (settings.quoteTitle || 'Quote').replace(/\s+/g, '');
        setCurrentMode(mode);
        setEditingInvoiceId(null);
        setEditingQuoteId(null);
        setCurrentInvoiceState({
            ...getInitialInvoiceState(settings, type),
            invoiceNumber: `${prefix}-${String(nextNumber).padStart(4, '0')}`,
            reference: '',
        });
        navigate(mode === 'invoice' ? 'create-invoice' : 'create-quote');
    };

    const handleCreateQuoteFromJobs = (customerName: string, lineItems: InvoiceLineItem[]) => {
        const nextQuoteNumber = settings.nextQuoteNumber || 1;
        const prefix = (settings.quoteTitle || 'Quote').replace(/\s+/g, '');
        setCurrentMode('quote');
        setEditingInvoiceId(null);
        setEditingQuoteId(null);
        
        // Determine the invoice type based on user's subscription
        const invoiceType: InvoiceCreationType = userPackagePermissions.allowMeasuredPrice ? 'measured' : 'fixed';
        
        const newState = getInitialInvoiceState(settings, invoiceType);
        
        setCurrentInvoiceState({
            ...newState,
            customerName: customerName,
            invoiceNumber: `${prefix}-${String(nextQuoteNumber).padStart(4, '0')}`,
            lineItems: lineItems,
            invoiceType: invoiceType, 
        });
        navigate('create-quote');
    };

    const resetPOCreator = () => {
        setCurrentMode('po');
        setEditingPOId(null);
        const nextPoNumber = settings.nextPoNumber || 1;
        const prefix = settings.poPrefix || 'PO';
        setCurrentPOState({
            ...getInitialPOState(),
            poNumber: `${prefix}-${String(nextPoNumber).padStart(4, '0')}`,
        });
        navigate('create-purchase-order');
    };

    const resetBillCreator = () => {
        setCurrentMode('bill');
        setEditingBillId(null);
        setCurrentBillState(getInitialBillState());
        navigate('create-bill');
    };

    const resetJobBuilder = (type: InvoiceCreationType) => {
        setCurrentMode('job');
        setEditingJobId(null);
        const nextJobNumber = settings.nextJobNumber || 1;
        setCurrentJobState({
            ...getInitialJobState(settings, type),
            jobNumber: `JOB-${String(nextJobNumber).padStart(4, '0')}`,
        });
        navigate('job-builder');
    };
    
    const resetCreditNoteCreator = () => {
        setViewingCreditNoteId(null);
        const nextCreditNoteNumber = settings.nextCreditNoteNumber || 1;
        setCurrentCreditNoteState({
            customerName: '',
            reference: '',
            originalInvoiceNumber: undefined,
            creditNoteNumber: `CN-${String(nextCreditNoteNumber).padStart(4, '0')}`,
            issueDate: new Date().toISOString().split('T')[0],
            lineItems: [],
            notes: '',
            taxMode: settings.defaultVatRate > 0 ? 'exclusive' : 'none',
            invoiceType: 'fixed',
        });
        navigate('create-credit-note');
    };

    const handleNewDocumentClick = (action: 'invoice' | 'quote' | 'job') => {
        const { allowFixedPrice, allowMeasuredPrice } = userPackagePermissions;

        if (allowFixedPrice && allowMeasuredPrice) {
            setCreationTypeModalConfig({ isOpen: true, action });
        } else if (allowFixedPrice) {
            action === 'job' ? resetJobBuilder('fixed') : resetCreator(action, 'fixed');
        } else if (allowMeasuredPrice) {
            action === 'job' ? resetJobBuilder('measured') : resetCreator(action, 'measured');
        } else {
            alert("Your subscription does not permit creating this type of document. Please check your package settings.");
        }
    };

    const handleSelectCreationType = (type: InvoiceCreationType) => {
        const { action } = creationTypeModalConfig;
        if (action) {
            if (action === 'job') {
                resetJobBuilder(type);
            } else {
                resetCreator(action, type);
            }
        }
        setCreationTypeModalConfig({ isOpen: false, action: null });
    };
    
    // CRUD Handlers
    const handleSaveSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        navigate('dashboard');
        setConfirmation({ title: 'Success', message: 'Settings have been saved successfully.' });
    };

    const handleAddCustomer = (customer: Omit<Customer, 'id'>) => {
        const newCustomer: Customer = { ...customer, id: crypto.randomUUID() };
        setCustomers(prev => [...prev, newCustomer]);
        setConfirmation({ title: 'Success', message: `Customer "${newCustomer.name}" has been saved.` });
    };

    const handleAddSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => {
        const newSupplier: Supplier = { ...supplier, id: crypto.randomUUID() };
        setSuppliers(prev => [...prev, newSupplier]);
        setConfirmation({ title: 'Success', message: `Supplier "${newSupplier.name}" has been saved.` });
        return newSupplier;
    };

    // Inventory Bulk Handlers
    const handleUpdateInventoryItems = (items: InventoryItem[]) => {
        setInventory(prev => {
            const itemMap = new Map(items.map(i => [i.id, i]));
            return prev.map(i => itemMap.has(i.id) ? itemMap.get(i.id)! : i);
        });
    };

    const handleRemoveInventoryItems = (ids: string[]) => {
        setInventory(prev => prev.filter(i => !ids.includes(i.id)));
    };

    const handleAddDailyTaking = (taking: Omit<DailyTaking, 'id'>) => {
        const newTaking = {
            ...taking,
            id: crypto.randomUUID(),
        };
        setDailyTakings(prev => [...prev, newTaking]);
        setConfirmation({ title: 'Success', message: 'Daily taking has been recorded.' });
    };

    const handleUpdateDailyTaking = (updatedTaking: DailyTaking) => {
        setDailyTakings(prev => prev.map(t => t.id === updatedTaking.id ? updatedTaking : t));
        setConfirmation({ title: 'Success', message: 'Daily taking has been updated.' });
    };

    const handleRemoveDailyTaking = (takingId: string) => {
        setDailyTakings(prev => prev.filter(t => t.id !== takingId));
        setConfirmation({ title: 'Success', message: 'Taking has been removed.' });
    };

    const handleAddAccount = (account: Omit<Account, 'id'>) => {
        const newAccount = { ...account, id: crypto.randomUUID() };
        setAccounts(prev => [...prev, newAccount]);
        setConfirmation({ title: 'Success', message: 'Account has been added.' });
    };

    const handleUpdateAccount = (account: Account) => {
        setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
        setConfirmation({ title: 'Success', message: 'Account has been updated.' });
    };

    const handleRemoveAccount = (accountId: string) => {
        setAccounts(prev => prev.filter(a => a.id !== accountId));
        setConfirmation({ title: 'Success', message: 'Account has been removed.' });
    };


    const handleSaveDraft = (total: number) => {
        const name = `Draft for ${currentInvoiceState.customerName || 'N/A'} - #${currentInvoiceState.invoiceNumber}`;
        const newDraft: InvoiceDraft = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
            state: currentInvoiceState,
            total,
        };
        setInvoiceDrafts(prev => [...prev, newDraft]);
        navigate('manage-invoices');
        setConfirmation({ title: 'Success', message: 'Invoice draft has been saved.' });
    };

    const handleSaveQuote = (total: number) => {
        const name = `Quote for ${currentInvoiceState.customerName || 'N/A'} - #${currentInvoiceState.invoiceNumber}`;
        const newQuote: QuoteDraft = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
            state: currentInvoiceState,
            total,
        };
        setQuoteDrafts(prev => [...prev, newQuote]);
        
        const nextQuoteNumber = settings.nextQuoteNumber || 1;
        const prefix = (settings.quoteTitle || 'Quote').replace(/\s+/g, '');
        const expectedNumber = `${prefix}-${String(nextQuoteNumber).padStart(4, '0')}`;

        if(currentInvoiceState.invoiceNumber === expectedNumber){
            setSettings(s => ({ ...s, nextQuoteNumber: (s.nextQuoteNumber || 1) + 1 }));
        }
        
        navigate('manage-quotes');
        setConfirmation({ title: 'Success', message: 'Quote has been saved.' });
    };

    const handleUpdateQuote = (total: number) => {
        if (!editingQuoteId) return;
        const name = `Quote for ${currentInvoiceState.customerName || 'N/A'} - #${currentInvoiceState.invoiceNumber}`;
        setQuoteDrafts(prev => prev.map(q => q.id === editingQuoteId ? {
            ...q,
            name,
            state: currentInvoiceState,
            total
        } : q));
        
        setEditingQuoteId(null);
        navigate('manage-quotes');
        setConfirmation({ title: 'Success', message: 'Quote updated successfully.' });
    };

    const handleSavePurchaseOrder = (state: PurchaseOrderState, total: number) => {
        const name = `PO Draft for ${state.supplierName || 'N/A'} - #${state.poNumber}`;
        const newPO: PurchaseOrder = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
            state,
            total,
            status: 'draft',
            payments: [],
        };
        setPurchaseOrders(prev => [...prev, newPO]);
        navigate('manage-purchase-orders');
        setConfirmation({ title: 'Success', message: 'Purchase Order draft has been saved.' });
    };
    
    const handleUpdatePurchaseOrder = (poData: { id: string; state: PurchaseOrderState; total: number }) => {
        const name = `PO Draft for ${poData.state.supplierName || 'N/A'} - #${poData.state.poNumber}`;
        const originalPO = purchaseOrders.find(p => p.id === poData.id);
        
        const updatedPO: PurchaseOrder = {
            id: poData.id,
            name,
            createdAt: originalPO ? originalPO.createdAt : new Date().toISOString(),
            state: poData.state,
            total: poData.total,
            status: 'draft',
            payments: originalPO ? originalPO.payments : [],
        };
        
        setPurchaseOrders(prev => prev.map(p => p.id === updatedPO.id ? updatedPO : p));
        navigate('manage-purchase-orders');
        setEditingPOId(null);
        setConfirmation({ title: 'Success', message: 'Purchase Order draft has been updated.' });
    };

    const handleApprovePurchaseOrder = (poData: { id: string | null, state: PurchaseOrderState, total: number }) => {
        const name = `PO for ${poData.state.supplierName || 'N/A'} - #${poData.state.poNumber}`;
        
        if (poData.id) { // Updating and approving an existing draft
            const originalPO = purchaseOrders.find(p => p.id === poData.id);
            const approvedPO: PurchaseOrder = {
                id: poData.id,
                name,
                createdAt: originalPO ? originalPO.createdAt : new Date().toISOString(),
                state: poData.state,
                total: poData.total,
                status: 'approved',
                payments: originalPO ? originalPO.payments : [],
            };
            setPurchaseOrders(prev => prev.map(p => p.id === approvedPO.id ? approvedPO : p));
        } else { // Creating and approving a new PO
            const newPO: PurchaseOrder = {
                id: crypto.randomUUID(),
                name,
                createdAt: new Date().toISOString(),
                state: poData.state,
                total: poData.total,
                status: 'approved',
                payments: [],
            };
            setPurchaseOrders(prev => [...prev, newPO]);
        }

        const nextPoNumber = settings.nextPoNumber || 1;
        const prefix = settings.poPrefix || 'PO';
        const expectedPoNumber = `${prefix}-${String(nextPoNumber).padStart(4, '0')}`;
        if (poData.state.poNumber === expectedPoNumber) {
            setSettings(s => ({ ...s, nextPoNumber: (s.nextPoNumber || 1) + 1 }));
        }

        navigate('manage-purchase-orders');
        setEditingPOId(null);
        setConfirmation({ title: 'Success', message: 'Purchase Order has been approved.' });
    };

     const handleSaveBill = (state: BillState, total: number) => {
        const newBill: Bill = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            state,
            total,
            payments: [],
        };
        setBills(prev => [...prev, newBill]);
        navigate('manage-bills');
        setConfirmation({ title: 'Success', message: 'Bill has been saved.' });
    };

    const handleUpdateBill = (billData: { id: string; state: BillState; total: number }) => {
        const originalBill = bills.find(b => b.id === billData.id);
        const updatedBill: Bill = {
            id: billData.id,
            createdAt: originalBill ? originalBill.createdAt : new Date().toISOString(),
            state: billData.state,
            total: billData.total,
            payments: originalBill ? originalBill.payments : [],
        };
        setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
        navigate('manage-bills');
        setEditingBillId(null);
        setConfirmation({ title: 'Success', message: 'Bill has been updated.' });
    };

    const getSupplierCategoryIdsForItem = (inventoryItemId: string | null) => {
        if (!inventoryItemId) return [];
        const invItem = inventory.find(i => i.id === inventoryItemId);
        if (!invItem || !invItem.linkedSupplierItemIds) return [];
        
        const catIds = invItem.linkedSupplierItemIds
            .map(sid => supplierInventory.find(si => si.id === sid)?.categoryId)
            .filter((cid): cid is string => !!cid);
            
        return Array.from(new Set(catIds));
    };

    const handleFinalizeInvoice = (state: InvoiceState, total: number) => {
        const name = `Invoice for ${state.customerName || 'N/A'} - #${state.invoiceNumber}`;
        const newInvoice: Invoice = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
            state,
            total,
            payments: [],
            linkedBillIds: state.linkedBillIds || [],
        };
        setInvoices(prev => [...prev, newInvoice]);

        const newJobs: TrackedJob[] = state.lineItems.map(item => ({
            id: crypto.randomUUID(),
            invoiceId: newInvoice.id,
            invoiceNumber: state.invoiceNumber,
            customerName: state.customerName,
            description: item.description || 'No Description',
            dueDate: state.completionDate || state.dueDate,
            status: 'new',
            createdAt: new Date().toISOString(),
            priority: 'medium',
            supplierCategoryIds: getSupplierCategoryIdsForItem(item.inventoryItemId)
        }));

        setTrackedJobs(prev => [...prev, ...newJobs]);

        const nextInvoiceNumber = settings.nextInvoiceNumber || 1;
        const prefix = (settings.invoiceTitle || 'Invoice').replace(/\s+/g, '');
        const expectedNumber = `${prefix}-${String(nextInvoiceNumber).padStart(4, '0')}`;
        
        if (state.invoiceNumber === expectedNumber) {
            setSettings(s => ({ ...s, nextInvoiceNumber: (s.nextInvoiceNumber || 1) + 1 }));
        }

        navigate('manage-invoices');
        setConfirmation({ title: 'Success', message: 'Invoice has been finalized and saved.' });
    };
    
    const handleUpdateInvoice = (state: InvoiceState, total: number) => {
        if (!editingInvoiceId) return;

        const updatedInvoices = invoices.map(inv => {
            if (inv.id === editingInvoiceId) {
                return {
                    ...inv,
                    name: `Invoice for ${state.customerName || 'N/A'} - #${state.invoiceNumber}`,
                    state,
                    total,
                };
            }
            return inv;
        });
        setInvoices(updatedInvoices);

        // Remove old jobs associated with this invoice and create new ones
        const otherJobs = trackedJobs.filter(job => job.invoiceId !== editingInvoiceId);
        const newJobs: TrackedJob[] = state.lineItems.map(item => ({
            id: crypto.randomUUID(),
            invoiceId: editingInvoiceId,
            invoiceNumber: state.invoiceNumber,
            customerName: state.customerName,
            description: item.description || 'No Description',
            dueDate: state.completionDate || state.dueDate,
            status: 'new',
            createdAt: new Date().toISOString(),
            priority: 'medium',
            supplierCategoryIds: getSupplierCategoryIdsForItem(item.inventoryItemId)
        }));
        setTrackedJobs([...otherJobs, ...newJobs]);

        setEditingInvoiceId(null);
        navigate('manage-invoices');
        setConfirmation({ title: 'Success', message: 'Invoice has been updated successfully.' });
    };

    const handleRemoveInvoice = (id: string) => {
        if (window.confirm('Are you sure you want to delete this finalized invoice? This will also remove associated tracked jobs.')) {
            setInvoices(prev => prev.filter(inv => inv.id !== id));
            setTrackedJobs(prev => prev.filter(job => job.invoiceId !== id));
            setConfirmation({ title: 'Success', message: 'Invoice and associated jobs have been deleted.' });
        }
    };


    const handleUpdateTrackedJob = (updatedJob: TrackedJob) => {
        if (currentUser.role === 'admin' && updatedJob.masterId) {
            const masterId = updatedJob.masterId;
            const key = `${masterId}_tracked-jobs`;
            const masterJobs = JSON.parse(localStorage.getItem(key) || '[]') as TrackedJob[];
            const updatedMasterJobs = masterJobs.map(job => job.id === updatedJob.id ? updatedJob : job);
            localStorage.setItem(key, JSON.stringify(updatedMasterJobs));
            // Also update the aggregated state
            setTrackedJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
        } else {
            setTrackedJobs(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
        }
    };
    
    const handleDeleteTrackedJob = (jobId: string) => {
        if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
            return;
        }

        const jobToDelete = trackedJobs.find(job => job.id === jobId);
        if (!jobToDelete) return;

        if (currentUser.role === 'admin' && jobToDelete.masterId) {
            const masterId = jobToDelete.masterId;
            const key = `${masterId}_tracked-jobs`;
            const masterJobs = JSON.parse(localStorage.getItem(key) || '[]') as TrackedJob[];
            const updatedMasterJobs = masterJobs.filter(job => job.id !== jobId);
            localStorage.setItem(key, JSON.stringify(updatedMasterJobs));
            // Also update the aggregated state
            setTrackedJobs(prev => prev.filter(job => job.id !== jobId));
        } else {
            setTrackedJobs(prev => prev.filter(job => job.id !== jobId));
        }
        setConfirmation({ title: 'Success', message: 'Job has been deleted.' });
    };

    const handleCreateManualJob = (jobData: { 
        customerName: string; 
        description: string; 
        dueDate: string; 
        priority: TrackedJobPriority; 
        assignedTeamMemberId?: string; 
        masterId: string; 
    }) => {
        const newJob: TrackedJob = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            invoiceId: 'MANUAL',
            invoiceNumber: 'Manual Entry',
            status: 'new',
            customerName: jobData.customerName,
            description: jobData.description,
            dueDate: jobData.dueDate,
            priority: jobData.priority,
            assignedTeamMemberId: jobData.assignedTeamMemberId,
            masterId: jobData.masterId,
        };

        if (currentUser.role === 'admin' && newJob.masterId && newJob.masterId !== currentUser.id) {
            const masterId = newJob.masterId;
            const key = `${masterId}_tracked-jobs`;
            const masterJobs = JSON.parse(localStorage.getItem(key) || '[]') as TrackedJob[];
            const updatedMasterJobs = [...masterJobs, newJob];
            localStorage.setItem(key, JSON.stringify(updatedMasterJobs));
        }
        
        setTrackedJobs(prev => [...prev, newJob]);
        setConfirmation({ title: 'Success', message: 'New job has been created.' });
    };
    
    // Group-based task handlers
    const handleUpdateCustomTask = (groupId: string, updatedTask: TrackedJob) => {
        setCustomTaskGroups(prev => prev.map(group => 
            group.id === groupId
                ? { ...group, tasks: group.tasks.map(task => task.id === updatedTask.id ? updatedTask : task) }
                : group
        ));
    };

    const handleCreateCustomTask = (groupId: string | undefined, taskData: Omit<TrackedJob, 'id' | 'createdAt'>) => {
        const newTask: TrackedJob = {
            ...taskData,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };

        setCustomTaskGroups(prev => {
            if (!groupId) {
                // If no group ID, add to the first group.
                if (prev.length > 0) {
                    const newGroups = [...prev];
                    newGroups[0] = { ...newGroups[0], tasks: [...newGroups[0].tasks, newTask] };
                    return newGroups;
                }
                return prev; // Or create a new group? For now, do nothing if no groups exist.
            }

            const targetGroupIndex = prev.findIndex(g => g.id === groupId);
            if (targetGroupIndex === -1) return prev;
            
            return prev.map((group, index) => 
                index === targetGroupIndex
                    ? { ...group, tasks: [...group.tasks, newTask] }
                    : group
            );
        });
    };

    const handleDeleteCustomTask = (groupId: string, taskId: string) => {
         if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            setCustomTaskGroups(prev => prev.map(group =>
                group.id === groupId
                    ? { ...group, tasks: group.tasks.filter(task => task.id !== taskId) }
                    : group
            ));
        }
    };

    const handleAddCustomGroup = (afterGroupId?: string) => {
        const newGroup: TaskGroup = {
            id: crypto.randomUUID(),
            name: 'New Group',
            isCollapsed: false,
            columns: defaultCustomTaskColumns, // Each group gets its own default columns
            tasks: [],
        };

        setCustomTaskGroups(prev => {
            if (afterGroupId) {
                const index = prev.findIndex(g => g.id === afterGroupId);
                if (index !== -1) {
                    const newGroups = [...prev];
                    newGroups.splice(index + 1, 0, newGroup);
                    return newGroups;
                }
            }
            return [...prev, newGroup];
        });
    };

    const handleDeleteGroup = (groupId: string) => {
        if (window.confirm('Are you sure you want to delete this entire group and all its tasks? This action cannot be undone.')) {
            setCustomTaskGroups(prev => prev.filter(group => group.id !== groupId));
        }
    };

    const handleUpdateGroup = (groupId: string, updates: Partial<Pick<TaskGroup, 'name' | 'isCollapsed' | 'color'>>) => {
        setCustomTaskGroups(prev => prev.map(group => 
            group.id === groupId ? { ...group, ...updates } : group
        ));
    };
    
    const handleUpdateGroupColumns = (groupId: string, newColumns: TaskColumn[]) => {
        setCustomTaskGroups(prev => prev.map(group => 
            group.id === groupId ? { ...group, columns: newColumns } : group
        ));
    };

    const handleDuplicateGroup = (groupId: string) => {
        setCustomTaskGroups(prev => {
            const groupIndex = prev.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return prev;
            
            const originalGroup = prev[groupIndex];
            const newGroup = JSON.parse(JSON.stringify(originalGroup)); // Deep copy

            newGroup.id = crypto.randomUUID();
            newGroup.name = `Copy of ${originalGroup.name}`;
            newGroup.tasks = newGroup.tasks.map((task: TrackedJob) => ({
                ...task,
                id: crypto.randomUUID(),
            }));

            const newGroups = [...prev];
            newGroups.splice(groupIndex + 1, 0, newGroup);
            return newGroups;
        });
    };

    const handleDuplicateColumn = (groupId: string, columnId: string) => {
        setCustomTaskGroups(prevGroups => {
            const groupIndex = prevGroups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return prevGroups;
    
            const originalGroup = prevGroups[groupIndex];
            const columnIndex = originalGroup.columns.findIndex(c => c.id === columnId);
            if (columnIndex === -1) return prevGroups;
    
            const originalColumn = originalGroup.columns[columnIndex];
    
            // 1. Create the new column definition
            const newColumn: TaskColumn = {
                ...JSON.parse(JSON.stringify(originalColumn)), // Deep copy
                id: crypto.randomUUID(),
                name: `Copy of ${originalColumn.name}`,
                isFrozen: false,
            };
    
            // 2. Update tasks with duplicated data
            const updatedTasks = originalGroup.tasks.map(task => {
                const valueToCopy = task.customFields?.[originalColumn.id];
    
                if (valueToCopy !== undefined) {
                    return {
                        ...task,
                        customFields: {
                            ...(task.customFields || {}),
                            [newColumn.id]: valueToCopy,
                        },
                    };
                }
                return task;
            });
    
            // 3. Create new columns array
            const newColumns = [...originalGroup.columns];
            newColumns.splice(columnIndex + 1, 0, newColumn);
    
            // 4. Update the group in the state
            const newGroups = [...prevGroups];
            newGroups[groupIndex] = {
                ...originalGroup,
                columns: newColumns,
                tasks: updatedTasks,
            };
    
            return newGroups;
        });
    };


    const handleSaveJob = (jobData: { state: JobState; totalSale: number; totalCost: number }) => {
        const name = `Job for ${jobData.state.customerName || 'N/A'} - #${jobData.state.jobNumber}`;
        if (editingJobId) {
            const originalJob = jobs.find(j => j.id === editingJobId);
            const updatedJob: Job = {
                ...jobData,
                id: editingJobId,
                name,
                createdAt: originalJob ? originalJob.createdAt : new Date().toISOString(),
            };
            setJobs(prev => prev.map(j => j.id === editingJobId ? updatedJob : j));
            setConfirmation({ title: 'Success', message: `Job ${updatedJob.state.jobNumber} has been updated.` });
        } else {
            const newJob: Job = {
                ...jobData,
                id: crypto.randomUUID(),
                name,
                createdAt: new Date().toISOString(),
            };
            setJobs(prev => [...prev, newJob]);
            setConfirmation({ title: 'Success', message: `Job ${newJob.state.jobNumber} has been saved.` });
            const nextJobNumber = settings.nextJobNumber ?? 1;
            const expectedJobNumber = `JOB-${String(nextJobNumber).padStart(4, '0')}`;
            if (newJob.state.jobNumber === expectedJobNumber) {
                setSettings(s => ({ ...s, nextJobNumber: (s.nextJobNumber ?? 1) + 1 }));
            }
        }
        navigate('manage-jobs');
    };
    
    const handleLoadJob = (jobId: string) => {
        const job = jobs.find(j => j.id === jobId);
        if (job) {
            setEditingJobId(job.id);
            setCurrentJobState(job.state);
            setCurrentMode('job');
            navigate('job-builder');
        }
    };
    
    const handleDeleteJob = (jobId: string) => {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        setConfirmation({ title: 'Success', message: 'Job has been deleted.' });
    };

    const handleJobToQuote = (jobState: JobState) => {
        const nextQuoteNumber = settings.nextQuoteNumber || 1;
        const prefix = (settings.quoteTitle || 'Quote').replace(/\s+/g, '');
        
        const quoteState: InvoiceState = {
            ...jobState,
            invoiceNumber: `${prefix}-${String(nextQuoteNumber).padStart(4, '0')}`,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
            linkedBillIds: [],
        };
        
        setCurrentInvoiceState(quoteState);
        setEditingQuoteId(null);
        setCurrentMode('quote');
        navigate('create-quote');
    };

    const handleJobToInvoice = (jobState: JobState) => {
        const nextInvoiceNumber = settings.nextInvoiceNumber || 1;
        const prefix = (settings.invoiceTitle || 'Invoice').replace(/\s+/g, '');

        const invoiceState: InvoiceState = {
            ...jobState,
            invoiceNumber: `${prefix}-${String(nextInvoiceNumber).padStart(4, '0')}`,
            completionDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
            linkedBillIds: [],
        };
        setCurrentInvoiceState(invoiceState);
        setEditingInvoiceId(null);
        setCurrentMode('invoice');
        navigate('create-invoice');
    };

    const handleLoadDraft = (id: string) => {
        const draft = invoiceDrafts.find(d => d.id === id);
        if (draft) {
            setEditingInvoiceId(null);
            setCurrentInvoiceState({ ...draft.state, _isLoaded: true });
            setCurrentMode('invoice');
            navigate('create-invoice');
            setInvoiceDrafts(drafts => drafts.filter(d => d.id !== id));
        }
    };
    
    const handleRemoveDraft = (id: string) => {
        setInvoiceDrafts(prev => prev.filter(d => d.id !== id));
        setConfirmation({ title: 'Success', message: 'Draft has been deleted.' });
    };
    
    const handleLoadQuote = (id: string) => {
        const quote = quoteDrafts.find(q => q.id === id);
        if (quote) {
            setEditingQuoteId(quote.id);
            setCurrentInvoiceState({ ...quote.state, _isLoaded: true });
            setCurrentMode('quote');
            navigate('create-quote');
        }
    };
    
    const handleLoadInvoiceForEdit = (invoiceId: string) => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
            setEditingInvoiceId(invoice.id);
            setCurrentInvoiceState(invoice.state);
            setCurrentMode('invoice');
            navigate('create-invoice');
        }
    };

    const handleLoadInvoiceForCredit = (invoiceId: string) => {
        setViewingCreditNoteId(null);
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        const nextCreditNoteNumber = settings.nextCreditNoteNumber || 1;
        const creditNoteState: CreditNoteState = {
            customerName: invoice.state.customerName,
            reference: invoice.state.reference,
            originalInvoiceNumber: invoice.state.invoiceNumber,
            creditNoteNumber: `CN-${String(nextCreditNoteNumber).padStart(4, '0')}`,
            issueDate: new Date().toISOString().split('T')[0],
            lineItems: JSON.parse(JSON.stringify(invoice.state.lineItems)), // deep copy
            notes: '',
            taxMode: invoice.state.taxMode,
            invoiceType: invoice.state.invoiceType,
        };

        setCurrentCreditNoteState(creditNoteState);
        navigate('create-credit-note');
    };

    const handleSaveCreditNote = (state: CreditNoteState, total: number) => {
        const newCreditNote: CreditNote = {
            id: crypto.randomUUID(),
            name: `Credit Note for ${state.customerName} - #${state.creditNoteNumber}`,
            createdAt: new Date().toISOString(),
            state,
            total,
            applications: [],
        };

        // If created from an invoice, automatically create an application for the full amount
        if (state.originalInvoiceNumber) {
            const originalInvoice = invoices.find(inv => inv.state.invoiceNumber === state.originalInvoiceNumber);
            if (originalInvoice) {
                newCreditNote.applications.push({
                    invoiceId: originalInvoice.id,
                    amount: total,
                });
            }
        }
        
        setCreditNotes(prev => [...prev, newCreditNote]);
        
        const expectedNumber = `CN-${String(settings.nextCreditNoteNumber || 1).padStart(4, '0')}`;
        if(state.creditNoteNumber === expectedNumber) {
            setSettings(s => ({ ...s, nextCreditNoteNumber: (s.nextCreditNoteNumber || 1) + 1 }));
        }

        navigate('manage-credit-notes');
        setConfirmation({ title: 'Success', message: 'Credit Note has been saved.' });
    };

    const handleApplyCreditNote = (invoiceId: string, creditNoteId: string, amountToApply: number) => {
        setCreditNotes(prevCreditNotes => {
            return prevCreditNotes.map(cn => {
                if (cn.id === creditNoteId) {
                    const existingApplicationIndex = cn.applications.findIndex(app => app.invoiceId === invoiceId);
                    const newApplications = [...cn.applications];

                    if (existingApplicationIndex > -1) {
                        newApplications[existingApplicationIndex].amount += amountToApply;
                    } else {
                        newApplications.push({ invoiceId, amount: amountToApply });
                    }
                    return { ...cn, applications: newApplications };
                }
                return cn;
            });
        });
        setConfirmation({ title: 'Success', message: `Credit of ${settings.currencySymbol || '£'}${amountToApply.toFixed(2)} applied successfully.` });
    };

    const handleViewCreditNote = (creditNoteId: string) => {
        const creditNote = creditNotes.find(cn => cn.id === creditNoteId);
        if (creditNote) {
            setViewingCreditNoteId(creditNote.id);
            setCurrentCreditNoteState(creditNote.state);
            navigate('create-credit-note');
        }
    };
    
    const handleLoadPurchaseOrder = (id: string) => {
        const po = purchaseOrders.find(p => p.id === id);
        if(po) {
            setEditingPOId(id);
            setCurrentPOState(po.state);
            setCurrentMode('po');
            navigate('create-purchase-order');
        }
    };

    const handleLoadBill = (id: string) => {
        const bill = bills.find(b => b.id === id);
        if (bill) {
            setEditingBillId(id);
            setCurrentBillState(bill.state);
            setCurrentMode('bill');
            navigate('create-bill');
        }
    };

    const handleConvertToInvoice = (id: string) => {
        const quote = quoteDrafts.find(q => q.id === id);
        if (quote) {
            const nextInvNumber = settings.nextInvoiceNumber || 1;
            const prefix = (settings.invoiceTitle || 'Invoice').replace(/\s+/g, '');
            const invoiceState: InvoiceState = {
                ...quote.state,
                invoiceNumber: `${prefix}-${String(nextInvNumber).padStart(4, '0')}`,
                reference: quote.state.reference,
                issueDate: new Date().toISOString().split('T')[0],
                completionDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
                taxMode: quote.state.taxMode || 'exclusive',
                linkedBillIds: quote.state.linkedBillIds || [],
            };
            handleFinalizeInvoice(invoiceState, quote.total);
            setQuoteDrafts(quotes => quotes.filter(q => q.id !== id));
            setConfirmation({ title: 'Success', message: `Quote ${quote.name} converted to a new invoice.` });
        }
    };

    const handleAddPayment = (invoiceId: string, payment: Omit<Payment, 'id'>) => {
        setInvoices(invoices => invoices.map(inv => 
            inv.id === invoiceId 
                ? { ...inv, payments: [...inv.payments, { ...payment, id: crypto.randomUUID() }] }
                : inv
        ));
    };

    const handleRemovePayment = (invoiceId: string, paymentId: string) => {
        setInvoices(invoices => invoices.map(inv =>
            inv.id === invoiceId
                ? { ...inv, payments: inv.payments.filter(p => p.id !== paymentId) }
                : inv
        ));
    };
    
    const handleAddBillPayment = (billId: string, payment: Omit<Payment, 'id'>) => {
        setBills(prevBills => prevBills.map(bill => 
            bill.id === billId 
                ? { ...bill, payments: [...bill.payments, { ...payment, id: crypto.randomUUID() }] }
                : bill
        ));
    };

    const handleRemoveBillPayment = (billId: string, paymentId: string) => {
        setBills(prevBills => prevBills.map(bill =>
            bill.id === billId
                ? { ...bill, payments: bill.payments.filter(p => p.id !== paymentId) }
                : bill
        ));
    };

    const handleAddPOPayment = (poId: string, payment: Omit<Payment, 'id'>) => {
        setPurchaseOrders(prevPOs => prevPOs.map(po => 
            po.id === poId 
                ? { ...po, payments: [...po.payments, { ...payment, id: crypto.randomUUID() }] }
                : po
        ));
    };

    const handleRemovePOPayment = (poId: string, paymentId: string) => {
        setPurchaseOrders(prevPOs => prevPOs.map(po =>
            po.id === poId
                ? { ...po, payments: po.payments.filter(p => p.id !== paymentId) }
                : po
        ));
    };

    const handleDownloadPdf = async (data: any, type: string) => {
        let docToPrintData: any = { type, data };

        if (type === 'invoice') {
            const invoice = invoices.find(inv => inv.state.invoiceNumber === data.invoiceNumber);
            if (invoice) {
                const appliedCredits: { number: string; address: string; amount: number }[] = [];
                creditNotes.forEach(cn => {
                    cn.applications.forEach(app => {
                        if (app.invoiceId === invoice.id) {
                            appliedCredits.push({ number: cn.state.creditNoteNumber, amount: app.amount });
                        }
                    });
                });
                docToPrintData.appliedCredits = appliedCredits;
            }
        }

        setDocumentToPrint(docToPrintData);
        await new Promise(r => setTimeout(r, 50));
        
        const printableElement = document.getElementById('printable-document');
        if (printableElement) {
            const canvas = await html2canvas(printableElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            let filename = 'document.pdf';
            if (type === 'invoice' || type === 'quote') {
                filename = `${data.invoiceNumber}.pdf`;
            } else if (type === 'credit-note') {
                filename = `${data.state.creditNoteNumber}.pdf`;
            } else if (type === 'po') {
                filename = `${data.poNumber}.pdf`;
            } else if (type === 'vat-report') {
                const safeStartDate = (data.startDate || 'start').replace(/\//g, '-');
                const safeEndDate = (data.endDate || 'end').replace(/\//g, '-');
                filename = `VAT_Report_${safeStartDate}_to_${safeEndDate}.pdf`;
            } else if (type === 'pnl-report') {
                const safeStartDate = (data.startDate || 'start').replace(/\//g, '-');
                const safeEndDate = (data.endDate || 'end').replace(/\//g, '-');
                filename = `P&L_Report_${safeStartDate}_to_${safeEndDate}.pdf`;
            } else if (type === 'balance-sheet-report') {
                const safeAsOfDate = (data.asOfDate || 'today').replace(/\//g, '-');
                filename = `Balance_Sheet_${safeAsOfDate}.pdf`;
            } else if (type === 'cash-flow-report') {
                const safeStartDate = (data.startDate || 'start').replace(/\//g, '-');
                const safeEndDate = (data.endDate || 'end').replace(/\//g, '-');
                filename = `Cash_Flow_Statement_${safeStartDate}_to_${safeEndDate}.pdf`;
            } else if (type === 'income-by-customer-report') {
                filename = `Income_by_Customer_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            } else if (type === 'paid-to-suppliers-report') {
                filename = `Paid_to_Suppliers_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            } else if (type === 'account-balances-report') {
                filename = `Account_Balances_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            }
            pdf.save(filename);
        }
        setDocumentToPrint(null);
    };

    const handleOpenEmailModal = (doc: Invoice | QuoteDraft) => {
        const customer = customers.find(c => c.name === doc.state.customerName);
        if (!customer || !customer.email) {
            alert('This customer does not have an email address saved. Please add one in the Customer Manager.');
            return;
        }

        const isInvoice = 'payments' in doc;
        const subjectTemplate = isInvoice ? (settings.invoiceEmailSubject || '') : (settings.quoteEmailSubject || '');
        const bodyTemplate = isInvoice ? (settings.invoiceEmailBody || '') : (settings.quoteEmailBody || '');
        
        const replacements: { [key: string]: string } = {
            '[CustomerName]': customer.name,
            '[InvoiceNumber]': doc.state.invoiceNumber,
            '[TotalAmount]': `${settings.currencySymbol || '£'}${doc.total.toFixed(2)}`,
            '[DueDate]': new Date(doc.state.dueDate).toLocaleDateString(),
            '[CompanyName]': settings.companyName,
        };

        let subject = subjectTemplate;
        let body = bodyTemplate;

        for (const placeholder in replacements) {
            subject = subject.replace(new RegExp(placeholder.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), replacements[placeholder]);
            body = body.replace(new RegExp(placeholder.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g'), replacements[placeholder]);
        }
        
        setEmailModalData({
            to: customer.email,
            subject,
            body
        });
    };

    const handleOpenUserEmailModal = (user: User) => {
        if (!user.email) {
            alert(`User "${user.username}" does not have an email address saved.`);
            return;
        }
        setEmailModalData({
            to: user.email,
            subject: '',
            body: `Dear ${user.username},\n\n`,
        });
    };

    const handleViewCustomerHistory = (customerId: string) => {
        setSelectedCustomerId(customerId);
        navigate('customer-history');
    };

    const hasPackagePermission = (page: PageKey) => {
        let userForSubscription = currentUser;
        if (currentUser.role === 'team-member') {
            const masterUser = users.find(u => u.id === currentUser.teamId);
            userForSubscription = masterUser || currentUser;
        }

        if (userForSubscription.role === 'admin' || userForSubscription.subscriptionStatus === 'lifetime_free') {
            return true;
        }

        const packageId = userForSubscription.subscriptionStatus.replace(/^(trial_|package_)/, '');
        const currentPackage = subscriptionPackages.find(p => p.id === packageId);
        
        if (!currentPackage || !currentPackage.permissions) {
            return false; 
        }

        return currentPackage.permissions[page] ?? false;
    };

    const NavLink = ({ icon, label, targetView }: { icon: ReactNode; label: string; targetView: View; }) => (
        <button
            onClick={() => { navigate(targetView); setSidebarOpen(false); }}
            className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                view === targetView ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-blue-800 hover:text-white'
            }`}
        >
            <span className="w-6 h-6 mr-3">{icon}</span>
            <span>{label}</span>
        </button>
    );
    
    const NavButton = ({ icon, label, action }: { icon: ReactNode; label: string; action: () => void; }) => (
         <button
            onClick={() => { action(); setSidebarOpen(false); }}
            className="w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-200 hover:bg-blue-800 hover:text-white"
        >
            <span className="w-6 h-6 mr-3">{icon}</span>
            <span>{label}</span>
        </button>
    );

    const sidebarContent = (
        <>
            <div className="flex items-center justify-center h-16 bg-blue-900 text-white">
                <span className="font-bold text-xl tracking-wide">InQuBu Pro</span>
            </div>
            <nav className="flex-1 px-2 py-4 flex flex-col overflow-y-auto">
                {isJobBoardOnlyUser ? (
                     <div className="flex-grow space-y-2">
                        <NavLink icon={<BriefcaseIcon />} label="Jobs Board" targetView="job-board" />
                    </div>
                ) : (
                    <div className="flex-grow space-y-2">
                        {hasPackagePermission('dashboard') && <NavLink icon={<HomeIcon />} label="Dashboard" targetView="dashboard" />}
                        
                        {(hasPackagePermission('job-builder') || hasPackagePermission('manage-jobs')) && (
                            <CollapsibleNavSection title="Job Costing">
                               {hasPackagePermission('job-builder') && <NavButton icon={<PlusIcon />} label="New Job" action={() => handleNewDocumentClick('job')} />}
                               {hasPackagePermission('manage-jobs') && <NavLink icon={<WrenchScrewdriverIcon />} label="Manage Jobs" targetView="manage-jobs" />}
                            </CollapsibleNavSection>
                        )}

                        {(hasPackagePermission('manage-invoices') || hasPackagePermission('manage-quotes') || hasPackagePermission('manage-drafts') || hasPackagePermission('manage-daily-takings')) && (
                            <CollapsibleNavSection title="Sales" defaultOpen>
                                {hasPackagePermission('manage-quotes') && <NavButton icon={<PlusIcon />} label="New Quote" action={() => handleNewDocumentClick('quote')} />}
                                {hasPackagePermission('manage-invoices') && <NavButton icon={<PlusIcon />} label="New Invoice" action={() => handleNewDocumentClick('invoice')} />}
                                {hasPackagePermission('manage-credit-notes') && <NavButton icon={<PlusIcon />} label="New Credit Note" action={resetCreditNoteCreator} />}
                                {hasPackagePermission('manage-invoices') && <NavLink icon={<CreditCardIcon />} label="Invoices" targetView="manage-invoices" />}
                                {hasPackagePermission('manage-quotes') && <NavLink icon={<ChatBubbleBottomCenterTextIcon />} label="Quotes" targetView="manage-quotes" />}
                                {hasPackagePermission('manage-drafts') && <NavLink icon={<DocumentDuplicateIcon />} label="Drafts" targetView="manage-drafts" />}
                                {hasPackagePermission('manage-credit-notes') && <NavLink icon={<DocumentMinusIcon />} label="Credit Notes" targetView="manage-credit-notes" />}
                                {hasPackagePermission('manage-daily-takings') && <NavLink icon={<CurrencyPoundIcon />} label="Daily Takings" targetView="manage-daily-takings" />}
                            </CollapsibleNavSection>
                        )}

                        {(hasPackagePermission('manage-purchase-orders') || hasPackagePermission('manage-bills')) && (
                            <CollapsibleNavSection title="Purchasing">
                                {hasPackagePermission('manage-purchase-orders') && <NavButton icon={<PlusIcon />} label="New PO" action={resetPOCreator} />}
                                {hasPackagePermission('manage-bills') && <NavButton icon={<PlusIcon />} label="New Bill" action={resetBillCreator} />}
                                {hasPackagePermission('manage-purchase-orders') && <NavLink icon={<ClipboardDocumentListIcon />} label="Purchase Orders" targetView="manage-purchase-orders" />}
                                {hasPackagePermission('manage-bills') && <NavLink icon={<ReceiptIcon />} label="Bills" targetView="manage-bills" />}
                            </CollapsibleNavSection>
                        )}
                        
                        {(hasPackagePermission('manage-customers') || hasPackagePermission('manage-suppliers')) && (
                            <CollapsibleNavSection title="Customers & Suppliers">
                                {hasPackagePermission('manage-customers') && <NavLink icon={<PlusIcon />} label="Add Customer" targetView="add-customer" />}
                                {hasPackagePermission('manage-customers') && <NavLink icon={<UsersIcon />} label="All Customers" targetView="manage-customers" />}
                                {hasPackagePermission('manage-suppliers') && <NavLink icon={<PlusIcon />} label="Add Supplier" targetView="add-supplier" />}
                                {hasPackagePermission('manage-suppliers') && <NavLink icon={<TruckIcon />} label="All Suppliers" targetView="manage-suppliers" />}
                            </CollapsibleNavSection>
                        )}

                        {(hasPackagePermission('manage-chart-of-accounts') || hasPackagePermission('reports')) && (
                            <CollapsibleNavSection title="Accounting">
                                {hasPackagePermission('manage-chart-of-accounts') && <NavLink icon={<BookOpenIcon />} label="Chart of Accounts" targetView="manage-chart-of-accounts" />}
                                {hasPackagePermission('reports') && <NavLink icon={<ChartBarIcon />} label="Reports" targetView="reports" />}
                                {hasPackagePermission('reports') && <NavLink icon={<CurrencyPoundIcon />} label="VAT Overview" targetView="dashboard" />}
                            </CollapsibleNavSection>
                        )}
                        
                        {(hasPackagePermission('manage-inventory') || hasPackagePermission('manage-supplier-inventory') || hasPackagePermission('job-board')) && (
                            <CollapsibleNavSection title="Inventory">
                                {hasPackagePermission('manage-inventory') && <NavLink icon={<DocumentTextIcon />} label="Customer Inventory" targetView="manage-inventory" />}
                                {hasPackagePermission('manage-supplier-inventory') && <NavLink icon={<ArchiveBoxIcon />} label="Supplier Inventory" targetView="manage-supplier-inventory" />}
                                {hasPackagePermission('job-board') && <NavLink icon={<BriefcaseIcon />} label="Jobs Board" targetView="job-board" />}
                            </CollapsibleNavSection>
                        )}

                        <CollapsibleNavSection title="System">
                             {hasPackagePermission('settings') && <NavLink icon={<CogIcon />} label="Settings" targetView="settings" />}
                            {currentUser.role === 'admin' && (
                                <>
                                    <NavLink icon={<CurrencyPoundIcon />} label="Package Settings" targetView="manage-package-settings" />
                                    <NavLink icon={<UserGroupIcon />} label="Team Members" targetView="manage-team-members" />
                                </>
                            )}
                            {(currentUser.role === 'admin' || currentUser.role === 'master') && (
                                <NavLink icon={<UsersIcon />} label="Manage Users" targetView="user-management" />
                            )}
                            {currentUser.subscriptionStatus !== 'lifetime_free' && (
                                <NavLink icon={<StarIcon />} label="Subscription" targetView="manage-subscription" />
                            )}
                        </CollapsibleNavSection>
                    </div>
                )}
                <div className="mt-auto pt-2 space-y-2">
                    <NavButton icon={<ArrowLeftOnRectangleIcon />} label="Logout" action={handleLogout} />
                </div>
            </nav>
        </>
    );
    
    // fix: Implement renderView function to resolve "Cannot find name 'renderView'" error.
    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <SummaryDashboard 
                    invoices={invoices}
                    quotes={quoteDrafts}
                    drafts={invoiceDrafts}
                    purchaseOrders={purchaseOrders}
                    bills={bills}
                    creditNotes={creditNotes}
                    settings={settings}
                    inventory={inventory}
                    trackedJobs={trackedJobs}
                    onViewJob={() => navigate('job-board')}
                    onDownloadVatReportPdf={(data) => handleDownloadPdf(data, 'vat-report')}
                />;
            case 'create-invoice':
            case 'create-quote': {
                const unlinkedBills = bills.filter(bill => !invoices.some(inv => (inv.linkedBillIds || []).includes(bill.id)));
                const editingInvoiceObject = editingInvoiceId ? invoices.find(inv => inv.id === editingInvoiceId) : null;
                return <InvoiceCreator 
                    mode={currentMode as 'invoice' | 'quote'}
                    editingInvoice={editingInvoiceObject}
                    editingQuoteId={editingQuoteId}
                    invoiceState={currentInvoiceState}
                    setInvoiceState={setCurrentInvoiceState}
                    inventory={inventory}
                    customers={customers}
                    settings={settings}
                    categories={categories}
                    bills={bills}
                    unlinkedBills={unlinkedBills}
                    creditNotes={creditNotes}
                    accounts={accounts}
                    onSaveDraft={handleSaveDraft}
                    onSaveQuote={handleSaveQuote}
                    onUpdateQuote={handleUpdateQuote}
                    onFinalizeInvoice={handleFinalizeInvoice}
                    onUpdateInvoice={handleUpdateInvoice}
                    onDownloadPdf={() => handleDownloadPdf(currentInvoiceState, currentMode as 'invoice' | 'quote')}
                    onAddCustomer={handleAddCustomer}
                    onViewCreditNote={handleViewCreditNote}
                    onCancel={() => {
                        setEditingInvoiceId(null);
                        setEditingQuoteId(null);
                        setCurrentInvoiceState(getInitialInvoiceState(settings, 'measured'));
                        navigate(currentMode === 'invoice' ? 'manage-invoices' : 'manage-quotes');
                    }}
                />;
            }
            case 'create-purchase-order':
                return <PurchaseOrderCreator 
                    editingPOId={editingPOId}
                    poState={currentPOState}
                    setPOState={setCurrentPOState}
                    suppliers={suppliers}
                    settings={settings}
                    supplierInventory={supplierInventory}
                    onSave={handleSavePurchaseOrder}
                    onUpdate={handleUpdatePurchaseOrder}
                    onApprove={handleApprovePurchaseOrder}
                    onDownloadPdf={() => handleDownloadPdf(currentPOState, 'po')}
                    onAddSupplier={handleAddSupplier}
                />;
            case 'create-bill':
                return <BillCreator
                    editingBillId={editingBillId}
                    billState={currentBillState}
                    setBillState={setCurrentBillState}
                    suppliers={suppliers}
                    settings={settings}
                    supplierInventory={supplierInventory}
                    onSave={handleSaveBill}
                    onUpdate={handleUpdateBill}
                    onAddSupplier={handleAddSupplier}
                />;
            case 'manage-inventory':
                return <InventoryManager 
                    inventory={inventory}
                    supplierInventory={supplierInventory}
                    categories={categories}
                    settings={settings}
                    currentUser={currentUser}
                    canUseMeasured={userPackagePermissions.allowMeasuredPrice}
                    onAddItem={(item) => setInventory(prev => [...prev, { ...item, id: crypto.randomUUID() }])}
                    onAddItems={(items) => {
                        const newItems = items.map(item => ({ ...item, id: crypto.randomUUID() }));
                        setInventory(prev => [...prev, ...newItems]);
                    }}
                    onUpdateItem={(item) => setInventory(prev => prev.map(i => i.id === item.id ? item : i))}
                    onRemoveItem={(id) => setInventory(prev => prev.filter(i => i.id !== id))}
                    // New bulk handler props
                    onUpdateItems={(items) => {
                        setInventory(prev => {
                            const itemMap = new Map(items.map(i => [i.id, i]));
                            return prev.map(i => itemMap.has(i.id) ? itemMap.get(i.id)! : i);
                        });
                    }}
                    onRemoveItems={(ids) => setInventory(prev => prev.filter(i => !ids.includes(i.id)))}
                    onAddCategory={(name) => setCategories(prev => [...prev, { id: crypto.randomUUID(), name }])}
                    onRemoveCategory={(id) => setCategories(prev => prev.filter(c => c.id !== id))}
                    onUpdateCategory={(id, name) => setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))}
                />;
            case 'manage-customers':
                return <CustomerManager
                    customers={customers}
                    currentUser={currentUser}
                    onRemoveCustomer={(id) => setCustomers(prev => prev.filter(c => c.id !== id))}
                    onViewHistory={handleViewCustomerHistory}
                    onImportCustomers={(importedCustomers) => setCustomers(importedCustomers)}
                    onNavigateToAdd={() => {
                        setEditingCustomerId(null);
                        navigate('add-customer');
                    }}
                    onNavigateToEdit={(customer) => {
                        setEditingCustomerId(customer.id);
                        navigate('add-customer');
                    }}
                />;
            case 'add-customer':
                const editingCustomer = editingCustomerId ? customers.find(c => c.id === editingCustomerId) : undefined;
                return <CustomerFormPage
                    initialCustomer={editingCustomer}
                    onSave={(data) => {
                        handleAddCustomer(data);
                        navigate('manage-customers');
                    }}
                    onUpdate={(data) => {
                        setCustomers(prev => prev.map(c => c.id === data.id ? data : c));
                        setConfirmation({ title: 'Success', message: `Customer "${data.name}" has been updated.` });
                        navigate('manage-customers');
                    }}
                    onCancel={() => navigate('manage-customers')}
                />;
            case 'manage-suppliers':
                return <SupplierManager
                    suppliers={suppliers}
                    currentUser={currentUser}
                    onRemoveSupplier={(id) => setSuppliers(prev => prev.filter(s => s.id !== id))}
                    onImportSuppliers={(importedSuppliers) => setSuppliers(importedSuppliers)}
                    onNavigateToAdd={() => {
                        setEditingSupplierId(null);
                        navigate('add-supplier');
                    }}
                    onNavigateToEdit={(supplier) => {
                        setEditingSupplierId(supplier.id);
                        navigate('add-supplier');
                    }}
                />;
            case 'add-supplier':
                const editingSupplier = editingSupplierId ? suppliers.find(s => s.id === editingSupplierId) : undefined;
                return <SupplierFormPage
                    initialSupplier={editingSupplier}
                    onSave={(data) => {
                        handleAddSupplier(data);
                        navigate('manage-suppliers');
                    }}
                    onUpdate={(data) => {
                        setSuppliers(prev => prev.map(s => s.id === data.id ? data : s));
                        setConfirmation({ title: 'Success', message: `Supplier "${data.name}" has been updated.` });
                        navigate('manage-suppliers');
                    }}
                    onCancel={() => navigate('manage-suppliers')}
                />;
            case 'manage-invoices':
                return <InvoicesManager
                    invoices={invoices}
                    drafts={invoiceDrafts}
                    onLoadDraft={handleLoadDraft}
                    onRemoveDraft={handleRemoveDraft}
                    onRemoveInvoice={handleRemoveInvoice}
                    creditNotes={creditNotes}
                    settings={settings}
                    currentUser={currentUser}
                    onAddPayment={handleAddPayment}
                    onRemovePayment={handleRemovePayment}
                    onApplyCreditNote={handleApplyCreditNote}
                    onLoadInvoiceForEdit={handleLoadInvoiceForEdit}
                    onLoadInvoiceForCredit={handleLoadInvoiceForCredit}
                    selectedInvoiceId={selectedInvoiceIdForManager}
                    setSelectedInvoiceId={setSelectedInvoiceIdForManager}
                    fromCustomerHistory={fromCustomerHistory}
                    onBackToCustomerHistory={() => {
                        navigate('customer-history');
                        setSelectedInvoiceIdForManager(null);
                    }}
                    onDownloadInvoice={(id) => {
                        const invoice = invoices.find(inv => inv.id === id);
                        if (invoice) handleDownloadPdf(invoice.state, 'invoice');
                    }}
                    onOpenEmailModal={handleOpenEmailModal}
                />;
            case 'manage-purchase-orders':
                return <PurchaseOrderManager
                    purchaseOrders={purchaseOrders}
                    settings={settings}
                    currentUser={currentUser}
                    onLoadPO={handleLoadPurchaseOrder}
                    onRemovePO={(id) => setPurchaseOrders(prev => prev.filter(po => po.id !== id))}
                    onImportPOs={(data) => setPurchaseOrders(data)}
                    onDownloadPO={(id) => {
                        const po = purchaseOrders.find(p => p.id === id);
                        if (po) handleDownloadPdf(po.state, 'po');
                    }}
                    onAddPayment={handleAddPOPayment}
                    onRemovePayment={handleRemovePOPayment}
                />;
            case 'manage-bills':
                return <BillManager
                    bills={bills}
                    settings={settings}
                    currentUser={currentUser}
                    onLoadBill={handleLoadBill}
                    onRemoveBill={(id) => setBills(prev => prev.filter(b => b.id !== id))}
                    onImportBills={(data) => setBills(data)}
                    onAddPayment={handleAddBillPayment}
                    onRemovePayment={handleRemoveBillPayment}
                />;
            case 'manage-quotes':
                return <QuoteManager
                    quotes={quoteDrafts}
                    settings={settings}
                    currentUser={currentUser}
                    onLoadQuote={handleLoadQuote}
                    onRemoveQuote={(id) => setQuoteDrafts(prev => prev.filter(q => q.id !== id))}
                    onConvertToInvoice={handleConvertToInvoice}
                    onDownloadQuote={(id) => {
                        const quote = quoteDrafts.find(q => q.id === id);
                        if (quote) handleDownloadPdf(quote.state, 'quote');
                    }}
                    onOpenEmailModal={handleOpenEmailModal}
                />;
            case 'manage-drafts':
                return <DraftsManager
                    drafts={invoiceDrafts}
                    onLoadDraft={handleLoadDraft}
                    onRemoveDraft={(id) => setInvoiceDrafts(prev => prev.filter(d => d.id !== id))}
                />;
            case 'settings':
                return <SettingsManager
                    settings={settings}
                    onSave={handleSaveSettings}
                    onCancel={() => navigate('dashboard')}
                    currentUser={currentUser}
                />;
            case 'customer-history': {
                const customer = customers.find(c => c.id === selectedCustomerId);
                if (customer) {
                    const customerInvoices = invoices.filter(inv => inv.state.customerName === customer.name);
                    const customerQuotes = quoteDrafts.filter(q => q.state.customerName === customer.name);
                    const customerCreditNotes = creditNotes.filter(cn => cn.state.customerName === customer.name);
                    return <CustomerHistoryPage
                        customer={customer}
                        invoices={customerInvoices}
                        quotes={customerQuotes}
                        creditNotes={customerCreditNotes}
                        settings={settings}
                        onBack={() => navigate('manage-customers')}
                        onViewInvoice={(invoiceId) => {
                            setSelectedInvoiceIdForManager(invoiceId);
                            setFromCustomerHistory(true);
                            navigate('manage-invoices');
                        }}
                        onViewQuote={(quoteId) => handleLoadQuote(quoteId)}
                        onUpdateCustomer={(updatedCustomer) => {
                            setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
                        }}
                    />;
                }
                return <p>Customer not found.</p>;
            }
            case 'manage-supplier-inventory':
                return <SupplierInventoryManager
                    supplierInventory={supplierInventory}
                    suppliers={suppliers}
                    settings={settings}
                    currentUser={currentUser}
                    categories={supplierCategories}
                    onAddItem={(item) => {
                        const newSupplierItemId = crypto.randomUUID();
                        setSupplierInventory(prev => [...prev, { ...item, id: newSupplierItemId }]);
                        
                        // Find matching category in customer inventory categories
                        let customerCategoryId = undefined;
                        if (item.categoryId) {
                            const supplierCat = supplierCategories.find(c => c.id === item.categoryId);
                            if (supplierCat) {
                                const customerCat = categories.find(c => c.name.toLowerCase() === supplierCat.name.toLowerCase());
                                customerCategoryId = customerCat?.id;
                            }
                        }

                        // Duplicate to Customer Inventory
                        const newCustomerItem: Omit<InventoryItem, 'id'> = {
                            name: item.name,
                            sku: item.itemCode,
                            price: 0,
                            vatRate: settings.defaultVatRate,
                            type: item.type,
                            // For sale items, measured pricing is per SQ_M by default in this app's logic
                            measurementUnit: item.type === ItemType.MEASURED ? MeasurementUnit.SQ_M : undefined,
                            categoryId: customerCategoryId,
                            linkedSupplierItemIds: [newSupplierItemId],
                            status: 'active',
                            quantity: 0,
                            isParent: false,
                            definedAttributeKeys: [],
                            definedAttributeValues: {},
                        };
                        setInventory(prev => [...prev, { ...newCustomerItem, id: crypto.randomUUID() }]);
                    }}
                    onUpdateItem={(item) => setSupplierInventory(prev => prev.map(si => si.id === item.id ? item : si))}
                    onRemoveItem={(id) => setSupplierInventory(prev => prev.filter(si => si.id !== id))}
                    onAddCategory={(name) => {
                        const newSupplierCatId = crypto.randomUUID();
                        setSupplierCategories(prev => [...prev, { id: newSupplierCatId, name }]);
                        
                        // Duplicate to customer categories if name doesn't exist
                        if (!categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                            setCategories(prev => [...prev, { id: crypto.randomUUID(), name }]);
                        }
                    }}
                    onUpdateCategory={(id, name, color) => setSupplierCategories(prev => prev.map(c => c.id === id ? { ...c, name, color } : c))}
                    onRemoveCategory={(id) => setSupplierCategories(prev => prev.filter(c => c.id !== id))}
                    onAddSupplier={handleAddSupplier}
                />;
            case 'user-management':
                return <UserManagementPage
                    users={users}
                    setUsers={setUsers}
                    currentUser={currentUser}
                    subscriptionPackages={subscriptionPackages}
                    onOpenBulkEmail={() => setBulkEmailModalOpen(true)}
                    onOpenUserEmail={handleOpenUserEmailModal}
                />;
            case 'manage-subscription':
                return <SubscriptionManager
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    users={users}
                    setUsers={setUsers}
                    packages={subscriptionPackages}
                />;
            case 'manage-package-settings':
                return <PackageSettingsManager 
                    packages={subscriptionPackages}
                    setPackages={setSubscriptionPackages}
                    users={users}
                />;
            case 'user-management':
                return <UserManagementPage
                    users={users}
                    setUsers={setUsers}
                    currentUser={currentUser}
                    subscriptionPackages={subscriptionPackages}
                    onOpenBulkEmail={() => setBulkEmailModalOpen(true)}
                    onOpenUserEmail={handleOpenUserEmailModal}
                />;
            case 'reports':
                return <ReportsPage 
                    customers={customers}
                    suppliers={suppliers}
                    invoices={invoices}
                    purchaseOrders={purchaseOrders}
                    bills={bills}
                    inventory={inventory}
                    creditNotes={creditNotes}
                    marketplaceAccounts={[]}
                    marketplaceStatements={[]}
                    settings={settings}
                    onDownloadPdf={handleDownloadPdf}
                    onViewHistory={handleViewCustomerHistory}
                />;
            case 'manage-daily-takings':
                return <DailyTakingsManager
                    dailyTakings={dailyTakings}
                    settings={settings}
                    customers={customers}
                    onAddTaking={handleAddDailyTaking}
                    onUpdateTaking={handleUpdateDailyTaking}
                    // fix: Corrected function name from handleRemoveTaking to handleRemoveDailyTaking.
                    onRemoveTaking={handleRemoveDailyTaking}
                    onAddCustomer={handleAddCustomer}
                />;
            case 'job-builder':
                return <JobBuilder
                    editingJobId={editingJobId}
                    jobState={currentJobState}
                    setJobState={setCurrentJobState}
                    customers={customers}
                    suppliers={suppliers}
                    inventory={inventory}
                    supplierInventory={supplierInventory}
                    settings={settings}
                    categories={categories}
                    onSaveJob={handleSaveJob}
                    onConvertToQuote={handleJobToQuote}
                    onConvertToInvoice={handleJobToInvoice}
                    onAddCustomer={handleAddCustomer}
                />;
            case 'manage-jobs':
                return <JobManager
                    jobs={jobs}
                    settings={settings}
                    onLoadJob={handleLoadJob}
                    onDeleteJob={handleDeleteJob}
                />;
            case 'job-board':
                return <JobBoard
                    jobs={trackedJobs}
                    onUpdateJob={handleUpdateTrackedJob}
                    onDeleteTrackedJob={handleDeleteTrackedJob}
                    onCreateJob={handleCreateManualJob}
                    onCreateQuoteFromJobs={handleCreateQuoteFromJobs}
                    customTaskGroups={customTaskGroups}
                    onUpdateCustomTask={handleUpdateCustomTask}
                    onCreateCustomTask={handleCreateCustomTask}
                    onDeleteCustomTask={handleDeleteCustomTask}
                    onAddCustomGroup={handleAddCustomGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onUpdateGroup={handleUpdateGroup}
                    onUpdateGroupColumns={handleUpdateGroupColumns}
                    onDuplicateGroup={handleDuplicateGroup}
                    onDuplicateColumn={handleDuplicateColumn}
                    users={users}
                    currentUser={currentUser}
                    taskColumns={taskColumns}
                    setTaskColumns={setTaskColumns}
                    supplierCategories={supplierCategories}
                />;
            case 'manage-team-members':
                return <AdminTeamManager
                    users={users}
                    setUsers={setUsers}
                    currentUser={currentUser}
                />;
            case 'create-credit-note':
                if (currentCreditNoteState) {
                    const isReadOnly = !!viewingCreditNoteId;
                    return <CreditNoteCreator
                        creditNoteState={currentCreditNoteState}
                        setCreditNoteState={setCurrentCreditNoteState as React.Dispatch<React.SetStateAction<CreditNoteState>>}
                        inventory={inventory}
                        customers={customers}
                        settings={settings}
                        onSave={handleSaveCreditNote}
                        onAddCustomer={handleAddCustomer}
                        readOnly={isReadOnly}
                        onClose={isReadOnly ? () => navigate('manage-invoices') : undefined}
                    />;
                }
                return <p>Error: No credit note data to create.</p>;

            case 'manage-credit-notes':
                return <CreditNoteManager
                    creditNotes={creditNotes}
                    settings={settings}
                    onRemoveCreditNote={(id) => setCreditNotes(prev => prev.filter(cn => cn.id !== id))}
                    onDownloadPdf={(cn) => handleDownloadPdf(cn, 'credit-note')}
                />;
            case 'manage-chart-of-accounts':
                return <ChartOfAccountsManager
                    accounts={accounts}
                    currentUser={currentUser}
                    onAddAccount={handleAddAccount}
                    onUpdateAccount={handleUpdateAccount}
                    onRemoveAccount={handleRemoveAccount}
                    settings={settings}
                    onUpdateSettings={setSettings}
                />;
            default:
                return <div>Not found</div>;
        }
    };
   if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-600">
      Loading...
    </div>
  );
}
    return (
        <div className="flex h-screen bg-slate-100">
            <aside className="hidden md:flex md:flex-shrink-0">
                <div className="flex flex-col w-64 bg-blue-900">
                    {sidebarContent}
                </div>
            </aside>

            <div className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
                <div 
                    className={`fixed inset-0 bg-black bg-opacity-60 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
                    onClick={() => setSidebarOpen(false)}
                ></div>
                <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-blue-900 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                        <button onClick={() => setSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                            <span className="sr-only">Close sidebar</span>
                            <XIcon className="h-6 w-6 text-white" />
                        </button>
                    </div>
                    {sidebarContent}
                </div>
            </div>

            <div className="flex flex-col flex-1 w-0 overflow-hidden">
                {isTrialing && currentUser.role !== 'admin' && !isJobBoardOnlyUser && (
                    <AnnouncementBar 
                        currentUser={currentUser}
                        onUpgradeClick={() => navigate('manage-subscription')}
                    />
                )}
                 <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow md:hidden">
                    <button onClick={() => setSidebarOpen(true)} className="px-4 border-r border-slate-200 text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon className="h-6 w-6" />
                    </button>
                     <div className="flex-1 px-4 flex justify-between items-center">
                        <div className="flex-1 flex">
                            <span className="font-semibold text-lg">InQuBu Pro</span>
                        </div>
                    </div>
                </div>
                <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
                    {renderView()}
                </main>
            </div>

            <ConfirmationModal
                isOpen={!!confirmation}
                onClose={() => setConfirmation(null)}
                title={confirmation?.title || ''}
                message={confirmation?.message || ''}
            />

            <CreationTypeModal
                isOpen={creationTypeModalConfig.isOpen}
                onClose={() => setCreationTypeModalConfig({ isOpen: false, action: null })}
                onSelect={handleSelectCreationType}
            />

            <EmailModal
                isOpen={!!emailModalData}
                onClose={() => setEmailModalData(null)}
                initialData={emailModalData}
                settings={settings}
            />

            <BulkEmailModal
                isOpen={isBulkEmailModalOpen}
                onClose={() => setBulkEmailModalOpen(false)}
                users={users.filter(u => u.role === 'master')}
            />

            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                {documentToPrint?.type === 'credit-note' ? (
                    <PrintableCreditNote
                        id="printable-document"
                        creditNote={documentToPrint.data}
                        settings={settings}
                        inventory={inventory}
                        customers={customers}
                    />
                ) : documentToPrint?.type === 'po' ? (
                    <PrintablePurchaseOrder
                        id="printable-document"
                        poState={documentToPrint.data}
                        settings={settings}
                        suppliers={suppliers}
                    />
                ) : documentToPrint?.type === 'vat-report' ? (
                    <PrintableVatReport
                        id="printable-document"
                        {...documentToPrint.data}
                    />
                ) : documentToPrint?.type === 'pnl-report' ? (
                    <PrintableReport
                        id="printable-document"
                        {...documentToPrint.data}
                    />
                ) : documentToPrint?.type === 'balance-sheet-report' ? (
                    <PrintableBalanceSheet
                        id="printable-document"
                        {...documentToPrint.data}
                    />
                ) : documentToPrint?.type === 'cash-flow-report' ? (
                    <PrintableCashFlowStatement
                        id="printable-document"
                        {...documentToPrint.data}
                    />
                ) : documentToPrint?.type === 'income-by-customer-report' ? (
                    <PrintableIncomeByCustomer
                        id="printable-document"
                        {...documentToPrint.data}
                    />
                ) : documentToPrint?.type === 'paid-to-suppliers-report' ? (
                    <PrintablePaidToSuppliers
                        id="printable-document"
                        {...documentToPrint.data}
                    />
                ) : documentToPrint?.type === 'account-balances-report' ? (
                    <PrintableAccountBalances
                        id="printable-document"
                        {...documentToPrint.data}
                    />
                ) : documentToPrint ? (
                    <PrintableDocument 
                        id="printable-document" 
                        invoiceState={documentToPrint.data} 
                        settings={settings}
                        inventory={inventory}
                        customers={customers}
                        mode={documentToPrint.type as 'invoice' | 'quote'}
                        appliedCredits={documentToPrint.appliedCredits || []}
                    />
                ) : null}
            </div>
        </div>
    );
};

const App: React.FC = () => {
    // Global, non-user-specific states
    const [currentUser, setCurrentUser] = useState<User | null>(null);
const [authLoading, setAuthLoading] = useState(true);

    const [subscriptionPackages, setSubscriptionPackages] = useLocalStorage<SubscriptionPackage[]>('subscription-packages', defaultSubscriptionPackages);

    useEffect(() => {
        // One-time migration for old package structure with invoiceType
        const needsMigration = subscriptionPackages.some(p => 'invoiceType' in p);
        if (needsMigration) {
            setSubscriptionPackages(prevPackages => {
                return prevPackages.map(p => {
                    const pkgAsAny = p as any;
                    if ('invoiceType' in pkgAsAny) {
                        const { invoiceType, ...rest } = pkgAsAny;
                        const isPro = pkgAsAny.name === 'Pro';
                        return {
                            ...rest,
                            allowFixedPrice: isPro || invoiceType === 'fixed',
                            allowMeasuredPrice: isPro || invoiceType === 'measured',
                        };
                    }
                    return p;
                });
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Create master admin on first load if no admin exists
    useEffect(() => {
        if (users.length === 0 || !users.some(u => u.role === 'admin')) {
            const masterAdmin: User = {
                id: crypto.randomUUID(),
                username: 'masteradmin',
                password: 'masterpassword',
                role: 'admin',
                teamId: 'admin_team',
                subscriptionStatus: 'admin_free',
                email: 'admin@example.com',
                isActive: true,
            };
            const existingUsers = users.filter(u => u.role !== 'admin');
            setUsers([masterAdmin, ...existingUsers]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
  const loadUserFromSupabase = async () => {
    setAuthLoading(true);

    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;

    if (!sessionUser) {
      setCurrentUser(null);
      setAuthLoading(false);
      return;
    }

    // Try load profile from user_kv (created during Register)
    const { data: kv } = await supabase
      .from('user_kv')
      .select('value')
      .eq('user_id', sessionUser.id)
      .eq('key', 'profile')
      .maybeSingle();

    const profile = (kv?.value ?? {}) as any;

    // Build the User object your app expects
    const user: User = {
      id: sessionUser.id,
      username: profile.username ?? (sessionUser.email?.split('@')[0] ?? 'user'),
      email: sessionUser.email ?? profile.email,
      role: profile.role ?? 'master',
      teamId: profile.teamId ?? sessionUser.id,
      subscriptionStatus: profile.subscriptionStatus ?? 'active',
      isActive: profile.isActive ?? true,
    };

    setCurrentUser(user);
    setAuthLoading(false);
  };

  loadUserFromSupabase();

  const { data: sub } = supabase.auth.onAuthStateChange(() => {
    loadUserFromSupabase();
  });

  return () => sub.subscription.unsubscribe();
}, []);


    const [authView, setAuthView] = useState<'login' | 'register'>('login');

    if (!currentUser) {
        if (authView === 'login') {
            return <LoginPage 
                onLogin={(user) => setCurrentUser(user)}
                onNavigateToRegister={() => setAuthView('register')}
                users={users}
            />;
        }
        return <RegisterPage
            onRegisterSuccess={() => setAuthView('login')}
            onNavigateToLogin={() => setAuthView('login')}
            users={users}
            setUsers={setUsers}
        />;
    }

    if (currentUser.subscriptionStatus === 'needs_selection') {
        return <PackageSelectionPage
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            users={users}
            setUsers={setUsers}
            packages={subscriptionPackages}
        />;
    }

    return <MainApp 
        currentUser={currentUser} 
        setCurrentUser={setCurrentUser} 
        users={users} 
        setUsers={setUsers} 
        subscriptionPackages={subscriptionPackages}
        setSubscriptionPackages={setSubscriptionPackages}
    />;
}

export default App;