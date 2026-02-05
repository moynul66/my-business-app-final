import React, { useLayoutEffect, useState } from 'react';
import { Button } from './Button';
import { XIcon } from '../icons/XIcon';

interface TourPopoverProps {
    targetSelector: string;
    title: string;
    content: string;
    step: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

const TourPopover: React.FC<TourPopoverProps> = ({
    targetSelector,
    title,
    content,
    step,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
}) => {
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
    const targetElement = document.querySelector(targetSelector);

    useLayoutEffect(() => {
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            setPosition({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            });

            // Position popover logic
            const popoverHeight = 200; // Approximate height
            const popoverWidth = 320; // Approximate width
            const margin = 16;
            let popTop = rect.bottom + margin;
            let popLeft = rect.left + rect.width / 2 - popoverWidth / 2;

            // Adjust if it goes off-screen
            if (popTop + popoverHeight > window.innerHeight) {
                popTop = rect.top - popoverHeight - margin;
            }
            if (popLeft < margin) {
                popLeft = margin;
            }
            if (popLeft + popoverWidth > window.innerWidth) {
                popLeft = window.innerWidth - popoverWidth - margin;
            }

            setPopoverPosition({ top: popTop, left: popLeft });
            
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        }
    }, [targetElement]);

    if (!targetElement) {
        return null;
    }

    const highlightPadding = 4;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60"
                style={{
                    clipPath: `path('M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z M${position.left - highlightPadding},${position.top - highlightPadding} V${position.top + position.height + highlightPadding} H${position.left + position.width + highlightPadding} V${position.top - highlightPadding} Z')`,
                }}
            ></div>
            
            {/* Highlight Box */}
            <div
                className="absolute transition-all duration-300 ease-in-out pointer-events-none"
                style={{
                    top: position.top - highlightPadding,
                    left: position.left - highlightPadding,
                    width: position.width + highlightPadding * 2,
                    height: position.height + highlightPadding * 2,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6), 0 0 15px rgba(255,255,255,0.8)',
                    borderRadius: '8px',
                }}
            ></div>

            {/* Popover */}
            <div
                className="absolute bg-white rounded-lg shadow-2xl w-80 transition-all duration-300 ease-in-out"
                style={{ top: popoverPosition.top, left: popoverPosition.left }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tour-title"
            >
                <div className="p-5">
                    <div className="flex justify-between items-center mb-2">
                        <h3 id="tour-title" className="text-lg font-bold text-slate-800">{title}</h3>
                        <span className="text-sm font-medium text-slate-500">{step} / {totalSteps}</span>
                    </div>
                    <p className="text-sm text-slate-600">{content}</p>
                </div>
                <div className="px-5 py-3 bg-slate-50 flex justify-between items-center rounded-b-lg">
                    <Button variant="ghost" onClick={onSkip} className="text-sm">Skip Tour</Button>
                    <div className="flex gap-2">
                        {step > 1 && <Button variant="outline" onClick={onPrev} className="text-sm">Previous</Button>}
                        <Button variant="primary" onClick={onNext} className="text-sm">
                            {step === totalSteps ? 'Finish' : 'Next'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TourPopover;
