import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { XIcon } from './icons/XIcon';

interface TextEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newValue: string) => void;
    title: string;
    initialValue: string;
}

const TextEditModal: React.FC<TextEditModalProps> = ({ isOpen, onClose, onSave, title, initialValue }) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    const handleSaveClick = () => {
        onSave(value);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black bg-opacity-70" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveClick(); }}>
                        <TextArea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            rows={10}
                            autoFocus
                            className="w-full"
                        />
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                Save
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TextEditModal;