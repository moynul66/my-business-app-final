import React from 'react';
import { XIcon } from '../icons/XIcon';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = '6xl' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" onClick={onClose}></div>
            <div className={`relative bg-white rounded-lg shadow-xl transform transition-all sm:my-8 w-full ${sizeClasses[size]} mx-4 border border-slate-200`}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                            {title}
                        </h3>
                        <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close</span>
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="mt-6">
                        {children}
                    </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 sm:px-6 flex flex-row-reverse gap-2">
                    {footer !== undefined ? footer : (
                        <Button
                            variant="primary"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};