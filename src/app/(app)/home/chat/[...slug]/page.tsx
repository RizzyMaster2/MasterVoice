
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { CallPage } from '@/components/app/call-page';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ChatOrCallPage({ params }: { params: { slug: string[] } }) {
  const { 
    currentUser, 
    friends, 
    allUsers, 
    selectedFriend, 
    setSelectedFriend, 
    handleFriendRemoved,
    isLoading
  } = useHomeClient();

  const pathname = usePathname();
  const friendId = params.slug?.[0];
  const isCall = params.slug?.[1] === 'call';

  useEffect(() => {
    if (friendId && (!selectedFriend || selectedFriend.id !== friendId)) {
      const friendToSelect = allUsers.find(u => u.id === friendId) || friends.find(f => f.friend_id === friendId)?.friend_profile;
      if (friendToSelect) {
        setSelectedFriend(friendToSelect);
      }
    }
  }, [friendId, allUsers, friends, setSelectedFriend, selectedFriend]);
  

  if (isLoading || (friendId && !selectedFriend)) {
    return <Skeleton className="h-full w-full" />;
  }
  
  if (isCall && selectedFriend) {
    return <CallPage friend={selectedFriend} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
        <ChatLayout 
            currentUser={currentUser} 
            friends={friends}
            allUsers={allUsers}
            selectedFriend={selectedFriend}
            setSelectedFriend={setSelectedFriend}
            onFriendRemoved={handleFriendRemoved}
        />
    </div>
  );
}
