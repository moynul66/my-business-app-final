import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const LoginPage: React.FC<any> = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isRegistering) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) setError(error.message);
            else alert("Registration successful! Please check your email to verify your account.");
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError(error.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border-t-4 border-blue-600">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">InQuBu Pro Cloud</h1>
                    <p className="mt-2 text-sm text-slate-500">Access your business from anywhere</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email Address</label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Password</label>
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    {error && <p className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
                    </Button>
                </form>
                <div className="text-center text-sm">
                    <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-600 hover:underline">
                        {isRegistering ? 'Already have an account? Login' : 'Need cloud storage? Register'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;