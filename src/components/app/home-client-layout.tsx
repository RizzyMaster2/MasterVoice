
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition, useMemo } from 'react';
import { createChat, getChats } from '@/app/actions/chat';
import { useToast } from '@/hooks/use-toast';

interface HomeClientLayoutProps {
    currentUser: UserProfile;
    initialChats: AppChat[];
    allUsers: UserProfile[];
}

export function HomeClientLayout({ currentUser, initialChats, allUsers }: HomeClientLayoutProps) {
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


      // Re-fetch chats to update the list, which is much faster
      // than revalidating the entire page.
      await refreshChats();
      toast({
          title: "Friend Added",
          description: `You can now chat with ${friend.display_name}.`,
      });
    });
  };

  const contactIds = useMemo(() => {
    const ids = new Set(chats.flatMap(c => c.participants));
    ids.add(currentUser.id); // Ensure current user isn't in suggestions
    return ids;
  }, [chats, currentUser.id]);

  const availableUsers = useMemo(() => allUsers.filter(user => user.id !== currentUser.id), [allUsers, currentUser.id]);


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
            allUsers={availableUsers}
            onAddFriend={handleAddFriend}
            contactIds={contactIds}
            onGroupCreated={refreshChats}
        />
        </div>
    </div>
  );
}
