"use client";

import { useEffect, useState } from 'react';
import { useConversationStore } from '@/store/conversationStore';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessageStore } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';

const EMPTY_ARRAY: string[] = [];

export function ChatPane({ conversationId }: { conversationId: string }) {
  const setActiveConversationId = useConversationStore(state => state.setActiveConversationId);
  const typingUsers = useMessageStore(state => state.typingUsers[conversationId] || EMPTY_ARRAY);
  const currentUser = useAuthStore(state => state.user);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => setActiveConversationId(null);
  }, [conversationId, setActiveConversationId]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <ChatHeader conversationId={conversationId} onSearchToggle={() => setIsSearchOpen(!isSearchOpen)} />
      
      {isSearchOpen && (
        <div className="bg-white dark:bg-[#111B21] border-b border-gray-200 dark:border-gray-800 p-2 flex items-center shadow-sm z-10 absolute top-16 left-0 right-0">
          <input 
            autoFocus
            type="text" 
            placeholder="Search messages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-[#202C33] rounded-lg px-4 py-2 text-sm outline-none dark:text-gray-200"
          />
          <button 
            onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
            className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2"
          >
            Cancel
          </button>
        </div>
      )}

      <MessageList conversationId={conversationId} searchQuery={searchQuery} />
      
      {typingUsers.filter(id => id !== currentUser?.id).length > 0 && (
        <div className="px-4 py-1 text-sm text-gray-500 dark:text-gray-400 italic bg-[#EFEFEF] dark:bg-[#0b141a]">
          Someone is typing...
        </div>
      )}
      
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
