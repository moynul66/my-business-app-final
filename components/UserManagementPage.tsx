import React, { useState } from 'react';
import { User, SubscriptionPackage } from '../types';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { UsersIcon } from './icons/UsersIcon';
import { Input } from './ui/Input';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { Modal } from './ui/Modal';
import UserForm from './UserForm';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { StarIcon } from './icons/StarIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';

interface UserManagementPageProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentUser: User;
    subscriptionPackages: SubscriptionPackage[];
    onOpenBulkEmail: () => void;
    onOpenUserEmail: (user: User) => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ users, setUsers, currentUser, subscriptionPackages, onOpenBulkEmail, onOpenUserEmail }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [extendingLicenceUser, setExtendingLicenceUser] = useState<User | null>(null);
    const [extensionDays, setExtensionDays] = useState(7);

    const updateUser = (userId: string, updates: Partial<User>) => {
        // setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    };
    
    const handleDeleteUser = (userIdToDelete: string) => {
        const userToDelete = users.find(u => u.id === userIdToDelete);
        if (!userToDelete) return;

        if (currentUser.role === 'admin' && userToDelete.role === 'master') {
             const teamMemberCount = users.filter(u => u.teamId === userIdToDelete && u.id !== userIdToDelete).length;
             if (!window.confirm(`Are you sure you want to delete the user "${userToDelete.username}", their ${teamMemberCount} team member(s), and all their associated business data? This action cannot be undone.`)) {
                return;
            }
             // Delete all localStorage data associated with the master user
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`${userIdToDelete}_`)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Remove the master user and all their team members
            // setUsers(prevUsers => prevUsers.filter(user => user.id !== userIdToDelete && user.teamId !== userIdToDelete));
            alert(`User "${userToDelete.username}" and all their data have been deleted.`);

        } else if (currentUser.role === 'master') {
            if (!window.confirm(`Are you sure you want to delete the user "${userToDelete.username}"? This action cannot be undone.`)) {
                return;
            }
            // setUsers(prevUsers => prevUsers.filter(user => user.id !== userIdToDelete));
            alert(`User "${userToDelete.username}" has been deleted.`);
        }
    };
    
    const handleOpenCreateForm = () => {
        setEditingUser(null);
        setIsFormModalOpen(true);
    };

    const handleOpenEditForm = (user: User) => {
        setEditingUser(user);
        setIsFormModalOpen(true);
    };

    const handleSaveUser = (userData: User) => {
        if (users.some(u => u.id !== userData.id && u.username.toLowerCase() === userData.username.toLowerCase())) {
            alert('Username already exists.');
            return false;
        }
        if (users.some(u => u.id !== userData.id && u.email && userData.email && u.email.toLowerCase() === userData.email.toLowerCase())) {
            alert('Email already exists.');
            return false;
        }

        if (editingUser) { // Update
            // setUsers(prev => prev.map(u => u.id === userData.id ? userData : u));
        } else { // Create
            // setUsers(prev => [...prev, userData]);
        }
        setIsFormModalOpen(false);
        setEditingUser(null);
        return true;
    };
    
     const handleExtendLicence = () => {
        if (!extendingLicenceUser || extensionDays <= 0) return;
        
        const currentEndDate = extendingLicenceUser.trialEndDate ? new Date(extendingLicenceUser.trialEndDate) : new Date();
        const baseDate = new Date() > currentEndDate ? new Date() : currentEndDate;
        baseDate.setDate(baseDate.getDate() + extensionDays);
        
        updateUser(extendingLicenceUser.id, { trialEndDate: baseDate.toISOString() });
        alert(`Licence for ${extendingLicenceUser.username} extended by ${extensionDays} days.`);
        setExtendingLicenceUser(null);
        setExtensionDays(7);
    };

    const handleGrantLifetime = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if(!user) return;

        if (window.confirm(`Are you sure you want to grant lifetime access to "${user.username}"? This will give them permanent access and cannot be undone.`)) {
            updateUser(userId, { subscriptionStatus: 'lifetime_free', trialEndDate: undefined });
             alert(`Lifetime access granted to ${user.username}.`);
        }
    };

    // --- RENDER LOGIC --- //

    const AdminView = () => {
        const masterUsers = users.filter(u => u.role === 'master');
        return (
             <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-3xl font-bold text-slate-800">User Administration</h2>
                    <Button variant="outline" onClick={onOpenBulkEmail}>
                        <EnvelopeIcon className="w-5 h-5 mr-2" />
                        Bulk Email Users
                    </Button>
                </div>
                
                <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-2">
                    {masterUsers.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                            <UsersIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500">No users have registered yet.</p>
                        </div>
                    ) : (
                        masterUsers.map(user => {
                            const isTrialing = user.subscriptionStatus.startsWith('trial_');
                             const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
                             const isTrialExpired = trialEndDate && new Date() > trialEndDate;
                             const isActive = user.isActive !== false;

                            return (
                            <div key={user.id} className="bg-slate-50 p-4 rounded-lg border">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-3">
                                    <div>
                                        <p className="font-semibold text-slate-800 text-lg">
                                            {user.name ? (
                                                <>{user.name} <span className="text-base font-normal text-slate-500">({user.username})</span></>
                                            ) : (
                                                user.username
                                            )}
                                        </p>
                                        <p className="text-sm text-slate-500">{user.email || 'No email provided'}</p>
                                        <p className="text-sm text-slate-500 capitalize mt-1">Status: <span className="font-medium">{user.subscriptionStatus}</span></p>
                                        {isTrialing && trialEndDate && (
                                            <p className={`text-xs ${isTrialExpired ? 'text-red-500' : 'text-slate-500'}`}>
                                                Licence Ends: {trialEndDate.toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                     <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                                        <Button size="icon" variant="ghost" onClick={() => onOpenUserEmail(user)} disabled={!user.email} title="Email User"><EnvelopeIcon className="w-5 h-5" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setExtendingLicenceUser(user)} title="Extend Licence"><CalendarDaysIcon className="w-5 h-5" /></Button>
                                        <Button variant="outline" size="sm" onClick={() => handleGrantLifetime(user.id)}><StarIcon className="w-4 h-4 mr-2" /> Grant Lifetime Access</Button>
                                        <Button size="icon" variant="danger" onClick={() => handleDeleteUser(user.id)} title="Delete User"><TrashIcon className="w-5 h-5" /></Button>
                                        
                                        <label htmlFor={`active-toggle-${user.id}`} className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id={`active-toggle-${user.id}`}
                                                className="sr-only peer"
                                                checked={isActive}
                                                onChange={() => updateUser(user.id, { isActive: !isActive })}
                                            />
                                            <div className="w-11 h-6 bg-red-500 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            <span className="ml-3 text-sm font-medium text-slate-700">{isActive ? 'Active' : 'Inactive'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )})
                    )}
                </div>
            </div>
        );
    };

    const MasterUserView = () => {
        const teamMembers = users.filter(user => user.teamId === currentUser.id && user.id !== currentUser.id);

        const packageId = currentUser.subscriptionStatus.replace(/^(trial_|package_)/, '');
        const currentPackage = subscriptionPackages.find(p => p.id === packageId);
        
        const isLimitless = currentUser.role === 'admin' || currentUser.subscriptionStatus === 'lifetime_free';
        const teamMemberLimit = currentPackage?.teamMemberLimit ?? 0;
        const hasReachedLimit = !isLimitless && teamMembers.length >= teamMemberLimit;

        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Manage Your Team</h2>
                        {!isLimitless && (
                            <p className="text-sm text-slate-500 mt-1">
                                You are using {teamMembers.length} / {teamMemberLimit} team member slots.
                            </p>
                        )}
                    </div>
                    <div>
                        <Button variant="primary" onClick={handleOpenCreateForm} disabled={hasReachedLimit}>
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create New Team Member
                        </Button>
                        {hasReachedLimit && (
                            <p className="mt-2 text-sm text-red-600 text-right">
                                Please upgrade your plan to add more team members.
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="max-h-[65vh] overflow-y-auto space-y-4 pr-2">
                    {teamMembers.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                            <UsersIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500">No team members have been created yet.</p>
                        </div>
                    ) : (
                        teamMembers.map(user => (
                            <div key={user.id} className="bg-slate-50 p-4 rounded-lg border">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-800 text-lg">
                                            {user.name ? (
                                                <>{user.name} <span className="text-base font-normal text-slate-500">({user.username})</span></>
                                            ) : (
                                                user.username
                                            )}
                                        </p>
                                        <p className="text-sm text-slate-500">{user.email || 'No email provided'}</p>
                                        <p className="text-sm text-slate-500 capitalize mt-1">Status: <span className="font-medium">{user.isActive ? 'Active' : 'Deactivated'}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => onOpenUserEmail(user)} title={`Email ${user.username}`} disabled={!user.email}>
                                            <EnvelopeIcon className="w-5 h-5" />
                                        </Button>
                                        <Button variant="outline" onClick={() => handleOpenEditForm(user)}>
                                            <PencilIcon className="w-4 h-4 mr-2" /> Edit / Permissions
                                        </Button>
                                        <Button variant="danger" size="icon" onClick={() => handleDeleteUser(user.id)} title="Delete user">
                                            <TrashIcon className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {currentUser.role === 'admin' ? <AdminView /> : <MasterUserView />}
            
            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingUser ? 'Edit Team Member' : 'Create New Team Member'}>
                <UserForm currentUser={editingUser} onSave={handleSaveUser} onCancel={() => setIsFormModalOpen(false)} masterUser={currentUser} />
            </Modal>
            
            <Modal isOpen={!!extendingLicenceUser} onClose={() => setExtendingLicenceUser(null)} title={`Extend Licence for ${extendingLicenceUser?.username}`}>
                <div className="space-y-4">
                    <p>Enter the number of days to extend the licence period. This will be added to the current end date, or from today if the licence has expired.</p>
                    <div>
                        <label htmlFor="extensionDays" className="block text-sm font-medium text-slate-700">Days to Add</label>
                        <Input id="extensionDays" type="number" min="1" value={extensionDays} onChange={e => setExtensionDays(parseInt(e.target.value, 10) || 1)} />
                    </div>
                     <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setExtendingLicenceUser(null)}>Cancel</Button>
                        <Button variant="primary" onClick={handleExtendLicence}>Extend Licence</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default UserManagementPage;