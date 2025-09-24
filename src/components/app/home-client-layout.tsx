
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition, useMemo } from 'react';
import { createChat, getChats } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';

interface HomeClientLayoutProps {
    currentUser: UserProfile;
    initialChats: AppChat[];
    allUsers: UserProfile[];
}

export function HomeClientLayout({ currentUser, initialChats, allUsers }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      try {
        const { chat, isNew } = await createChat(friend.id);
        
        if (chat) {
          if (isNew) {
            refreshChats();
            toast({
                title: "Friend Added",
                description: `You can now chat with ${friend.display_name}.`,
                variant: 'success'
            });
          } else {
             toast({
                title: "Chat already exists",
                description: "You already have a conversation with this user.",
            });
          }
        }
      } catch (error) {
          console.error("Failed to create chat:", error);
          toast({
              title: "Failed to Add Friend",
              description: error instanceof Error ? error.message : "An unknown error occurred.",
              variant: "destructive",
          });
      }
    });
  };

  const contactIds = useMemo(() => {
    const ids = new Set(chats.flatMap(c => c.participants));
    ids.add(currentUser.id); // Ensure current user isn't in suggestions
    return ids;
  }, [chats, currentUser.id]);

  const refreshChats = async () => {
    const updatedChats = await getChats();
    setChats(updatedChats);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1 h-full">
        <ChatLayout currentUser={currentUser} chats={chats} setChats={setChats} allUsers={allUsers} />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
        <SuggestedFriends
            currentUser={currentUser}
            allUsers={allUsers}
            onAddFriend={handleAddFriend}
            contactIds={contactIds}
            onGroupCreated={refreshChats}
        />
        </div>
    </div>
  );
}
