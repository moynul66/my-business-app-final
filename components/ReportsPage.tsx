
import React, { useState } from 'react';
import { Invoice, PurchaseOrder, Bill, InventoryItem, AppSettings, Customer, Supplier, MarketplaceStatement, MarketplaceAccount, CreditNote } from '../types';
import BalanceSheet from './BalanceSheet';
import CashFlowStatement from './CashFlowStatement';
import ProfitAndLoss from './ProfitAndLoss';
import IncomeByCustomer from './IncomeByCustomer';
import PaidToSuppliers from './PaidToSuppliers';
import AccountBalances from './AccountBalances';

interface ReportsPageProps {
    customers: Customer[];
    suppliers: Supplier[];
    invoices: Invoice[];
    purchaseOrders: PurchaseOrder[];
    bills: Bill[];
    inventory: InventoryItem[];
    creditNotes: CreditNote[];
    marketplaceAccounts: MarketplaceAccount[];
    marketplaceStatements: MarketplaceStatement[];
    settings: AppSettings;
    onDownloadPdf: (data: any, type: string) => void;
    onViewHistory: (customerId: string) => void;
}

type ReportTab = 'pnl' | 'balanceSheet' | 'cashFlow' | 'incomeByCustomer' | 'paidToSuppliers' | 'accountBalances';

const ReportsPage: React.FC<ReportsPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<ReportTab>('pnl');

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'pnl':
                return <ProfitAndLoss {...props} />;
            case 'balanceSheet':
                return <BalanceSheet {...props} />;
            case 'cashFlow':
                return <CashFlowStatement {...props} />;
            case 'incomeByCustomer':
                return <IncomeByCustomer {...props} />;
            case 'paidToSuppliers':
                return <PaidToSuppliers {...props} />;
            case 'accountBalances':
                return <AccountBalances {...props} />;
            default:
                return null;
        }
    };

    const TabButton: React.FC<{ tab: ReportTab, children: React.ReactNode }> = ({ tab, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-grow sm:flex-grow-0 ${
                activeTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 border-b pb-4 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Financial Reports</h2>
                <div className="flex items-center p-1 bg-slate-100 rounded-lg flex-wrap gap-1 w-full xl:w-auto">
                    <TabButton tab="pnl">Profit & Loss</TabButton>
                    <TabButton tab="balanceSheet">Balance Sheet</TabButton>
                    <TabButton tab="cashFlow">Cash Flow</TabButton>
                    <TabButton tab="incomeByCustomer">Income By Customer</TabButton>
                    <TabButton tab="paidToSuppliers">Paid to Suppliers</TabButton>
                    <TabButton tab="accountBalances">Account Balances</TabButton>
                </div>
            </div>
            {renderActiveTab()}
        </div>
    );
};

export default ReportsPage;
