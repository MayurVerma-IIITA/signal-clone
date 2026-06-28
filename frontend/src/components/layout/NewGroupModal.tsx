"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users } from 'lucide-react';
import api from '@/lib/api';
import { User } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useConversationStore } from '@/store/conversationStore';
import { useRouter } from 'next/navigation';

export function NewGroupModal() {
  const { isNewGroupModalOpen, setIsNewGroupModalOpen } = useUIStore();
  const addConversation = useConversationStore(state => state.addConversation);
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
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

  const toggleUser = (user: User) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    try {
      // Assuming a group creation endpoint: POST /api/groups
      // For now, our schema handles it, let's pretend there's an endpoint
      // Actually we need to make sure the endpoint exists in FastAPI.
      // Wait, there is NO POST /api/groups endpoint in the previous code.
      // We will need to build the API for group creation, or mock it in frontend.
      // Let's create the API in the backend first.
      const res = await api.post('/api/conversations/groups', {
        name: groupName,
        participant_ids: selectedUsers.map(u => u.id)
      });
      addConversation(res.data);
      setIsNewGroupModalOpen(false);
      router.push(`/conversation/${res.data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isNewGroupModalOpen} onOpenChange={setIsNewGroupModalOpen}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#111B21] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 my-2">
          <Input 
            placeholder="Group Subject" 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-gray-100 dark:bg-[#202C33] border-none"
          />

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              className="pl-9 bg-gray-100 dark:bg-[#202C33] border-none text-sm h-9"
              placeholder="Search contacts to add"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(u => (
              <div key={u.id} className="bg-gray-200 dark:bg-[#2A3942] px-2 py-1 rounded-full text-xs flex items-center">
                {u.display_name}
                <button onClick={() => toggleUser(u)} className="ml-2 text-gray-500 hover:text-red-500">×</button>
              </div>
            ))}
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-1 border-t border-gray-100 dark:border-gray-800 pt-2">
            {results.map(user => {
              const isSelected = selectedUsers.some(u => u.id === user.id);
              return (
                <div 
                  key={user.id} 
                  onClick={() => toggleUser(user)}
                  className={`flex items-center p-2 cursor-pointer rounded-lg transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-[#202C33]'}`}
                >
                  <Avatar className="w-8 h-8 mr-3">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.display_name}</p>
                  </div>
                  {isSelected && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><span className="text-white text-[10px]">✓</span></div>}
                </div>
              );
            })}
          </div>

          <Button 
            onClick={createGroup} 
            disabled={!groupName.trim() || selectedUsers.length === 0}
            className="w-full bg-[#00A884] hover:bg-[#008f6f] text-white"
          >
            Create Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
