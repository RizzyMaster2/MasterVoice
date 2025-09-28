
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserProfile, Chat, FriendRequest } from '@/lib/data';
import { HomeClientLayout } from '@/components/app/home-client-layout';
import { cookies } from 'next/headers';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';

// This function is now defined within the layout file to simplify dependencies.
async function getInitialHomeData(userId: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    try {
        // This RPC call returns an array with a single object inside it.
        const { data: rawDataArray, error } = await supabase.rpc('get_initial_home_data', { p_user_id: userId });

        if (error) {
            console.error('Error fetching initial home data via RPC:', error);
            throw new Error('Could not load initial data for the application.');
        }

        // The actual data is the first element of the returned array.
        if (!rawDataArray || rawDataArray.length === 0) {
            console.warn('get_initial_home_data RPC returned no data.');
            return { 
                usersData: [], 
                chatsData: [], 
                friendRequestsData: { incoming: [], outgoing: [] } 
            };
        }

        const rawData = rawDataArray[0];

        const { all_users, chats, incoming_requests, outgoing_requests } = rawData;

        if (!all_users || !chats || !incoming_requests || !outgoing_requests) {
             console.error('RPC get_initial_home_data did not return expected keys.');
             return { 
                usersData: [], 
                chatsData: [], 
                friendRequestsData: { incoming: [], outgoing: [] } 
            };
        }


        const userMap = new Map(all_users.map((u: UserProfile) => [u.id, u]));

        const processedChats = chats.map((chat: any) => {
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
        console.error('Error in getInitialHomeData wrapper:', error);
        // Return empty state to prevent a hard crash
        return { 
            usersData: [], 
            chatsData: [], 
            friendRequestsData: { incoming: [], outgoing: [] } 
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
