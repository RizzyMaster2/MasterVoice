
import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from '@/lib/data';
import { HomeClientLayout } from '@/components/app/home-client-layout';
import { cookies } from 'next/headers';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { getInitialHomeData } from '@/app/(auth)/actions/chat';

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

    // The parent layout already redirects, but we need the user object here.
    // If it's somehow null, we can throw an error or handle gracefully.
    if (!authUser) {
        // This should theoretically not be reached due to the parent layout's check.
        return new Response('Authentication required', { status: 401 });
    }

    const isVerified = !!authUser.email_confirmed_at;

    const { friends, allUsers, friendRequests } = await getInitialHomeData();
    
    const currentUserProfile: UserProfile = {
        id: authUser.id,
        display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email || 'User',
        full_name: authUser.user_metadata?.full_name || authUser.email,
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
                initialFriends={friends}
                initialFriendRequests={friendRequests}
                initialUsers={allUsers}
            >
                {children}
            </HomeClientLayout>
        </div>
    );
}
