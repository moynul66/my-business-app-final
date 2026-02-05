
import React, { useEffect, useState } from 'react';
import TourPopover from './ui/TourPopover';

interface GuidedTourProps {
    tourState: { step: number; forceOpen: string };
    setTourState: React.Dispatch<React.SetStateAction<{ step: number; forceOpen: string }>>;
    onComplete: () => void;
}

const tourSteps = [
    {
        selector: '[data-tour-id="dashboard"]',
        title: 'Welcome to InQuBu Pro!',
        content: 'This is your dashboard, providing a quick overview of your business activities. Let\'s take a quick tour of the main features.',
        forceOpen: '',
    },
    {
        selector: '[data-tour-id="new-job-button"]',
        title: 'Job Costing',
        content: 'Start here to build a detailed job, calculating material costs and sale prices before creating a quote or invoice.',
        forceOpen: 'job-costing',
    },
    {
        selector: '[data-tour-id="sales-section"]',
        title: 'Sales Management',
        content: 'This section is for managing all your sales documents. Create new invoices and quotes, and track existing ones.',
        forceOpen: 'sales',
    },
    {
        selector: '[data-tour-id="purchasing-section"]',
        title: 'Purchasing',
        content: 'Here you can create Purchase Orders (POs) for your suppliers and record Bills you receive from them.',
        forceOpen: 'purchasing',
    },
    {
        selector: '[data-tour-id="customers-section"]',
        title: 'Customers & Suppliers',
        content: 'Manage your client and supplier relationships here. Add new contacts or view existing ones.',
        forceOpen: 'customers',
    },
    {
        selector: '[data-tour-id="management-section"]',
        title: 'Business Management',
        content: 'Control your inventory, track jobs on the board, manage your chart of accounts, and view reports.',
        forceOpen: 'management',
    },
    {
        selector: '[data-tour-id="settings-link"]',
        title: 'Configure Your Settings',
        content: 'Finally, visit the Settings page to enter your company details, customize invoice titles, set numbering, and more.',
        forceOpen: 'system',
    },
];


const GuidedTour: React.FC<GuidedTourProps> = ({ tourState, setTourState, onComplete }) => {
    const { step } = tourState;

    const handleNext = () => {
        if (step < tourSteps.length - 1) {
            const nextStep = step + 1;
            setTourState({ step: nextStep, forceOpen: tourSteps[nextStep].forceOpen });
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (step > 0) {
            const prevStep = step - 1;
            setTourState({ step: prevStep, forceOpen: tourSteps[prevStep].forceOpen });
        }
    };

    if (step < 0 || step >= tourSteps.length) {
        return null;
    }

    const currentStep = tourSteps[step];
    
    return (
        <TourPopover
            targetSelector={currentStep.selector}
            title={currentStep.title}
            content={currentStep.content}
            step={step + 1}
            totalSteps={tourSteps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={onComplete}
        />
    );
};

export default GuidedTour;
