
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { FriendsClientPage } from './friends-client-page';
import { Skeleton } from '@/components/ui/skeleton';

export default function FriendsPage() {
  const {
    currentUser,
    friends,
    friendRequests,
    allUsers,
    isLoading,
    refreshAllData
  } = useHomeClient();

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
        <FriendsClientPage
            currentUser={currentUser}
            initialFriends={friends}
            initialFriendRequests={friendRequests}
            allUsers={allUsers}
            onAction={refreshAllData}
        />
    </div>
  );
}
