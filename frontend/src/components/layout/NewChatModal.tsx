"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Edit } from 'lucide-react';
import api from '@/lib/api';
import { User } from '@/store/authStore';
import { useConversationStore } from '@/store/conversationStore';
import { useRouter } from 'next/navigation';

export function NewChatModal() {
  const [open, setOpen] = useState(false);
  const addConversation = useConversationStore(state => state.addConversation);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const router = useRouter();

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.trim().length > 1) {
      try {
        const res = await api.get(`/api/users/search?q=${val}`);
        setResults(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setResults([]);
    }
  };

  const startChat = async (user: User) => {
    try {
      const res = await api.post('/api/conversations/direct', { user_id: user.id });
      addConversation(res.data);
      setOpen(false);
      router.push(`/conversation/${res.data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors">
        <Edit className="w-5 h-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#111B21] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>
        <div className="relative my-4">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input 
            className="pl-10 bg-gray-100 dark:bg-[#202C33] border-none focus-visible:ring-0 dark:placeholder:text-gray-500"
            placeholder="Search contacts by name or username"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {results.map(user => (
            <div 
              key={user.id} 
              onClick={() => startChat(user)}
              className="flex items-center p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202C33] rounded-lg transition-colors"
            >
              <Avatar className="w-10 h-10 mr-3">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.display_name}</p>
                <p className="text-xs text-gray-500">{user.phone_or_username}</p>
              </div>
            </div>
          ))}
          {query.trim().length > 1 && results.length === 0 && (
            <p className="text-sm text-center text-gray-500 mt-4">No users found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
