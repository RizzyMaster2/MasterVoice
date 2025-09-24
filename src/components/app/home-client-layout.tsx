
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
  const [isAddingFriend, startTransition] = useTransition();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      try {
        const { chat, isNew } = await createChat(friend.id);
        
        if (chat) {
          if (isNew) {
            // Construct the full chat object for the UI
            const newChatWithProfile: AppChat = {
                ...chat,
                otherParticipant: friend // Add the friend's profile to the new chat object
            };
            setChats(prev => [newChatWithProfile, ...prev]);

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
        <ChatLayout currentUser={currentUser} chats={chats} setChats={setChats} allUsers={allUsers} />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
        <SuggestedFriends
            currentUser={currentUser}
            allUsers={allUsers}
            onAddFriend={handleAddFriend}
            contactIds={contactIds}
            onGroupCreated={refreshChats}
            isAddingFriend={isAddingFriend}
        />
        </div>
    </div>
  );
}
