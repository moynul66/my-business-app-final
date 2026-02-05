// types.ts

// Enums
export enum MeasurementUnit {
    // Area
    SQ_M = 'sq_m',
    SQ_FT = 'sq_ft',
    SQ_CM = 'sq_cm',
    SQ_MM = 'sq_mm',
    SQ_IN = 'sq_in',
    // Linear
    M = 'm',
    CM = 'cm',
    MM = 'mm',
    FT = 'ft',
    IN = 'in',
}

export enum ItemType {
    FIXED = 'fixed',
    MEASURED = 'measured',
}

// General Types
export type TaxMode = 'exclusive' | 'inclusive' | 'none';
export type InvoiceCreationType = 'fixed' | 'measured';

export interface AppSettings {
    companyName: string;
    companyAddress: string;
    vatNumber: string;
    companyRegistrationNumber: string;
    defaultVatRate: number;
    paymentTerms: string;
    bankName: string;
    accountNumber: string;
    sortCode: string;
    invoiceTitle: string;
    quoteTitle: string;
    nextInvoiceNumber: number;
    nextQuoteNumber: number;
    nextJobNumber: number;
    nextCreditNoteNumber: number;
    poPrefix: string;
    nextPoNumber: number;
    currencySymbol: string;
    emailFromName: string;
    emailReplyTo: string;
    invoiceEmailSubject: string;
    invoiceEmailBody: string;
    quoteEmailSubject: string;
    quoteEmailBody: string;
    companyLogo?: string;
    showAccountOnInvoices?: boolean;
}

export interface AddOnOption {
    id: string;
    name: string;
    price: number;
}

export interface Category {
    id: string;
    name: string;
    color?: string;
}

export interface Discount {
    type: 'fixed' | 'percentage';
    value: number;
}

// Chart of Accounts
export type AccountType = 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses';

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    code?: string;
    description?: string;
    isSystem?: boolean;
}

// Customers & Suppliers
export interface CustomerNote {
    id: string;
    content: string;
    date: string;
}

export interface CustomerReminder {
    id: string;
    text: string;
    dueDate: string;
    isCompleted: boolean;
}

export interface Customer {
    id: string;
    name: string;
    contactName?: string;
    address: string;
    mobile?: string;
    email?: string;
    website?: string;
    companyReg?: string;
    notes?: string; // General/Legacy notes
    notesHistory?: CustomerNote[];
    reminders?: CustomerReminder[];
}

export interface Supplier {
    id: string;
    name: string;
    address: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    website?: string;
    vatNumber?: string;
    notes?: string;
    bankDetails?: {
        businessName: string;
        sortCode: string;
        accountNumber: string;
    };
}

// Inventory
export type InventoryStatus = 'active' | 'discontinued';

export interface InventoryItem {
    id: string;
    name: string;
    sku?: string; // Stock Keeping Unit
    price: number;
    vatRate?: number; // Added VAT Rate
    quantity?: number; // Current stock count
    minStockLevel?: number; // Threshold for low stock alert
    status?: InventoryStatus;
    image?: string; // URL or base64 data
    minPrice?: number;
    type: ItemType;
    measurementUnit?: MeasurementUnit;
    unitPrices?: Partial<Record<MeasurementUnit, number>>;
    categoryId?: string;
    linkedSupplierItemIds?: string[];
    addOnOptions?: AddOnOption[];
    // Variant Support
    parentId?: string; // If this is a child variant, this is the parent's ID
    isParent?: boolean; // If true, this is a container for variants
    definedAttributeKeys?: string[]; // For parent: ['Size', 'Colour']
    definedAttributeValues?: Record<string, string[]>; // NEW: For parent: {'Size': ['S', 'M'], 'Colour': ['Red']}
    variantAttributes?: Record<string, string>; // For variant: {'Size': 'Small', 'Colour': 'Red'}
}

export interface SupplierInventoryItem {
    id: string;
    name: string;
    supplierId: string;
    itemCode?: string;
    price: number;
    type: ItemType;
    length?: number;
    width?: number;
    measurementUnit?: MeasurementUnit;
    unitPrices?: Partial<Record<MeasurementUnit, number>>;
    includeWastage?: boolean;
    categoryId?: string;
}

