
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { createChat, getChats } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

interface HomeClientLayoutProps {
    currentUser: UserProfile;
    initialChats: AppChat[];
    allUsers: UserProfile[];
}

export function HomeClientLayout({ currentUser, initialChats, allUsers }: HomeClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isAddingFriend, startTransition] = useTransition();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (initialChats.length > 0) {
      setSelectedChat(initialChats[0]);
    }
  }, [initialChats]);

  const refreshChats = async () => {
    const updatedChats = await getChats();
    setChats(updatedChats);
    return updatedChats;
  };

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      try {
        const { chat: newChat, isNew } = await createChat(friend.id);
        
        if (isNew && newChat) {
            toast({
                title: "Friend Added",
                description: `You can now chat with ${friend.display_name}.`,
                variant: 'success'
            });
            // Refresh the list and find the new chat to select it
            const updatedChats = await refreshChats();
            const chatToSelect = updatedChats.find(c => c.id === newChat.id);
            if (chatToSelect) {
                setSelectedChat(chatToSelect);
            }
        } else {
           toast({
              title: "Chat already exists",
              description: "You already have a conversation with this user.",
          });
           // If the chat exists, find and select it
           const chatToSelect = chats.find(c => c.participants.includes(friend.id) && !c.is_group);
           if(chatToSelect) setSelectedChat(chatToSelect);
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

  if (!isClient) {
    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
            <Skeleton className="flex-1 h-full" />
            <div className="w-full lg:w-[320px] flex flex-col gap-6">
                <Skeleton className="w-full h-96" />
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1 h-full">
            <ChatLayout 
                currentUser={currentUser} 
                chats={chats} 
                setChats={setChats} 
                allUsers={allUsers}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
            />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
            <SuggestedFriends
                currentUser={currentUser}
                allUsers={allUsers}
                onAddFriend={handleAddFriend}
                contactIds={contactIds}
                onChatCreated={refreshChats}
                isAddingFriend={isAddingFriend}
            />
        </div>
    </div>
  );
}

    