"use client";

import { ChatPane } from '@/components/chat/ChatPane';
import { use } from 'react';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] dark:bg-[#0b141a]">
      <ChatPane conversationId={resolvedParams.id} />
    </div>
  );
}
