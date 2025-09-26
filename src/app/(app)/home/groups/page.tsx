
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { getChats, getUsers } from '@/app/(auth)/actions/chat';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';

export default function GroupsPage() {
  const [chats, setChats] = useState<AppChat[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedChat, setSelectedChat] = useState<AppChat | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isVerified } = useUser();

  const groups = useMemo(() => chats.filter(chat => chat.is_group), [chats]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const [chatsData, usersData] = await Promise.all([getChats(), getUsers()]);
    setChats(chatsData);
    setAllUsers(usersData);
    
    const groupChats = chatsData.filter(c => c.is_group);
    if (groupChats.length > 0 && !selectedChat) {
        const sortedGroups = [...groupChats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSelectedChat(sortedGroups[0]);
    } else if (selectedChat && !groupChats.some(c => c.id === selectedChat.id)) {
        // If the selected group was deleted or is no longer available
        setSelectedChat(groupChats.length > 0 ? groupChats[0] : null);
    }
    
    setIsLoading(false);
  }, [selectedChat]);


  useEffect(() => {
    setIsClient(true);
    refreshData();
  }, [refreshData]);


  if (!isClient || isLoading || !user) {
    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
            <Skeleton className="flex-1 h-full" />
        </div>
    );
  }

  const currentUserProfile: UserProfile = {
      id: user.id,
      display_name: user.user_metadata?.display_name || user.email || 'User',
      photo_url: user.user_metadata?.photo_url || '',
      created_at: user.created_at,
      email: user.email || null,
      status: 'online', // Placeholder
  }

  return (
    <>
      <div className="flex-1 flex flex-col gap-6 h-full">
        {!isVerified && <UnverifiedAccountWarning />}
        <ChatLayout 
            currentUser={currentUserProfile} 
            chats={groups} 
            allUsers={allUsers}
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            listType="group"
            onChatUpdate={refreshData}
            onChatDeleted={refreshData}
        />
      </div>
    </>
  );
}
