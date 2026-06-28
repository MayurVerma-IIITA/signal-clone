"use client";

import { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Mic, Send, X, Square } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import api from '@/lib/api';
import { useMessageStore } from '@/store/messageStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { useToast } from '@/components/ui/toast';

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const replyingTo = useMessageStore(state => state.replyingTo);
  const setReplyingTo = useMessageStore(state => state.setReplyingTo);
  const { toast } = useToast();
  const sendMessageWs = useWebSocketStore(state => state.sendMessage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await api.post(`/api/conversations/${conversationId}/messages`, {
        content: content.trim(),
        message_type: 'text',
        reply_to_id: replyingTo?.id
      });
      setContent('');
      setReplyingTo(null);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendMessageWs({ type: 'typing.stop', conversation_id: conversationId });
    } catch (err) {
      console.error("Failed to send", err);
      toast("Failed to send message", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await api.post('/api/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await api.post(`/api/conversations/${conversationId}/messages`, {
        content: file.name,
        message_type: 'file',
        attachment_url: uploadRes.data.url,
        attachment_name: file.name
      });
    } catch (err) {
      console.error("Failed to upload", err);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    
    sendMessageWs({ type: 'typing.start', conversation_id: conversationId });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendMessageWs({ type: 'typing.stop', conversation_id: conversationId });
    }, 2000);
  };

  const onEmojiClick = (emojiObject: any) => {
    setContent(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Upload audio blob
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice_message.webm');
        try {
          const uploadRes = await api.post('/api/upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          await api.post(`/api/conversations/${conversationId}/messages`, {
            content: 'Voice message',
            message_type: 'audio',
            attachment_url: uploadRes.data.url,
            attachment_name: 'Voice message'
          });
        } catch (err) {
          console.error("Failed to send voice message", err);
          toast("Failed to send voice message", "error");
        }
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      toast("Microphone access denied", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col w-full bg-gray-100 dark:bg-[#202C33] flex-shrink-0">
      {replyingTo && (
        <div className="mx-4 mt-2 p-3 bg-black/5 dark:bg-black/20 rounded-lg border-l-4 border-[#00A884] flex items-start justify-between">
          <div>
            <p className="font-semibold text-[#00A884] text-sm">Replying to</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-sm">{replyingTo.content}</p>
          </div>
          <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSend} className="h-16 px-4 py-2 flex items-center space-x-2 w-full relative">
      <div className="relative">
        <button 
          type="button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-gray-500 dark:text-[#8696A0] hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full"
        >
          <Smile className="w-6 h-6" />
        </button>
        {showEmojiPicker && (
          <div className="absolute bottom-12 left-0 z-50">
            <EmojiPicker 
              onEmojiClick={onEmojiClick}
              theme={Theme.AUTO}
            />
          </div>
        )}
      </div>
      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 dark:text-[#8696A0] hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full">
        <Paperclip className="w-6 h-6" />
      </button>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      
      <div className="flex-1 bg-white dark:bg-[#2A3942] rounded-lg px-4 py-2 flex items-center">
        {isRecording ? (
          <div className="w-full flex items-center text-red-500 animate-pulse">
            <Mic className="w-5 h-5 mr-2" />
            <span>Recording... {formatTime(recordingTime)}</span>
          </div>
        ) : (
          <input 
            type="text" 
            value={content}
            onChange={handleTyping}
            placeholder="Type a message"
            className="w-full bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-[#8696A0]"
          />
        )}
      </div>
      
      {content.trim() ? (
        <button type="submit" className="p-3 bg-[#00A884] hover:bg-[#008f6f] text-white rounded-full transition-colors">
          <Send className="w-5 h-5 ml-1" />
        </button>
      ) : isRecording ? (
        <button type="button" onClick={stopRecording} className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors">
          <Square className="w-5 h-5" fill="currentColor" />
        </button>
      ) : (
        <button type="button" onClick={startRecording} className="p-3 text-gray-500 dark:text-[#8696A0] hover:bg-gray-200 dark:hover:bg-[#374045] rounded-full transition-colors">
          <Mic className="w-6 h-6" />
        </button>
      )}
      </form>
    </div>
  );
}
