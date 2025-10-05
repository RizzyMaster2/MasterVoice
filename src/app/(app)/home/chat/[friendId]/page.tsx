
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, use } from 'react';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const {
    currentUser,
    friends,
    allUsers,
    selectedFriend,
    setSelectedFriend,
    handleFriendRemoved,
    isLoading,
  } = useHomeClient();

  const params = useParams();
  const friendId = params.friendId as string;

  useEffect(() => {
    if (friendId && (!selectedFriend || selectedFriend.id !== friendId)) {
      const friendToSelect =
        allUsers.find((u) => u.id === friendId) ||
        friends.find((f) => f.friend_id === friendId)?.friend_profile;
      if (friendToSelect) {
        setSelectedFriend(friendToSelect);
      }
    }
  }, [friendId, allUsers, friends, setSelectedFriend, selectedFriend]);

  if (isLoading || !selectedFriend) {
    return (
      <div className="w-2/3 flex flex-col h-full">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-16 w-16 mx-auto mb-4 rounded-full" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto mt-2" />
          </div>
        </div>
      </div>
    );
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
