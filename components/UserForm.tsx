import React, { useState, useEffect } from 'react';
import { User, UserPermissions, PermissionLevel } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface UserFormProps {
    currentUser: User | null;
    masterUser: User;
    onSave: (user: User) => boolean;
    onCancel: () => void;
}

const defaultPermissions: UserPermissions = {
    sales: 'view',
    purchasing: 'view',
    management: 'view',
    reports: 'view',
    settings: 'view',
    subscriptions: 'none',
    jobBoard: 'none',
};

const jobBoardOnlyPermissions: UserPermissions = {
    sales: 'none',
    purchasing: 'none',
    management: 'none',
    reports: 'none',
    settings: 'none',
    subscriptions: 'none',
    jobBoard: 'view',
};

const permissionAreas: { key: keyof UserPermissions, label: string }[] = [
    { key: 'sales', label: 'Sales (Invoices, Quotes, etc.)' },
    { key: 'purchasing', label: 'Purchasing (POs, Bills)' },
    { key: 'management', label: 'Management (Customers, Inventory, etc.)' },
    { key: 'jobBoard', label: 'Jobs Board'},
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
    { key: 'subscriptions', label: 'Subscription Management' },
];

const UserForm: React.FC<UserFormProps> = ({ currentUser, masterUser, onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);
    const [isActive, setIsActive] = useState(true);
    const [roleType, setRoleType] = useState<'full' | 'job_board_only'>('full');

    const isEditing = !!currentUser;

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
            setUsername(currentUser.username);
            setEmail(currentUser.email || '');
            setPassword(''); // Don't pre-fill password for security
            
            const currentPerms = currentUser.permissions || defaultPermissions;
            setPermissions(currentPerms);
            setIsActive(currentUser.isActive !== false);

            const isJobBoardOnly =
                currentPerms.jobBoard === 'view' &&
                currentPerms.sales === 'none' &&
                currentPerms.management === 'none';
            setRoleType(isJobBoardOnly ? 'job_board_only' : 'full');

        } else {
            setName('');
            setUsername('');
            setEmail('');
            setPassword('');
            setPermissions(defaultPermissions);
            setIsActive(true);
            setRoleType('full');
        }
    }, [currentUser]);

    useEffect(() => {
        if (roleType === 'job_board_only') {
            setPermissions(jobBoardOnlyPermissions);
        } else {
            setPermissions(currentUser?.permissions || defaultPermissions);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleType]);

    const handlePermissionChange = (area: keyof UserPermissions, level: PermissionLevel) => {
        setPermissions(prev => ({ ...prev, [area]: level }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            alert('Username is required.');
            return;
        }
        if (!isEditing && !password) {
            alert('Password is required for new users.');
            return;
        }
        if (password && password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        const userData: User = {
            id: currentUser?.id || crypto.randomUUID(),
            name: name.trim() ? name.trim() : undefined,
            username: username.trim(),
            email: email.trim(),
            password: password || (currentUser?.password || ''),
            role: 'team-member',
            teamId: masterUser.id,
            subscriptionStatus: 'inherited',
            isActive,
            permissions,
        };
        
        const success = onSave(userData);
        if (success && !isEditing) {
            setName('');
            setUsername('');
            setEmail('');
            setPassword('');
            setPermissions(defaultPermissions);
            setRoleType('full');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Username</label>
                    <Input value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isEditing ? 'Leave blank to keep unchanged' : ''}
                    required={!isEditing}
                />
            </div>

            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Role Type</label>
                 <div className="flex gap-4 p-2 bg-slate-100 rounded-lg">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="radio" name="roleType" value="full" checked={roleType === 'full'} onChange={() => setRoleType('full')} /> Full Permissions
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="radio" name="roleType" value="job_board_only" checked={roleType === 'job_board_only'} onChange={() => setRoleType('job_board_only')} /> Jobs Board Only
                    </label>
                 </div>
            </div>

            {roleType === 'full' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                    <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
                        {permissionAreas.map(({ key, label }) => (
                            <div key={key} className="grid grid-cols-4 items-center">
                                <label className="text-sm text-slate-800 col-span-2">{label}</label>
                                <div className="flex items-center justify-around col-span-2">
                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                        <input type="radio" name={key} checked={permissions[key] === 'none'} onChange={() => handlePermissionChange(key, 'none')} /> No Access
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                        <input type="radio" name={key} checked={permissions[key] === 'view'} onChange={() => handlePermissionChange(key, 'view')} /> View Only
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                        <input type="radio" name={key} checked={permissions[key] === 'edit'} onChange={() => handlePermissionChange(key, 'edit')} /> Full Access
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

             {isEditing && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Account Status</label>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                        <label htmlFor="isActive" className="text-sm">Account is Active</label>
                    </div>
                </div>
            )}
            
            <div className="flex justify-end gap-2 mt-8">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="primary">{isEditing ? 'Save Changes' : 'Create User'}</Button>
            </div>
        </form>
    );
};

export default UserForm;