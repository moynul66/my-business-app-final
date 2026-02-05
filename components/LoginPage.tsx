import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { User } from '../types';

interface LoginPageProps {
    onLogin: (user: User) => void;
    onNavigateToRegister: () => void;
    users: User[];
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister, users }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            if (user.isActive === false) {
                setError('Your account has been deactivated. Please contact an administrator.');
                return;
            }
            setError('');
            onLogin(user);
        } else {
            setError('Invalid username or password.');
        }
    };

    const handleForgotPassword = () => {
        alert("For account recovery, please contact the master administrator.");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">
                        InQuBu Pro
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">Inventory & Quoting, Built for You</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
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
                            autoComplete="username"
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
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="flex items-center justify-end">
                        <div className="text-sm">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                            >
                                Forgot Username/Password?
                            </button>
                        </div>
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
                            Login
                        </Button>
                    </div>
                </form>
                <div className="text-center text-sm">
                    <p className="text-slate-600">
                        Don't have an account?{' '}
                        <button
                            type="button"
                            onClick={onNavigateToRegister}
                            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
                        >
                            Register here
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;