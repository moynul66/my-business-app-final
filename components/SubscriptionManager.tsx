import React from 'react';
import { User, SubscriptionPackage } from '../types';
import { Button } from './ui/Button';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface SubscriptionManagerProps {
    currentUser: User;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    packages: SubscriptionPackage[];
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ currentUser, setCurrentUser, users, setUsers, packages }) => {

    const isTrialing = currentUser.subscriptionStatus.startsWith('trial_');
    const isTrialExpired = isTrialing && currentUser.trialEndDate && new Date() > new Date(currentUser.trialEndDate);
    const currentPackageId = currentUser.subscriptionStatus.replace(/^(trial_|package_)/, '');
    const currentPackage = packages.find(p => p.id === currentPackageId);

    const getDaysLeftInTrial = () => {
        if (!isTrialing || !currentUser.trialEndDate || isTrialExpired) {
            return 0;
        }
        const endDate = new Date(currentUser.trialEndDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const handleUpgrade = (newPackageId: string) => {
        const newPackage = packages.find(p => p.id === newPackageId);
        if (!newPackage) return;

        if (newPackage.stripeLink) {
            // If a Stripe link is configured, redirect the user to the checkout page.
            window.location.href = newPackage.stripeLink;
        } else {
            // Otherwise, perform the local upgrade process with a confirmation dialog.
            if (!window.confirm(`Are you sure you want to switch to the ${newPackage.name} package?`)) {
                return;
            }
            
            const updatedUser: User = { 
                ...currentUser, 
                subscriptionStatus: `package_${newPackageId}`, 
                trialEndDate: undefined 
            };

            setCurrentUser(updatedUser);
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === currentUser.id ? updatedUser : user
                )
            );
            alert('Subscription changed successfully! Your new features are now available.');
        }
    };

    const renderCurrentPlan = () => {
        if (!currentPackage) return null;
        
        let planName = currentPackage.name;
        let description = '';
        const daysLeft = getDaysLeftInTrial();

        if (isTrialing) {
            planName += ' (Trial)';
            description = isTrialExpired 
                ? 'Your free trial has expired. Please upgrade to continue.' 
                : `You have ${daysLeft} day(s) remaining.`;
        } else {
            description = `You are currently subscribed to the ${currentPackage.name} plan.`;
        }


        return (
            <div className={`p-6 rounded-lg mb-8 ${isTrialExpired ? 'bg-red-50 border-red-200 border' : 'bg-blue-50 border-blue-200 border'}`}>
                <h3 className="text-xl font-bold text-slate-800">Your Current Plan: {planName}</h3>
                <p className="text-slate-600 mt-1">{description}</p>
            </div>
        );
    };

    const renderPackageCard = (pkg: SubscriptionPackage) => {
        const isCurrentPlan = pkg.id === currentPackageId && !isTrialing;
        const isCurrentTrial = pkg.id === currentPackageId && isTrialing;

        return (
            <div key={pkg.id} className={`border-2 rounded-lg p-6 flex flex-col ${isCurrentPlan || isCurrentTrial ? 'border-blue-500' : 'border-slate-200'}`}>
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
                {isCurrentPlan ? (
                    <Button variant="outline" disabled className="w-full">Current Plan</Button>
                ) : (
                    <Button 
                        variant="primary" 
                        onClick={() => handleUpgrade(pkg.id)}
                        className="w-full"
                    >
                        {isCurrentTrial ? 'Activate Full Plan' : `Switch to ${pkg.name}`}
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">Subscription Management</h2>
            {renderCurrentPlan()}

            <h3 className="text-2xl font-semibold mb-6 text-slate-800 text-center">Choose Your Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {packages.map(renderPackageCard)}
            </div>
        </div>
    );
};

export default SubscriptionManager;