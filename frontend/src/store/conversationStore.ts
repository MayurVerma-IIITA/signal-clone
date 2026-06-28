import { create } from 'zustand';
import { User } from './authStore';

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  created_at: string;
  name?: string;
  avatar_url?: string;
  last_message?: any;
  unread_count: number;
  participants: User[];
  group_admin_id?: string;
  disappearing_timer?: number | null;
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  addConversation: (conversation: Conversation) => void;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  activeConversationId: null,
  addConversation: (conversation) => set((state) => ({ conversations: [conversation, ...state.conversations] })),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),
}));
