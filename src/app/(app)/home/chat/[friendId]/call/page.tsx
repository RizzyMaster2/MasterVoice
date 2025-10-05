
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { CallPage } from '@/components/app/call-page';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/data';
import { useUser } from '@/hooks/use-user';
import { notFound, useSearchParams, useParams } from 'next/navigation';

export default function FriendCallPage() {
  const params = useParams();
  const friendId = params.friendId as string;
  const { allUsers, friends } = useHomeClient();
  const { user, isLoading: isUserLoading } = useUser();
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const searchParams = useSearchParams();
  const isReceiving = searchParams.get('isReceiving') === 'true';

  useEffect(() => {
    if (friendId && allUsers.length > 0) {
      const friendProfile = allUsers.find(u => u.id === friendId) || friends.find(f => f.friend_id === friendId)?.friend_profile;
      if (friendProfile) {
        setFriend(friendProfile);
      }
    }
  }, [friendId, allUsers, friends]);

  if (isUserLoading || !friend) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!user) {
    notFound();
  }

  return <CallPage friend={friend} isReceiving={isReceiving} />;
}
