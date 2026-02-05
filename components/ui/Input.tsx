import React, { useState, useEffect } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className, type, value, onChange, ...props }) => {
    const baseStyles = 'block w-full rounded-md border-blue-300 bg-blue-50 text-blue-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder:text-blue-400 px-3 py-2';
    
    if (type === 'number') {
        // Use a local state to manage the string displayed in the input.
        // This allows for temporary states like an empty string ('') which would otherwise be forced to '0' by the parent's number state.
        const [displayValue, setDisplayValue] = useState(String(value ?? ''));

        useEffect(() => {
            const numericPropValue = Number(value);
            const numericDisplayValue = parseFloat(displayValue);

            // Sync from parent prop `value` to local `displayValue`
            // This is skipped if the values are already equivalent.
            if (numericPropValue === numericDisplayValue) {
                return;
            }
            
            // This is the key: if the user has just cleared the input, the displayValue is ''
            // while the parent state has become 0. We want to respect the user's action and
            // keep the input empty, so we don't update the displayValue back to '0'.
            if (displayValue === '' && (numericPropValue === 0 || isNaN(numericPropValue))) {
                return;
            }

            // For all other cases where the prop and display are out of sync, update the display.
            setDisplayValue(String(value ?? ''));

        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newDisplayValue = e.target.value;
            // Restrict input to valid number-like strings
            if (newDisplayValue === '' || newDisplayValue === '-' || /^-?\d*\.?\d*$/.test(newDisplayValue)) {
                setDisplayValue(newDisplayValue);
                if (onChange) {
                    // Pass the raw string value up to the parent component's handler
                    const syntheticEvent = { ...e, target: { ...e.target, value: newDisplayValue } };
                    onChange(syntheticEvent);
                }
            }
        };

        const classes = `${baseStyles} no-spinners ${className || ''}`;
        
        return (
            <input 
                {...props} 
                type="text" // Use "text" to allow empty strings and intermediate characters like "."
                inputMode="decimal" // Provides a numeric keyboard on mobile devices
                className={classes} 
                value={displayValue} 
                onChange={handleChange} 
            />
        );
    }

    // fix: Use the destructured 'type' prop directly instead of from the 'props' object.
    const dateInputStyles = type === 'date' ? '[color-scheme:light]' : '';
    const classes = `${baseStyles} ${dateInputStyles} ${className || ''}`;
    return <input type={type} className={classes} value={value} onChange={onChange} {...props} />;
};