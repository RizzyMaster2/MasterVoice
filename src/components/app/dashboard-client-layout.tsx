
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition } from 'react';
import { createChat, getChats } from '@/app/actions/chat';
import { useToast } from '@/hooks/use-toast';

interface DashboardClientLayoutProps {
    currentUser: UserProfile;
    initialChats: AppChat[];
    allUsers: UserProfile[];
}

export function DashboardClientLayout({ currentUser, initialChats, allUsers }: DashboardClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      const result = await createChat(friend.id);
      
      // If the chat already existed, createChat returns null
      if (result === null) {
          toast({
              title: "Chat already exists",
              description: "You already have a conversation with this user.",
          });
          return;
      }

      // If the chat is with the AI bot, it won't be in the main chat list from getChats()
      // So we handle it client-side.
      if (result.id === 'chat-ai-bot-echo') {
         setChats(prev => {
           if (prev.find(c => c.id === result.id)) return prev;
           return [result, ...prev];
         });
         toast({
            title: "Chat with Echo started",
            description: "You can now chat with the AI assistant.",
        });
        return;
      }


      // Re-fetch chats to update the list, which is much faster
      // than revalidating the entire page.
      const updatedChats = await getChats();
      setChats(updatedChats);
       toast({
          title: "Friend Added",
          description: `You can now chat with ${friend.display_name}.`,
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1 h-full">
        <ChatLayout currentUser={currentUser} chats={chats} />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
        <SuggestedFriends
            allUsers={allUsers}
            onAddFriend={handleAddFriend}
            currentUserId={currentUser.id}
            chats={chats}
        />
        </div>
    </div>
  );
}
