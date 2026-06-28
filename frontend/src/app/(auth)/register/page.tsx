"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await api.post('/api/auth/register', {
        phone_or_username: username,
        password: password,
        display_name: displayName
      });
      // Registration gives us fake OTP 123456
      // Redirect to verify page with username in query
      router.push(`/verify?u=${encodeURIComponent(username)}&otp=${res.data.otp}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Join Signal Clone today</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input 
            placeholder="Display Name" 
            value={displayName} 
            onChange={e => setDisplayName(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Input 
            placeholder="Username or Phone" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>
        
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
          Continue
        </Button>
      </form>
      
      <div className="text-center text-sm">
        <span className="text-gray-500">Already have an account? </span>
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
