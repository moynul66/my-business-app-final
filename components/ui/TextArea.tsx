import React from 'react';

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// fix: Update TextArea to forward refs to resolve an error when passing a ref for dynamic height adjustment.
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(({ className, ...props }, ref) => {
    const baseStyles = 'block w-full rounded-md border-blue-300 bg-blue-50 text-blue-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder:text-blue-400 px-3 py-2';
    const classes = `${baseStyles} ${className || ''}`;
    return <textarea className={classes} {...props} ref={ref} />;
});

TextArea.displayName = 'TextArea';
