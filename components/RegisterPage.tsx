import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { User } from '../types';

interface RegisterPageProps {
    onRegisterSuccess: () => void;
    onNavigateToLogin: () => void;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onNavigateToLogin, users, setUsers }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            setError('Username already exists.');
            return;
        }
        if (email && users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
            setError('Email address is already in use.');
            return;
        }
        if(password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if(!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        const newUserId = crypto.randomUUID();
        const newUser: User = {
            id: newUserId,
            username,
            // fix: Explicitly set the email property to resolve a type error where the property was missing.
            email,
            password, // In a real app, this should be hashed before saving
            role: 'master',
            teamId: newUserId, // A master user is the head of their own team
            subscriptionStatus: 'needs_selection',
            isActive: true,
        };

        setUsers(prevUsers => [...prevUsers, newUser]);
        alert('Registration successful! Please log in to choose your plan and start your free trial.');
        onRegisterSuccess();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Create an Account
                    </h1>
                     <p className="mt-2 text-sm text-slate-500">Join InQuBu Pro to manage your business</p>
                </div>
                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-medium text-slate-700"
                        >
                            Username
                        </label>
                        <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-slate-700"
                        >
                            Email Address
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-slate-700"
                        >
                            Password
                        </label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1"
                        />
                    </div>
                     <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-slate-700"
                        >
                            Confirm Password
                        </label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="mt-1"
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}
                    <div>
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                        >
                            Register
                        </Button>
                    </div>
                </form>
                 <div className="text-center text-sm">
                    <p className="text-slate-600">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={onNavigateToLogin}
                            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                        >
                            Login here
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
