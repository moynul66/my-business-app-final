import React from 'react';
import { User, SubscriptionPackage } from '../types';
import { Button } from './ui/Button';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface PackageSelectionPageProps {
    currentUser: User;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    packages: SubscriptionPackage[];
}

const PackageSelectionPage: React.FC<PackageSelectionPageProps> = ({ currentUser, setCurrentUser, users, setUsers, packages }) => {

    const handleSelectPackage = (packageId: string) => {
        const selectedPackage = packages.find(p => p.id === packageId);
        if (!selectedPackage) return;

        if (selectedPackage.stripeLink) {
            // If a link exists, redirect to Stripe
            window.location.href = selectedPackage.stripeLink;
        } else {
            // Otherwise, start the free trial locally
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);

            const updatedUser: User = {
                ...currentUser,
                subscriptionStatus: `trial_${packageId}`,
                trialEndDate: trialEndDate.toISOString(),
            };

            const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
            setUsers(updatedUsers);
            setCurrentUser(updatedUser);
        }
    };
    
    const renderPackageCard = (pkg: SubscriptionPackage) => (
         <div key={pkg.id} className="border-2 border-slate-200 rounded-lg p-6 flex flex-col">
            <h4 className="text-2xl font-bold text-slate-900">{pkg.name}</h4>
            <p className="text-slate-500 mb-4">{pkg.description}</p>
            <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">£{pkg.price.toFixed(2)}</span>
                <span className="text-slate-500">/ week</span>
                <span className="ml-2 line-through text-slate-400">£{pkg.originalPrice.toFixed(2)}</span>
            </div>
            <ul className="space-y-3 mb-8 text-slate-600 flex-grow">
                {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-center"><CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 shrink-0" /> {feature}</li>
                ))}
            </ul>
            <Button variant="primary" onClick={() => handleSelectPackage(pkg.id)} className="w-full">
                {pkg.stripeLink ? `Subscribe to ${pkg.name}` : `Start ${pkg.name} Trial`}
            </Button>
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-4xl p-8 space-y-8 bg-white rounded-lg shadow-lg text-center">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900">
                        Welcome to InQuBu Pro, {currentUser.username}!
                    </h1>
                    <p className="mt-2 text-lg text-slate-600">
                        Choose a plan to start your 7-day free trial.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {packages.map(renderPackageCard)}
                </div>
            </div>
        </div>
    );
};

export default PackageSelectionPage;