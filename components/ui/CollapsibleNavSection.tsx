
import React, { useState } from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

interface CollapsibleNavSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const CollapsibleNavSection: React.FC<CollapsibleNavSectionProps> = ({ 
    title, 
    children, 
    defaultOpen = false,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };
    
    const contentId = `collapsible-section-${title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div>
            <button
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-controls={contentId}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-blue-400 uppercase tracking-wider rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <span>{title}</span>
                <ChevronDownIcon
                    className={`w-5 h-5 text-slate-200 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                id={contentId}
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] visible' : 'max-h-0 invisible'}`}
            >
                <div className="pt-2 pb-1 space-y-1">
                    {children}
                </div>
            </div>
        </div>
    );
};
