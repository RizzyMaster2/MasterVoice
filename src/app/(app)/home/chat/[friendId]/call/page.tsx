
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { CallPage } from '@/components/app/call-page';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/data';
import { useUser } from '@/hooks/use-user';
import { notFound, useSearchParams } from 'next/navigation';

export default function FriendCallPage({ params }: { params: { friendId: string } }) {
  const { allUsers, friends } = useHomeClient();
  const { user, isLoading: isUserLoading } = useUser();
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const searchParams = useSearchParams();
  const isReceiving = searchParams.get('isReceiving') === 'true';

  useEffect(() => {
    if (params.friendId && allUsers.length > 0) {
      const friendProfile = allUsers.find(u => u.id === params.friendId) || friends.find(f => f.friend_id === params.friendId)?.friend_profile;
      if (friendProfile) {
        setFriend(friendProfile);
      }
    }
  }, [params.friendId, allUsers, friends]);

  if (isUserLoading || !friend) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!user) {
    notFound();
  }

  return <CallPage friend={friend} isReceiving={isReceiving} />;
}
