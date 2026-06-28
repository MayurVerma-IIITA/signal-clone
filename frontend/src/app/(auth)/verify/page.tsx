"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function VerifyForm() {
  const searchParams = useSearchParams();
  const defaultOtp = searchParams.get('otp') || '';
  const username = searchParams.get('u') || '';
  
  const [otp, setOtp] = useState(defaultOtp);
  const [error, setError] = useState('');
  const router = useRouter();
  const setUser = useAuthStore(state => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await api.post('/api/auth/verify-otp', {
        phone_or_username: username,
        otp: otp
      });
      setUser(res.data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-sm text-center mb-6">
        For this demo, your verification code is <strong className="text-lg">123456</strong>
      </div>
      
      <div className="space-y-2">
        <Input 
          placeholder="6-digit code" 
          value={otp} 
          onChange={e => setOtp(e.target.value)} 
          required 
          className="text-center text-xl tracking-widest"
          maxLength={6}
        />
      </div>
      
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      
      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
        Verify & Complete
      </Button>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Verify your account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Enter the code we just sent you</p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
