import { create } from 'zustand';

interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  connect: (userId: string, token: string) => void;
  disconnect: () => void;
  sendMessage: (msg: any) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  ws: null,
  isConnected: false,
  connect: (userId: string, token: string) => {
    if (get().ws) return; // already connected
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/${userId}?token=${token}`);
    
    ws.onopen = () => {
      set({ isConnected: true });
    };
    
    ws.onclose = () => {
      set({ isConnected: false, ws: null });
      // In a real app we'd do exponential backoff here
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message.new') {
          const { useMessageStore } = require('./messageStore');
          const { useConversationStore } = require('./conversationStore');
          const { useAuthStore } = require('./authStore');
          
          const msg = data.message;
          const currentUserId = useAuthStore.getState().user?.id;
          const activeConvId = useConversationStore.getState().activeConversationId;
          
          // Add message to messageStore
          useMessageStore.getState().addMessage(msg);
          
          // Update conversation last message and unread count
          const convs = useConversationStore.getState().conversations;
          const conv = convs.find((c: any) => c.id === msg.conversation_id);
          
          if (conv) {
            let newUnread = conv.unread_count;
            // If we are not the sender AND not actively viewing the chat, bump unread
            if (msg.sender_id !== currentUserId && activeConvId !== msg.conversation_id) {
              newUnread += 1;
            }
            useConversationStore.getState().updateConversation(msg.conversation_id, {
              last_message: msg,
              unread_count: newUnread
            });
          }
        } else if (data.type === 'message.reaction') {
          const { useMessageStore } = require('./messageStore');
          useMessageStore.getState().updateMessageReactions(data.conversation_id, data.message_id, data.reactions);
        } else if (data.type === 'typing.start') {
          const { useMessageStore } = require('./messageStore');
          useMessageStore.getState().setTyping(data.conversation_id, data.user_id, true);
        } else if (data.type === 'typing.stop') {
          const { useMessageStore } = require('./messageStore');
          useMessageStore.getState().setTyping(data.conversation_id, data.user_id, false);
        }
      } catch (e) {
        console.error("Invalid WS message", e);
      }
    };
    
    set({ ws });
  },
  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false });
    }
  },
  sendMessage: (msg: any) => {
    const { ws, isConnected } = get();
    if (ws && isConnected) {
      ws.send(JSON.stringify(msg));
    }
  }
}));
