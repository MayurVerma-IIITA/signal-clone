"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Video, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useConversationStore } from '@/store/conversationStore';
import { useAuthStore } from '@/store/authStore';
import { ConversationSettingsModal } from './ConversationSettingsModal';

export function ChatHeader({ conversationId, onSearchToggle }: { conversationId: string, onSearchToggle?: () => void }) {
  const router = useRouter();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const user = useAuthStore(state => state.user);
  const conversations = useConversationStore(state => state.conversations);
  
  const conv = conversations.find(c => c.id === conversationId);

  const handleBack = () => {
    router.push('/');
  };

  const handleMockCall = () => {
    alert("Calls coming soon");
  };

  if (!conv) return null;

  return (
    <div className="h-16 px-4 flex items-center justify-between bg-gray-100 dark:bg-[#202C33] border-b border-gray-200 dark:border-gray-800 flex-shrink-0 shadow-sm z-10">
      <div className="flex items-center">
        <button onClick={handleBack} className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-[#374045]">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        
        <Avatar className="w-10 h-10 mr-3 cursor-pointer" onClick={() => setIsSettingsModalOpen(true)}>
          <AvatarImage src={conv.avatar_url} />
          <AvatarFallback>{conv.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col cursor-pointer" onClick={() => setIsSettingsModalOpen(true)}>
          <h2 className="text-base font-medium dark:text-[#E9EDEF] leading-tight">{conv.name}</h2>
          {conv.type === 'direct' && (
            <span className="text-xs text-gray-500 dark:text-[#8696A0]">
              {/* Could show online status or last seen here */}
              click here for contact info
            </span>
          )}
          {conv.type === 'group' && (
            <span className="text-xs text-gray-500 dark:text-[#8696A0] truncate max-w-[200px]">
              {conv.participants.map(p => p.display_name).join(', ')}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 text-gray-500 dark:text-[#AEBAC1]">
        <button onClick={handleMockCall} className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors hidden sm:block">
          <Video className="w-5 h-5" />
        </button>
        <button onClick={handleMockCall} className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors hidden sm:block">
          <Phone className="w-5 h-5" />
        </button>
        <div className="w-[1px] h-6 bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block"></div>
        <button onClick={onSearchToggle} className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-2 hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
      
      <ConversationSettingsModal 
        conversationId={conversationId} 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </div>
  );
}

// Simple search icon since we didn't import it from lucide above
function Search(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
