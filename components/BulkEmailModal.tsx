import React, { useState } from 'react';
import { User } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { XIcon } from './icons/XIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';

interface BulkEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
}

const BulkEmailModal: React.FC<BulkEmailModalProps> = ({ isOpen, onClose, users }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const handleSend = () => {
        const userEmails = users
            .filter(u => u.email)
            .map(u => u.email)
            .join(',');
        
        if (!userEmails) {
            alert('There are no users with email addresses to send to.');
            return;
        }

        const mailtoLink = `mailto:?bcc=${encodeURIComponent(userEmails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoLink;
        onClose();
        setTimeout(() => {
             alert('Your email client has been opened to send the bulk email.');
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:my-8 w-full max-w-2xl mx-4 border border-slate-200">
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl leading-6 font-bold text-slate-900" id="modal-title">
                            Send Bulk Email to All Registered Users
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
                    <div className="mt-6 space-y-4">
                         <div>
                            <label htmlFor="emailSubject" className="block text-sm font-medium text-slate-600">Subject</label>
                            <Input id="emailSubject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="emailBody" className="block text-sm font-medium text-slate-600">Body</label>
                            <TextArea id="emailBody" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                    <Button
                        variant="primary"
                        onClick={handleSend}
                    >
                        <EnvelopeIcon className="w-5 h-5 mr-2" />
                        Send via Email Client
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BulkEmailModal;