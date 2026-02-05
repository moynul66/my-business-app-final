import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'outline' | 'danger' | 'ghost';
    size?: 'normal' | 'icon' | 'sm';
};

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'normal', className, ...props }) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        outline: 'border border-blue-500 bg-transparent text-blue-600 hover:bg-blue-100 focus:ring-blue-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'text-blue-600 hover:bg-blue-100 focus:ring-blue-500'
    };

    const sizeStyles = {
        normal: 'px-4 py-2 text-sm',
        icon: 'p-2',
        sm: 'px-3 py-1.5 text-xs'
    }

    const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''}`;

    return (
        <button className={classes} {...props}>
            {children}
        </button>
    );
};