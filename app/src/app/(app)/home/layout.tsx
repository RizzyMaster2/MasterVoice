
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserProfile, Chat, FriendRequest } from '@/lib/data';
import { HomeClientLayout } from '@/components/app/home-client-layout';
import { cookies } from 'next/headers';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { getInitialHomeData as getInitialHomeDataAction } from '@/app/(auth)/actions/chat';

async function getInitialHomeData(userId: string) {
    try {
        const { data: rawData, error } = await getInitialHomeDataAction(userId);

        if (error) {
            console.error('Error fetching initial home data:', error);
            // Return empty arrays on error to prevent server crash
            return {
                usersData: [],
                chatsData: [],
                friendRequestsData: { incoming: [], outgoing: [] },
            };
        }

        const { all_users, chats, incoming_requests, outgoing_requests } = rawData;

        return { 
            usersData: all_users.filter((u: UserProfile) => u.id !== userId), 
            chatsData: chats, 
            friendRequestsData: {
                incoming: incoming_requests,
                outgoing: outgoing_requests,
            }
        };
    } catch(error) {
        console.error('Error in getInitialHomeData wrapper:', error);
        // Return empty arrays on error to prevent server crash
        return {
            usersData: [],
            chatsData: [],
            friendRequestsData: { incoming: [], outgoing: [] },
        };
    }
}


export default async function HomeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
        redirect('/login');
    }

    const isVerified = !!authUser.email_confirmed_at;

    const { usersData, chatsData, friendRequestsData } = await getInitialHomeData(authUser.id);

    const currentUserProfile: UserProfile = {
        id: authUser.id,
        display_name: authUser.user_metadata?.display_name || authUser.email || 'User',
        photo_url: authUser.user_metadata?.photo_url || '',
        created_at: authUser.created_at,
        email: authUser.email || null,
        status: 'online', // Placeholder
        bio: authUser.user_metadata?.bio || null,
    }

    return (
        <div className="flex-1 flex flex-col gap-6 h-full">
            {!isVerified && <UnverifiedAccountWarning />}
            <HomeClientLayout
                currentUser={currentUserProfile}
                initialChats={chatsData}
                initialFriendRequests={friendRequestsData}
                initialUsers={usersData}
            >
                {children}
            </HomeClientLayout>
        </div>
    );
}

    