// Line Items
export interface InvoiceLineItem {
    id: string;
    inventoryItemId: string | null;
    description: string;
    quantity: number;
    vatRate: number;
    discount: Discount;
    price: number; // for manual entry
    length?: number;
    width?: number;
    unit?: MeasurementUnit;
    accountId?: string; // Link to Chart of Accounts
    selectedAddOnIds?: string[];
}

export interface PurchaseOrderLineItem {
    id: string;
    supplierInventoryItemId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
}

export interface BillLineItem {
    id: string;
    supplierInventoryItemId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
}

// Payments
export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Card Payment' | 'Online Payment';

export interface Payment {
    id: string;
    date: string;
    amount: number;
    notes: string;
    method: PaymentMethod;
}

// Invoices, Quotes, Drafts
export interface InvoiceState {
    customerName: string;
    reference: string;
    invoiceNumber: string;
    issueDate: string;
    completionDate?: string;
    dueDate: string;
    lineItems: InvoiceLineItem[];
    notes: string;
    taxMode: TaxMode;
    linkedBillIds?: string[];
    invoiceType: InvoiceCreationType;
    _isLoaded?: boolean; // internal flag
}

export interface Invoice {
    id: string;
    name: string;
    createdAt: string;
    state: InvoiceState;
    total: number;
    payments: Payment[];
    linkedBillIds: string[];
}

export interface InvoiceDraft {
    id: string;
    name: string;
    createdAt: string;
    state: InvoiceState;
    total: number;
}

export interface QuoteDraft {
    id: string;
    name: string;
    createdAt: string;
    state: InvoiceState;
    total: number;
}

// Credit Notes
export interface CreditNoteState {
    customerName: string;
    reference: string;
    originalInvoiceNumber?: string;
    creditNoteNumber: string;
    issueDate: string;
    lineItems: InvoiceLineItem[];
    notes: string;
    taxMode: TaxMode;
    invoiceType: InvoiceCreationType;
}

export interface CreditNote {
    id: string;
    name: string;
    createdAt: string;
    state: CreditNoteState;
    total: number;
    applications: { invoiceId: string; amount: number }[];
}

// Purchasing
export interface PurchaseOrderState {
    supplierId: string | null;
    supplierName: string;
    reference: string;
    poNumber: string;
    issueDate: string;
    deliveryDate: string;
    lineItems: PurchaseOrderLineItem[];
    notes: string;
    taxMode: TaxMode;
}

export interface PurchaseOrder {
    id: string;
    name: string;
    createdAt: string;
    state: PurchaseOrderState;
    total: number;
    status: 'draft' | 'approved';
    payments: Payment[];
}

export interface BillState {
    supplierId: string | null;
    supplierName: string;
    reference: string; // Supplier's invoice number
    issueDate: string;
    dueDate: string;
    lineItems: BillLineItem[];
    notes: string;
    taxMode: TaxMode;
}

export interface Bill {
    id: string;
    createdAt: string;
    state: BillState;
    total: number;
    payments: Payment[];
}

// Users and Permissions
export type UserRole = 'admin' | 'master' | 'team-member';
export type PermissionLevel = 'none' | 'view' | 'edit';

export interface UserPermissions {
    sales: PermissionLevel;
    purchasing: PermissionLevel;
    management: PermissionLevel;
    reports: PermissionLevel;
    settings: PermissionLevel;
    subscriptions: PermissionLevel;
    jobBoard: PermissionLevel;
}

export interface User {
    id: string;
    username: string;
    password?: string;
    name?: string;
    email?: string;
    role: UserRole;
    teamId: string;
    subscriptionStatus: string;
    trialEndDate?: string;
    isActive: boolean;
    permissions?: UserPermissions;
}

// Subscriptions
export type PageKey =
    | 'dashboard'
    | 'job-builder'
    | 'manage-jobs'
    | 'manage-invoices'
    | 'manage-quotes'
    | 'manage-drafts'
    | 'manage-daily-takings'
    | 'manage-credit-notes'
    | 'manage-purchase-orders'
    | 'manage-bills'
    | 'manage-customers'
    | 'manage-suppliers'
    | 'manage-inventory'
    | 'manage-supplier-inventory'
    | 'job-board'
    | 'manage-chart-of-accounts'
    | 'reports'
    | 'settings';
