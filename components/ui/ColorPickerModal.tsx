import React from 'react';
import { Modal } from './Modal';

interface ColorPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectColor: (color: string) => void;
}

const VIBRANT_COLORS = [
    'bg-white', 'bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 
    'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 
    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
];

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({ isOpen, onClose, onSelectColor }) => {
    
    const handleSelect = (colorClass: string) => {
        onSelectColor(colorClass);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Select a Color" size="lg">
            <div className="grid grid-cols-8 gap-2 p-4">
                {VIBRANT_COLORS.map(colorClass => (
                    <button
                        key={colorClass}
                        type="button"
                        onClick={() => handleSelect(colorClass)}
                        className={`w-12 h-12 rounded-full ${colorClass} border-2 border-slate-300 hover:ring-4 hover:ring-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all`}
                        aria-label={`Select color ${colorClass}`}
                    />
                ))}
            </div>
        </Modal>
    );
};

export default ColorPickerModal;