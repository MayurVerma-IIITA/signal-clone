"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Edit, MoreVertical, LogOut, Sun, Moon, CircleDashed } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useConversationStore } from '@/store/conversationStore';
import { useUIStore } from '@/store/uiStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { NewChatModal } from './NewChatModal';
import { NewGroupModal } from './NewGroupModal';
import { SettingsModal } from './SettingsModal';
import { Users } from 'lucide-react';

export function Sidebar() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const { conversations, setConversations, activeConversationId } = useConversationStore();
  const { theme, setTheme, setIsNewGroupModalOpen, setIsStoriesOpen } = useUIStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    // apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await api.get('/api/conversations');
        setConversations(res.data);
      } catch (e) {
        console.error("Failed to load conversations", e);
      }
    }
    fetchConversations();
  }, [setConversations]);

  const handleLogout = async () => {
    await api.post('/api/auth/logout');
    logout();
    router.push('/login');
  };

  const filteredConversations = conversations.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at).getTime();
    const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at).getTime();
    return bTime - aTime;
  });

  return (
    <div className="w-full md:w-[360px] lg:w-[400px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111B21] flex flex-col h-full">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-gray-100 dark:bg-[#202C33]">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback>{user?.display_name?.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
          <button 
            onClick={() => setIsStoriesOpen(true)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors"
            title="Stories"
          >
            <CircleDashed className="w-5 h-5" />
          </button>
          <NewChatModal />
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-[#233138] border-gray-200 dark:border-gray-700">
              <DropdownMenuItem onClick={() => setIsNewGroupModalOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                New Group
              </DropdownMenuItem>
              <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 dark:hover:bg-[#202C33]">
                <SettingsModal />
              </div>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                Toggle Theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111B21]">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input 
            id="global-search-input"
            className="pl-10 bg-gray-100 dark:bg-[#202C33] border-none text-sm h-9 rounded-lg w-full focus-visible:ring-0 dark:placeholder:text-gray-500"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {sortedConversations.map(conv => (
          <div 
            key={conv.id}
            onClick={() => router.push(`/conversation/${conv.id}`)}
            className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202C33] transition-colors ${activeConversationId === conv.id ? 'bg-gray-100 dark:bg-[#2A3942]' : ''}`}
          >
            <Avatar className="w-12 h-12 mr-3">
              <AvatarImage src={conv.avatar_url} />
              <AvatarFallback>{conv.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-[17px] font-normal truncate dark:text-[#E9EDEF]">{conv.name}</h3>
                <span className="text-xs text-gray-500 dark:text-[#8696A0]">
                  {conv.last_message ? format(new Date(conv.last_message.created_at), 'HH:mm') : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-[#8696A0] truncate pr-4">
                  {conv.last_message?.content || 'No messages yet'}
                </p>
                {conv.unread_count > 0 && (
                  <div className="bg-[#00A884] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {conv.unread_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>

      <NewGroupModal />
    </div>
  );
}
