import { create } from 'zustand';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  attachment_url?: string;
  attachment_name?: string;
  reply_to_id?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  disappears_at?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
  reactions?: MessageReaction[];
  replies?: Message;
}

interface MessageState {
  messagesByConversation: Record<string, Message[]>;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: Message['status']) => void;
  updateMessageReactions: (conversationId: string, messageId: string, reactions: MessageReaction[]) => void;
  replyingTo: Message | null;
  setReplyingTo: (message: Message | null) => void;
  typingUsers: Record<string, string[]>;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messagesByConversation: {},
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
    })),
  addMessage: (message) =>
    set((state) => {
      const existing = state.messagesByConversation[message.conversation_id] || [];
      // avoid duplicates
      if (existing.find(m => m.id === message.id)) return state;
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [message.conversation_id]: [...existing, message],
        },
      };
    }),
  updateMessageStatus: (conversationId, messageId, status) =>
    set((state) => {
      const messages = state.messagesByConversation[conversationId] || [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages.map((m) => (m.id === messageId ? { ...m, status } : m)),
        },
      };
    }),
  updateMessageReactions: (conversationId, messageId, reactions) =>
    set((state) => {
      const messages = state.messagesByConversation[conversationId] || [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
        },
      };
    }),
  replyingTo: null,
  setReplyingTo: (message) => set({ replyingTo: message }),
  typingUsers: {},
  setTyping: (conversationId, userId, isTyping) => set(state => {
    const currentTyping = state.typingUsers[conversationId] || [];
    let newTyping = [...currentTyping];
    if (isTyping && !newTyping.includes(userId)) {
      newTyping.push(userId);
    } else if (!isTyping) {
      newTyping = newTyping.filter(id => id !== userId);
    }
    return {
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: newTyping
      }
    };
  })
}));
