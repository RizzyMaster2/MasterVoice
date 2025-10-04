
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { 
    currentUser, 
    friends, 
    allUsers, 
    selectedFriend, 
    setSelectedFriend, 
    refreshAllData, 
    handleFriendRemoved,
    isLoading
  } = useHomeClient();

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
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
