
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { useState, useTransition } from 'react';
import { createChat, getChats } from '@/app/actions/chat';

interface DashboardClientLayoutProps {
    currentUser: UserProfile;
    initialChats: AppChat[];
    allUsers: UserProfile[];
}

export function DashboardClientLayout({ currentUser, initialChats, allUsers }: DashboardClientLayoutProps) {
  const [chats, setChats] = useState<AppChat[]>(initialChats);
  const [isPending, startTransition] = useTransition();

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      await createChat(friend.id);
      // Re-fetch chats to update the list
      const updatedChats = await getChats();
      setChats(updatedChats);
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
