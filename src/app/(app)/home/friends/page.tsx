
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUsers, getChats, getFriendRequests } from '@/app/(auth)/actions/chat';
import type { UserProfile, Chat, FriendRequest } from '@/lib/data';
import { FriendsClientPage } from './friends-client-page';
import { cookies } from 'next/headers';

export default async function FriendsPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
        redirect('/login');
    }

    const [usersData, chatsData, friendRequestsData] = await Promise.all([
        getUsers(),
        getChats(),
        getFriendRequests()
    ]);

    const currentUserProfile: UserProfile = {
        id: authUser.id,
        display_name: authUser.user_metadata?.display_name || authUser.email || 'User',
        photo_url: authUser.user_metadata?.photo_url || '',
        created_at: authUser.created_at,
        email: authUser.email || null,
        status: 'online', // Placeholder
    }
    
    const friends = chatsData.filter(chat => !chat.is_group);

    return (
        <FriendsClientPage
            currentUser={currentUserProfile}
            initialFriends={friends}
            initialFriendRequests={friendRequestsData}
            allUsers={usersData}
        />
    );
}
