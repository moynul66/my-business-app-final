import React, { useState, useMemo } from 'react';
import { User, UserPermissions } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';

interface AdminTeamManagerProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentUser: User;
}

const jobBoardOnlyPermissions: UserPermissions = {
    sales: 'none', purchasing: 'none', management: 'none', reports: 'none', 
    settings: 'none', subscriptions: 'none', jobBoard: 'view',
};

const AdminTeamManager: React.FC<AdminTeamManagerProps> = ({ users, setUsers, currentUser }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '' });

    const teamMembers = useMemo(() => 
        users.filter(u => u.teamId === currentUser.id && u.role === 'team-member'), 
    [users, currentUser.id]);

    const handleOpenCreateForm = () => {
        setEditingUser(null);
        setFormData({ name: '', username: '', email: '', password: '' });
        setIsFormModalOpen(true);
    };

    const handleOpenEditForm = (user: User) => {
        setEditingUser(user);
        setFormData({ name: user.name || '', username: user.username, email: user.email, password: '' });
        setIsFormModalOpen(true);
    };

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (users.some(u => u.id !== editingUser?.id && u.username.toLowerCase() === formData.username.toLowerCase())) {
            alert('Username already exists.'); return;
        }
        if (formData.email && users.some(u => u.id !== editingUser?.id && u.email?.toLowerCase() === formData.email.toLowerCase())) {
            alert('Email already exists.'); return;
        }
        if (!editingUser && !formData.password) {
            alert('Password is required for new users.'); return;
        }
         if (formData.password && formData.password.length < 6) {
            alert('Password must be at least 6 characters long.'); return;
        }

        if (editingUser) {
            setUsers(prev => prev.map(u => u.id === editingUser.id ? {
                ...u,
                name: formData.name.trim() || undefined,
                username: formData.username.trim(),
                email: formData.email.trim(),
                password: formData.password ? formData.password : u.password,
            } : u));
        } else {
            const newUser: User = {
                id: crypto.randomUUID(),
                name: formData.name.trim() || undefined,
                username: formData.username.trim(),
                email: formData.email.trim(),
                password: formData.password,
                role: 'team-member',
                teamId: currentUser.id,
                subscriptionStatus: 'inherited',
                isActive: true,
                permissions: jobBoardOnlyPermissions,
            };
            setUsers(prev => [...prev, newUser]);
        }
        setIsFormModalOpen(false);
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this team member?')) {
            setUsers(prev => prev.filter(u => u.id !== userId));
        }
    };

    return (
        <>
        <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800">Manage My Team</h2>
                <Button variant="primary" onClick={handleOpenCreateForm}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Team Member
                </Button>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {teamMembers.length > 0 ? teamMembers.map(member => (
                    <div key={member.id} className="bg-slate-50 p-4 rounded-lg border">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-slate-800 text-lg">{member.name || member.username}</p>
                                <p className="text-sm text-slate-500">{member.email}</p>
                                <p className="text-xs text-slate-500 mt-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full inline-block">Jobs Board Only Role</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditForm(member)}><PencilIcon className="w-5 h-5 text-blue-600"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(member.id)}><TrashIcon className="w-5 h-5 text-red-500"/></Button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-lg">
                        <UserGroupIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">You haven't created any team members yet.</p>
                    </div>
                )}
            </div>
        </div>
        <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingUser ? 'Edit Team Member' : 'Create Team Member'}>
            <form onSubmit={handleSaveUser} className="space-y-4">
                <p className="text-sm p-3 bg-blue-50 text-blue-700 rounded-md">New team members will have a "Jobs Board Only" role, restricting their access to the jobs board.</p>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <Input value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} placeholder="e.g. John Doe"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Username</label>
                    <Input value={formData.username} onChange={e => setFormData(f => ({...f, username: e.target.value}))} required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <Input type="email" value={formData.email} onChange={e => setFormData(f => ({...f, email: e.target.value}))} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <Input type="password" value={formData.password} onChange={e => setFormData(f => ({...f, password: e.target.value}))} placeholder={editingUser ? 'Leave blank to keep unchanged' : ''} required={!editingUser} />
                </div>
                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="primary">{editingUser ? 'Save Changes' : 'Create Member'}</Button>
                </div>
            </form>
        </Modal>
        </>
    );
};

export default AdminTeamManager;