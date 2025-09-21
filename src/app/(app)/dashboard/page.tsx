import { ChatLayout } from '@/components/app/chat-layout';
import { OnboardingModal } from '@/components/app/onboarding-modal';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { users, messages } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import type { User as AppUser } from '@/lib/data';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  // The 'users' array from data.ts is now used for contacts, excluding the current user.
  const contacts = users.filter(u => u.id !== currentUser.id);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 h-full">
        <ChatLayout
          currentUser={currentUser}
          users={contacts}
          messages={messages}
        />
      </div>
      <div className="flex flex-col gap-6">
        <SuggestedFriends currentUser={currentUser} />
      </div>
      <OnboardingModal />
    </div>
  );
}
