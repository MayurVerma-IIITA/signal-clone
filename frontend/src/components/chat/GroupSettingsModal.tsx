"use client";

import { useState } from 'react';
import { X, UserPlus, Trash2, Shield } from 'lucide-react';
import api from '@/lib/api';
import { useConversationStore } from '@/store/conversationStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/toast';

interface GroupSettingsModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupSettingsModal({ conversationId, isOpen, onClose }: GroupSettingsModalProps) {
  const [newUserId, setNewUserId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  
  const conversation = useConversationStore(state => 
    state.conversations.find(c => c.id === conversationId)
  );
  const updateConversation = useConversationStore(state => state.updateConversation);
  const currentUser = useAuthStore(state => state.user);

  if (!isOpen || !conversation || conversation.type !== 'group') return null;

  const isAdmin = currentUser?.id === conversation.group_admin_id;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim()) return;
    
    setIsAdding(true);
    try {
      const res = await api.post(`/api/conversations/${conversationId}/members`, {
        user_id: newUserId.trim()
      });
      
      updateConversation(conversationId, res.data);
      setNewUserId('');
      toast("Member added successfully", "success");
    } catch (err: any) {
      toast(err.response?.data?.detail || "Failed to add member", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await api.delete(`/api/conversations/${conversationId}/members/${userId}`);
      updateConversation(conversationId, res.data);
      toast("Member removed", "success");
    } catch (err: any) {
      toast(err.response?.data?.detail || "Failed to remove member", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-[#202C33] rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-[#2A3942] border-b border-gray-200 dark:border-[#374045]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Group Info</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-[#00A884] mx-auto mb-3 flex items-center justify-center text-4xl text-white">
              {conversation.name?.[0] || 'G'}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{conversation.name}</h3>
            <p className="text-sm text-gray-500 dark:text-[#8696A0]">{conversation.participants.length} members</p>
          </div>
          
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-[#8696A0] uppercase mb-3">Add Member</h4>
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="text"
                placeholder="User ID..."
                value={newUserId}
                onChange={e => setNewUserId(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-[#2A3942] border-none rounded-lg text-gray-900 dark:text-white outline-none"
              />
              <button 
                type="submit" 
                disabled={isAdding}
                className="p-2 bg-[#00A884] text-white rounded-lg hover:bg-[#008f6f] disabled:opacity-50"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </form>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-500 dark:text-[#8696A0] uppercase mb-3">Members</h4>
            <div className="space-y-2">
              {conversation.participants.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#2A3942] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {p.display_name[0]}
                    </div>
                    <div>
                      <div className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                        {p.display_name}
                        {p.id === conversation.group_admin_id && (
                          <span className="text-xs bg-[#00A884]/20 text-[#00A884] px-2 py-0.5 rounded flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-[#8696A0]">
                        {p.phone_or_username}
                      </div>
                    </div>
                  </div>
                  
                  {isAdmin && p.id !== currentUser?.id && (
                    <button 
                      onClick={() => handleRemoveMember(p.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
