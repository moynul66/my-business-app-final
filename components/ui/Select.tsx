import React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select: React.FC<SelectProps> = ({ className, children, ...props }) => {
    const baseStyles = 'block w-full rounded-md border-blue-300 bg-blue-50 text-blue-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2';
    const classes = `${baseStyles} ${className || ''}`;
    return (
        <select className={classes} {...props}>
            {children}
        </select>
    );
};