import { ChatLayout } from '@/components/app/chat-layout';
import { OnboardingModal } from '@/components/app/onboarding-modal';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { currentUser, users, messages } from '@/lib/data';

export default function DashboardPage() {
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 h-full">
        <ChatLayout
          currentUser={currentUser}
          users={users}
          messages={messages}
        />
      </div>
      <div className="flex flex-col gap-6">
        <SuggestedFriends />
      </div>
      <OnboardingModal />
    </div>
  );
}
