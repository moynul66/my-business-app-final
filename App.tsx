import React, { useState, useEffect } from 'react';
import { supabase, isCloudConfigured } from './services/supabaseClient';
import { db } from './services/db';
import { 
    AppSettings, Customer, InventoryItem, Invoice, InvoiceDraft, QuoteDraft, 
    User, TrackedJob 
} from './types';

// Component Imports
import SummaryDashboard from './components/SummaryDashboard';
import CustomerManager from './components/CustomerManager';
import CustomerFormPage from './components/CustomerFormPage';
import InvoicesManager from './components/InvoicesManager';
import QuoteManager from './components/QuoteManager';
import SettingsManager from './components/SettingsManager';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

// Icons
import { HomeIcon } from './components/icons/HomeIcon';
import { CreditCardIcon } from './components/icons/CreditCardIcon';
import { ChatBubbleBottomCenterTextIcon } from './components/icons/ChatBubbleBottomCenterTextIcon';
import { UsersIcon } from './components/icons/UsersIcon';
import { CogIcon } from './components/icons/CogIcon';
import { ArrowLeftOnRectangleIcon } from './components/icons/ArrowLeftOnRectangleIcon';

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
    invoiceEmailBody: 'Dear [CustomerName],\n\nPlease find attached your invoice [InvoiceNumber].',
    quoteEmailSubject: 'Quote [InvoiceNumber] from [CompanyName]',
    quoteEmailBody: 'Dear [CustomerName],\n\nPlease find attached your quote [InvoiceNumber].',
};

const MainApp: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [view, setView] = useState<string>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [quoteDrafts, setQuoteDrafts] = useState<QuoteDraft[]>([]);
    const [invoiceDrafts, setInvoiceDrafts] = useState<InvoiceDraft[]>([]);

    useEffect(() => {
        const loadCloudData = async () => {
            setIsLoading(true);
            try {
                const [s, c, i, inv, q, d] = await Promise.all([
                    db.loadSettings(currentUser.id),
                    db.fetchCollection('customers'),
                    db.fetchCollection('invoices'),
                    db.fetchCollection('inventory'),
                    db.fetchCollection('quote_drafts'),
                    db.fetchCollection('invoice_drafts')
                ]);
                
                if (s) setSettings(s);
                setCustomers(c);
                setInvoices(i);
                setInventory(inv);
                setQuoteDrafts(q);
                setInvoiceDrafts(d);
            } catch (err) {
                console.error("Cloud Sync Failed:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadCloudData();
    }, [currentUser.id]);

    const handleAddCustomer = async (data: Omit<Customer, 'id'>) => {
        const saved = await db.upsert('customers', data);
        setCustomers(prev => [...prev, saved]);
        setView('manage-customers');
    };

    const handleSaveSettings = async (newSettings: AppSettings) => {
        setSettings(newSettings);
        await db.saveSettings(currentUser.id, newSettings);
        setView('dashboard');
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600 font-medium">Syncing with Cloud Database...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100">
            <aside className="w-64 bg-blue-900 text-white flex flex-col">
                <div className="p-6 text-xl font-bold border-b border-blue-800">InQuBu Cloud</div>
                <nav className="flex-1 p-4 space-y-2 text-left">
                    <button onClick={() => setView('dashboard')} className={`w-full flex items-center p-3 rounded-lg ${view === 'dashboard' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}><HomeIcon className="w-5 h-5 mr-3"/> Dashboard</button>
                    <button onClick={() => setView('manage-invoices')} className={`w-full flex items-center p-3 rounded-lg ${view === 'manage-invoices' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}><CreditCardIcon className="w-5 h-5 mr-3"/> Invoices</button>
                    <button onClick={() => setView('manage-quotes')} className={`w-full flex items-center p-3 rounded-lg ${view === 'manage-quotes' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}><ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-3"/> Quotes</button>
                    <button onClick={() => setView('manage-customers')} className={`w-full flex items-center p-3 rounded-lg ${view === 'manage-customers' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}><UsersIcon className="w-5 h-5 mr-3"/> Customers</button>
                    <button onClick={() => setView('settings')} className={`w-full flex items-center p-3 rounded-lg ${view === 'settings' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}><CogIcon className="w-5 h-5 mr-3"/> Settings</button>
                </nav>
                <button onClick={() => supabase.auth.signOut()} className="p-4 bg-blue-950 flex items-center hover:bg-red-900 transition-colors"><ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3"/> Logout</button>
            </aside>
            <main className="flex-1 overflow-y-auto p-8">
                {view === 'dashboard' && <SummaryDashboard invoices={invoices} quotes={quoteDrafts} drafts={invoiceDrafts} purchaseOrders={[]} bills={[]} creditNotes={[]} settings={settings} inventory={inventory} trackedJobs={[]} onViewJob={()=>{}} onDownloadVatReportPdf={()=>{}} />}
                {view === 'manage-customers' && <CustomerManager customers={customers} currentUser={currentUser} onRemoveCustomer={()=>{}} onViewHistory={()=>{}} onImportCustomers={()=>{}} onNavigateToAdd={()=>setView('add-customer')} onNavigateToEdit={()=>{}} />}
                {view === 'add-customer' && <CustomerFormPage onSave={handleAddCustomer} onUpdate={()=>{}} onCancel={()=>setView('manage-customers')} />}
                {view === 'settings' && <SettingsManager settings={settings} onSave={handleSaveSettings} onCancel={()=>setView('dashboard')} currentUser={currentUser} />}
            </main>
        </div>
    );
};

const App: React.FC = () => {
    const [sessionUser, setSessionUser] = useState<User | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [authView, setAuthView] = useState<'login' | 'register'>('login');

    useEffect(() => {
        if (!isCloudConfigured) {
            setIsAuthChecking(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setSessionUser({
                    id: session.user.id,
                    username: session.user.email?.split('@')[0] || 'User',
                    role: 'master',
                    teamId: session.user.id,
                    subscriptionStatus: 'active',
                    isActive: true,
                    email: session.user.email
                });
            }
            setIsAuthChecking(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setSessionUser({
                    id: session.user.id,
                    username: session.user.email?.split('@')[0] || 'User',
                    role: 'master',
                    teamId: session.user.id,
                    subscriptionStatus: 'active',
                    isActive: true,
                    email: session.user.email
                });
            } else {
                setSessionUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (!isCloudConfigured) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl border-t-4 border-red-500 text-center">
                    <h1 className="text-2xl font-bold text-slate-800 mb-4">Cloud Config Required</h1>
                    <p className="text-slate-600 mb-6">
                        The app is connected to GitHub, but it doesn't have the "keys" to your database yet.
                    </p>
                    <div className="bg-slate-100 p-4 rounded text-xs font-mono text-left mb-6">
                        1. Go to your Hosting Provider (Vercel)<br/>
                        2. Go to Project Settings -> Environment Variables<br/>
                        3. Add <b>VITE_SUPABASE_URL</b><br/>
                        4. Add <b>VITE_SUPABASE_ANON_KEY</b>
                    </div>
                </div>
            </div>
        );
    }

    if (isAuthChecking) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
             <div className="animate-pulse text-blue-600 font-bold">Initializing Cloud Session...</div>
        </div>
    );

    if (!sessionUser) {
        return authView === 'login' 
            ? <LoginPage onNavigateToRegister={() => setAuthView('register')} />
            : <RegisterPage onRegisterSuccess={() => setAuthView('login')} onNavigateToLogin={() => setAuthView('login')} users={[]} setUsers={()=>{}} />;
    }

    return <MainApp currentUser={sessionUser} />;
}

export default App;