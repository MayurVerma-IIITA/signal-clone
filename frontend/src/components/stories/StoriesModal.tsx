"use client";

import { useEffect, useState } from 'react';
import { X, Plus, Image as ImageIcon, CircleDashed, Trash2 } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  created_at: string;
}

interface UserStories {
  user: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
  stories: Story[];
}

export function StoriesModal() {
  const { isStoriesOpen, setIsStoriesOpen } = useUIStore();
  const { user: currentUser } = useAuthStore();
  const [userStories, setUserStories] = useState<UserStories[]>([]);
  const [activeUserIndex, setActiveUserIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isStoriesOpen) {
      loadStories();
    }
  }, [isStoriesOpen]);

  // Handle auto-advance
  useEffect(() => {
    if (activeUserIndex === null) return;
    
    const timer = setTimeout(() => {
      handleNextStory();
    }, 5000); // 5 seconds per story

    return () => clearTimeout(timer);
  }, [activeUserIndex, activeStoryIndex]);

  const loadStories = async () => {
    try {
      const res = await api.get('/api/stories');
      setUserStories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextStory = async () => {
    if (activeUserIndex === null) return;
    
    const activeGroup = userStories[activeUserIndex];
    const story = activeGroup.stories[activeStoryIndex];
    
    // Mark as viewed
    try {
      await api.post(`/api/stories/${story.id}/view`);
    } catch (e) {}

    if (activeStoryIndex < activeGroup.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else {
      // Move to next user's stories
      if (activeUserIndex < userStories.length - 1) {
        setActiveUserIndex(prev => prev! + 1);
        setActiveStoryIndex(0);
      } else {
        // Done
        setActiveUserIndex(null);
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await api.post('/api/upload', formData);
      const media_url = uploadRes.data.url;

      await api.post('/api/stories', { media_url, caption: '' });
      await loadStories();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await api.delete(`/api/stories/${storyId}`);
      await loadStories();
      setActiveUserIndex(null); // Reset view
    } catch (err) {
      console.error(err);
    }
  };

  const myUserStoryIndex = userStories.findIndex(us => us.user.id === currentUser?.id);
  const hasMyStories = myUserStoryIndex !== -1 && userStories[myUserStoryIndex].stories.length > 0;

  if (!isStoriesOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b141a] flex">
      {/* Left Sidebar (List of Stories) */}
      <div className="w-full md:w-[400px] border-r border-[#202c33] flex flex-col bg-[#111b21] text-white">
        <div className="p-4 flex items-center mb-4">
          <button 
            onClick={() => setIsStoriesOpen(false)}
            className="p-2 hover:bg-[#202c33] rounded-full mr-4"
          >
            <X className="w-6 h-6 text-[#aebac1]" />
          </button>
          <h2 className="text-xl font-semibold">Status</h2>
        </div>

        <div 
          className="px-4 py-2 border-b border-[#202c33] flex items-center justify-between cursor-pointer hover:bg-[#202c33]"
          onClick={() => {
            if (hasMyStories) {
              setActiveUserIndex(myUserStoryIndex);
              setActiveStoryIndex(0);
            }
          }}
        >
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className={`p-[2px] rounded-full ${hasMyStories ? 'border-2 border-[#00a884]' : ''}`}>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={currentUser?.avatar_url} />
                  <AvatarFallback>{currentUser?.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <label 
                className="absolute bottom-0 right-0 bg-[#00a884] rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#111b21] cursor-pointer hover:bg-[#008f6f] z-10"
                onClick={(e) => e.stopPropagation()} // Prevent viewing story when clicking plus
              >
                <Plus className="w-3 h-3 text-white" />
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <p className="font-semibold text-[17px]">{uploading ? 'Uploading...' : 'My status'}</p>
              <p className="text-sm text-[#aebac1]">
                {hasMyStories ? 'Tap to view your status update' : 'Click + to add status update'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-[#00a884] text-[15px] mb-4 uppercase font-semibold">Recent updates</h3>
          <div className="space-y-4">
            {userStories.filter(us => us.user.id !== currentUser?.id).map((us, idx) => (
              <div 
                key={us.user.id} 
                className="flex items-center space-x-4 cursor-pointer hover:bg-[#202c33] p-2 -mx-2 rounded-lg"
                onClick={() => {
                  setActiveUserIndex(idx);
                  setActiveStoryIndex(0);
                }}
              >
                <div className="p-[2px] rounded-full border-2 border-[#00a884]">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={us.user.avatar_url} />
                    <AvatarFallback>{us.user.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <p className="font-semibold text-[17px]">{us.user.display_name}</p>
                  <p className="text-sm text-[#aebac1]">{us.stories.length} new update{us.stories.length > 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
            {userStories.filter(us => us.user.id !== currentUser?.id).length === 0 && (
              <p className="text-[#aebac1] text-sm text-center py-4">No recent updates</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Content Area (Story Viewer) */}
      <div className="hidden md:flex flex-1 items-center justify-center relative bg-[#0b141a]">
        {activeUserIndex === null ? (
          <div className="text-center text-[#aebac1]">
            <CircleDashed className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-light">Click on a contact to view their status</h2>
          </div>
        ) : (
          <div className="relative w-full max-w-md h-[80vh] flex flex-col bg-black rounded-lg overflow-hidden">
            {/* Progress Bars */}
            <div className="absolute top-0 left-0 right-0 p-4 flex space-x-1 z-10">
              {userStories[activeUserIndex].stories.map((s, i) => (
                <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-white transition-all ${
                      i < activeStoryIndex ? 'w-full' : i === activeStoryIndex ? 'w-full animate-[progress_5s_linear]' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-0 right-0 p-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={userStories[activeUserIndex].user.avatar_url} />
                  <AvatarFallback>{userStories[activeUserIndex].user.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-white font-medium drop-shadow-md">
                  {userStories[activeUserIndex].user.display_name}
                </span>
              </div>
              
              {userStories[activeUserIndex].user.id === currentUser?.id && (
                <button 
                  onClick={() => handleDeleteStory(userStories[activeUserIndex].stories[activeStoryIndex].id)}
                  className="p-2 hover:bg-black/20 rounded-full text-white/80 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-5 h-5 drop-shadow-md" />
                </button>
              )}
            </div>

            {/* Media */}
            <img 
              src={userStories[activeUserIndex].stories[activeStoryIndex].media_url} 
              alt="Status"
              className="w-full h-full object-contain"
            />
            
            {/* Caption */}
            {userStories[activeUserIndex].stories[activeStoryIndex].caption && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-center">
                <p className="text-white text-lg">{userStories[activeUserIndex].stories[activeStoryIndex].caption}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
