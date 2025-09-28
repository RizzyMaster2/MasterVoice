
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserProfile, Chat, FriendRequest } from '@/lib/data';
import { HomeClientLayout } from '@/components/app/home-client-layout';
import { cookies } from 'next/headers';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { getUsers, getChats, getFriendRequests } from '@/app/(auth)/actions/chat';


async function getInitialData(userId: string) {
    try {
        const [users, chats, requests] = await Promise.all([
            getUsers(),
            getChats(),
            getFriendRequests(),
        ]);
        
        const all_users = users;
        const chatsData = chats;
        const { incoming: incoming_requests, outgoing: outgoing_requests } = requests;

        const userMap = new Map(all_users.map((u: UserProfile) => [u.id, u]));

        const processedChats = chatsData.map((chat: any) => {
            const participantIds = chat.participants;
            if (chat.is_group) {
                chat.participantProfiles = participantIds
                    .map((id: string) => userMap.get(id))
                    .filter((p: any): p is UserProfile => !!p);
            } else {
                const otherParticipantId = participantIds.find((id: string) => id !== userId);
                if (otherParticipantId) {
                    chat.otherParticipant = userMap.get(otherParticipantId);
                }
            }
            return chat;
        }).filter((chat: Chat) => {
            if (!chat.is_group) return !!chat.otherParticipant;
            return true;
        });

        const processedIncoming = incoming_requests.map((req: any) => ({
            ...req,
            profiles: userMap.get(req.from_user_id)
        })) as FriendRequest[];
        
        const processedOutgoing = outgoing_requests.map((req: any) => ({
            ...req,
            profiles: userMap.get(req.to_user_id)
        })) as FriendRequest[];

        return { 
            usersData: all_users.filter((u: UserProfile) => u.id !== userId), 
            chatsData: processedChats, 
            friendRequestsData: {
                incoming: processedIncoming,
                outgoing: processedOutgoing,
            }
        };
    } catch(error) {
        console.error('Error in getInitialData:', error);
        throw new Error('Could not load initial data for the application.');
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

    const { usersData, chatsData, friendRequestsData } = await getInitialData(authUser.id);

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
