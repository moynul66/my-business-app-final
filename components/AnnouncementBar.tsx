
import React from 'react';
import { User } from '../types';
import { Button } from './ui/Button';

interface AnnouncementBarProps {
    currentUser: User;
    onUpgradeClick: () => void;
}

const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ currentUser, onUpgradeClick }) => {
    
    const getDaysLeftInTrial = () => {
        if (!currentUser.trialEndDate) return 0;
        
        const endDate = new Date(currentUser.trialEndDate);
        const now = new Date();
        
        const diffTime = endDate.getTime() - now.getTime();
        if (diffTime < 0) return 0;

        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysLeft = getDaysLeftInTrial();
    const isExpired = daysLeft <= 0;

    const barStyles = isExpired 
        ? 'bg-red-600 text-white' 
        : 'bg-blue-600 text-white';

    const message = isExpired
        ? 'Your 7-day free trial has expired. Please upgrade to continue using InQuBu Pro.'
        : `You are on a 7-day free trial. You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.`;

    return (
        <div className={`w-full p-3 flex items-center justify-center text-sm font-medium ${barStyles} gap-4`}>
            <p className="flex-grow text-center">{message}</p>
            <Button 
                onClick={onUpgradeClick} 
                className={isExpired ? '!bg-white !text-red-600 hover:!bg-red-100' : '!bg-white !text-blue-600 hover:!bg-blue-100'}
            >
                Upgrade Now
            </Button>
        </div>
    );
};

export default AnnouncementBar;