export type PackagePermissions = {
    [key in PageKey]?: boolean;
};

export interface SubscriptionPackage {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice: number;
    features: string[];
    stripeLink: string;
    allowFixedPrice: boolean;
    allowMeasuredPrice: boolean;
    teamMemberLimit: number;
    permissions: PackagePermissions;
}

// Marketplaces
export interface VatTreatmentData {
    claims?: 'claim' | 'no-claim';
    refunds?: 'claim' | 'no-claim';
    paymentDisputes?: 'claim' | 'no-claim';
    postageLabelsFees?: 'claim' | 'no-claim';
    otherFees?: 'claim' | 'no-claim';
    adjustments?: 'claim' | 'no-claim';
    purchases?: 'claim' | 'no-claim';
    charges?: 'claim' | 'no-claim';
}

export interface MarketplaceAccount {
    id: string;
    marketplace: string;
    storeName: string;
    notes?: string;
}

export interface MarketplaceStatement {
    id: string;
    marketplaceAccountId: string;
    statementType: 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
    createdAt: string;
    orders: number;
    ordersVatTreatment: 'inclusive' | 'exclusive' | 'none';
    claims: number;
    refunds: number;
    paymentDisputes: number;
    postageLabelsFees: number;
    otherFees: number;
    adjustments: number;
    purchases: number;
    charges: number;
    payouts: number;
    fullVatClaim?: number;
    notes?: string;
    vatTreatment?: VatTreatmentData;
}

// Daily Takings
export interface DailyTaking {
    id: string;
    date: string;
    businessName: string;
    details: string;
    type: 'Cash' | 'Card';
    amount: number;
}

// Jobs
export interface JobCostItem {
    id: string;
    type: 'linked' | 'manual';
    description: string;
    linkedSupplierItemId?: string;
    proportionalCost: number;
    wastageCost: number;
    totalMaterialCost: number;
    manualCost?: number;
    costVatRate: number;
    costVat: number;
}

export interface JobLineItem extends InvoiceLineItem {
    costItems: JobCostItem[];
}

export interface JobState {
    customerName: string;
    reference: string;
    jobNumber: string;
    issueDate: string;
    lineItems: JobLineItem[];
    notes: string;
    taxMode: TaxMode;
    invoiceType: InvoiceCreationType;
}

export interface Job {
    id: string;
    name: string;
    createdAt: string;
    state: JobState;
    totalSale: number;
    totalCost: number;
}

export type TrackedJobStatus = 'new' | 'in_progress' | 'complete';
export type TrackedJobPriority = 'low' | 'medium' | 'high';

export interface ActivityLogEntry {
    userId: string;
    username: string;
    timestamp: string;
    update: string;
}

export interface TrackedJob {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    description: string;
    dueDate: string;
    status: TrackedJobStatus;
    createdAt: string;
    priority: TrackedJobPriority;
    assignedTeamMemberId?: string;
    masterId?: string;
    notes?: string;
    customFields?: Record<string, any>;
    activityLog?: ActivityLogEntry[];
    supplierCategoryIds?: string[];
}

// Tasks View (Job Board)
export type TaskColumnType = 'customer' | 'description' | 'status' | 'dueDate' | 'text' | 'notes' | 'number' | 'dropdown' | 'checkbox' | 'phone' | 'date' | 'team' | 'priority' | 'jobStatus' | 'task' | 'deadline';

export interface DropdownOption {
    id: string;
    label: string;
    color: string;
}

export interface TaskColumn {
    id: string;
    name: string;
    type: TaskColumnType;
    isCustom: boolean;
    unit?: string;
    options?: DropdownOption[];
    color?: string;
    isFrozen?: boolean;
    textColor?: 'auto' | 'black' | 'white';
}

export interface TaskGroup {
    id: string;
    name: string;
    isCollapsed: boolean;
    columns: TaskColumn[];
    tasks: TrackedJob[];
    color?: string;
}