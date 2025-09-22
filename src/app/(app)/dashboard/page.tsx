import { ChatLayout } from '@/components/app/chat-layout';
import { OnboardingModal } from '@/components/app/onboarding-modal';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { createClient } from '@/lib/supabase/server';
import type { User as AppUser } from '@/lib/data';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware now handles redirecting unauthenticated users.
  // If we reach this page, we can be sure a user is logged in.
  if (!user) {
    // This is a fallback, but should not be reached in normal flow.
    redirect('/login');
  }

  // Create a user object that matches the application's User type
  const currentUser: AppUser = {
    id: user.id,
    name: user.user_metadata?.full_name || user.email || 'User',
    avatarUrl: user.user_metadata?.avatar_url || '',
    isOnline: true, // Assuming the user is online when on the dashboard
    bio: user.user_metadata?.bio || '',
  };

  const isVerified = user.email_confirmed_at;

  return (
    <div className="flex-1 flex flex-col gap-6 h-full">
      {!isVerified && <UnverifiedAccountWarning />}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1 h-full">
          <ChatLayout currentUser={currentUser} />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
          <SuggestedFriends currentUser={currentUser} />
        </div>
        <OnboardingModal />
      </div>
    </div>
  );
}
