"use client";

import { Message } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, Reply, SmilePlus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import { useMessageStore } from '@/store/messageStore';
import api from '@/lib/api';

export function MessageBubble({ message, isConsecutive, isGroup }: { message: Message, isConsecutive: boolean, isGroup?: boolean }) {
  const user = useAuthStore(state => state.user);
  const setReplyingTo = useMessageStore(state => state.setReplyingTo);
  const [isExpired, setIsExpired] = useState(false);
  const isOwn = message.sender_id === user?.id;

  const reactionCounts = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleReply = () => {
    setReplyingTo(message);
  };

  const handleReact = async (emoji: string) => {
    try {
      await api.post(`/api/conversations/${message.conversation_id}/messages/${message.id}/react`, {
        emoji
      });
      // The websocket will broadcast the updated reaction list
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!message.disappears_at) return;
    const expiresAt = new Date(message.disappears_at).getTime();
    const now = Date.now();
    if (expiresAt <= now) {
      setIsExpired(true);
    } else {
      const timer = setTimeout(() => {
        setIsExpired(true);
      }, expiresAt - now);
      return () => clearTimeout(timer);
    }
  }, [message.disappears_at]);

  if (isExpired) return null;

  const COMMON_EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            className={`
              max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-1.5 relative shadow-sm cursor-pointer
              ${isOwn 
                ? 'bg-[#E7FFDB] dark:bg-[#005C4B] text-gray-900 dark:text-[#E9EDEF]' 
                : 'bg-white dark:bg-[#202C33] text-gray-900 dark:text-[#E9EDEF]'}
              ${!isConsecutive && isOwn ? 'rounded-tr-none' : ''}
              ${!isConsecutive && !isOwn ? 'rounded-tl-none' : ''}
            `}
          >
            {/* Tail */}
            {!isConsecutive && (
              <div className={`absolute top-0 w-3 h-3 ${isOwn ? '-right-1.5 bg-[#E7FFDB] dark:bg-[#005C4B]' : '-left-1.5 bg-white dark:bg-[#202C33]'} `} style={{ clipPath: isOwn ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
            )}

            {/* Sender Name (for groups) */}
            {isGroup && !isOwn && !isConsecutive && message.sender && (
              <div className="text-[13px] font-bold text-[#00A884] mb-0.5">
                {message.sender.display_name}
              </div>
            )}

            {message.reply_to_id && message.replies && (
              <div 
                className="mb-1 p-1.5 bg-black/5 dark:bg-black/20 rounded border-l-4 border-[#00A884] text-sm opacity-90 cursor-pointer"
                onClick={() => {
                  // Optional: scroll to message
                  const el = document.getElementById(`message-${message.reply_to_id}`);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <p className="font-semibold text-[#00A884]">Replied Message</p>
                <p className="truncate text-gray-700 dark:text-gray-300">
                  {message.replies.message_type === 'text' ? message.replies.content : `[${message.replies.message_type}]`}
                </p>
              </div>
            )}
            
            {message.message_type === 'file' && message.attachment_url && (
              <div className="mb-1 p-2 bg-black/5 dark:bg-black/20 rounded-md flex items-center">
                <span className="text-xl mr-2">📎</span>
                <a href={message.attachment_url} target="_blank" rel="noreferrer" className="text-sm underline text-[#00A884] truncate w-full max-w-[200px]">
                  {message.attachment_name || 'Download File'}
                </a>
              </div>
            )}
            
            {message.message_type === 'image' && message.attachment_url && (
              <div className="mb-1 rounded-md overflow-hidden bg-black/5 dark:bg-black/20">
                <img src={message.attachment_url} alt="attachment" className="max-w-full max-h-64 object-contain" />
              </div>
            )}
            
            {message.message_type === 'audio' && message.attachment_url && (
              <div className="mb-1 p-2 bg-black/5 dark:bg-black/20 rounded-md">
                <audio controls src={message.attachment_url} className="max-w-[200px] h-10 outline-none" />
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-[15px] leading-snug break-words">
                {message.content}
              </span>
              <div className="flex items-center justify-end space-x-1 mt-0.5 min-w-[50px]">
                <span className="text-[11px] text-gray-500 dark:text-[#8696A0] flex items-center">
                  {message.disappears_at && <Clock className="w-3 h-3 mr-1" />}
                  {format(new Date(message.created_at), 'HH:mm')}
                </span>
                {isOwn && (
                  <span className="text-gray-500 dark:text-[#8696A0]">
                    {message.status === 'sent' && <Check className="w-3 h-3" />}
                    {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                    {message.status === 'read' && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                  </span>
                )}
              </div>
            </div>

            {reactionCounts && Object.keys(reactionCounts).length > 0 && (
              <div className="absolute -bottom-3 right-0 bg-white dark:bg-[#202C33] rounded-full px-1 shadow border border-gray-100 dark:border-gray-800 text-xs flex items-center space-x-1 z-10">
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <div key={emoji} className="flex items-center">
                    <span>{emoji}</span>
                    {count > 1 && <span className="ml-0.5 text-[10px] text-gray-500">{count}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64 bg-white dark:bg-[#233138] border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            {COMMON_EMOJIS.map(em => (
              <button 
                key={em} 
                onClick={() => handleReact(em)} 
                className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition-colors"
              >
                {em}
              </button>
            ))}
            <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded bg-gray-100 dark:bg-gray-800 transition-colors">
              +
            </button>
          </div>
          <ContextMenuItem onClick={handleReply} className="cursor-pointer py-2">
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
