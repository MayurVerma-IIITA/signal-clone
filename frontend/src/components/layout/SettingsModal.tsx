"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Check, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const { user, setUser } = useAuthStore();

  const handleTogglePrivacy = async (field: 'allow_read_receipts' | 'allow_typing_indicators') => {
    if (!user) return;
    const newValue = !(user[field] ?? true);
    
    try {
      // Optimistic update
      setUser({ ...user, [field]: newValue });
      
      await api.put('/api/users/me/privacy', {
        allow_read_receipts: field === 'allow_read_receipts' ? newValue : (user.allow_read_receipts ?? true),
        allow_typing_indicators: field === 'allow_typing_indicators' ? newValue : (user.allow_typing_indicators ?? true)
      });
    } catch (err) {
      console.error('Failed to update privacy settings', err);
      // Revert on fail
      setUser({ ...user, [field]: !newValue });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex items-center text-gray-700 dark:text-gray-200 cursor-pointer w-full">
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#111B21] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">
            Manage your account settings below.
          </p>
          <div className="bg-gray-100 dark:bg-[#202C33] rounded-lg p-3">
            <h4 className="font-semibold text-sm mb-3">Privacy</h4>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium">Read Receipts</p>
                <p className="text-xs text-gray-500">Let others know when you have read their messages.</p>
              </div>
              <button 
                onClick={() => handleTogglePrivacy('allow_read_receipts')}
                className={`w-10 h-5 rounded-full relative transition-colors ${user?.allow_read_receipts ?? true ? 'bg-blue-500' : 'bg-gray-400'}`}
              >
                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${user?.allow_read_receipts ?? true ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Typing Indicators</p>
                <p className="text-xs text-gray-500">Let others see when you are typing.</p>
              </div>
              <button 
                onClick={() => handleTogglePrivacy('allow_typing_indicators')}
                className={`w-10 h-5 rounded-full relative transition-colors ${user?.allow_typing_indicators ?? true ? 'bg-blue-500' : 'bg-gray-400'}`}
              >
                <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${user?.allow_typing_indicators ?? true ? 'translate-x-5' : 'translate-x-0'}`}></span>
              </button>
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-[#202C33] rounded-lg p-3 opacity-50">
            <h4 className="font-semibold text-sm mb-1">Notifications</h4>
            <p className="text-xs">Message, group, and call tones.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
