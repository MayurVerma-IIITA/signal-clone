"use client";

import React, { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { StoriesModal } from '@/components/stories/StoriesModal';
import { useAuthStore } from '@/store/authStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const connectWs = useWebSocketStore(state => state.connect);
  const disconnectWs = useWebSocketStore(state => state.disconnect);

  useEffect(() => {
    if (!user) {
      // We are in a protected route but local state is missing.
      // Clear the cookie via API to break any middleware infinite loops.
      api.post('/api/auth/logout').finally(() => {
        window.location.href = '/login';
      });
    } else {
      // In a real app we'd fetch the actual JWT from cookies, but since we are using
      // httpOnly cookies, the WebSocket needs a token query param. 
      // For this demo we'll pass a dummy or let the backend rely on cookies if possible.
      // Assuming backend reads cookies for WS or we pass a mock token for now.
      connectWs(user.id, "dummy_token_for_now");
    }
    
    return () => {
      disconnectWs();
    };
  }, [user, router, connectWs, disconnectWs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen w-full bg-white dark:bg-[#0D1418] items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00A884] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0D1418] text-gray-900 dark:text-gray-100">
      {/* Sidebar - hidden on mobile when a chat is open (handled inside components) */}
      <Sidebar />
      
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F0F2F5] dark:bg-[#0b141a]">
        {children}
      </main>
      
      <StoriesModal />
    </div>
  );
}
