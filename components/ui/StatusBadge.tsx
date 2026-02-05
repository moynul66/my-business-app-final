import React from 'react';

type StatusType = 'Paid' | 'Unpaid' | 'Partially Paid' | 'Draft' | 'Approved';

interface StatusBadgeProps {
    status: StatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const baseStyles = 'px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block capitalize';

    const statusStyles: Record<StatusType, string> = {
        'Paid': 'bg-green-100 text-green-800',
        'Unpaid': 'bg-red-100 text-red-800',
        'Partially Paid': 'bg-yellow-100 text-yellow-800',
        'Draft': 'bg-slate-200 text-slate-800',
        'Approved': 'bg-blue-100 text-blue-800',
    };

    const classes = `${baseStyles} ${statusStyles[status]}`;

    return <span className={classes}>{status}</span>;
};