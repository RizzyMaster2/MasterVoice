import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { suggestNewConnections } from '@/ai/flows/suggest-new-connections';
import { users as allUsers } from '@/lib/data';
import type { User as AppUser } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { Sparkles } from 'lucide-react';

type SuggestedFriendsProps = {
  currentUser: AppUser;
};

export async function SuggestedFriends({ currentUser }: SuggestedFriendsProps) {
  // Mock data for the AI flow
  const profileInformation = `Name: ${currentUser.name}, Bio: ${currentUser.bio}, Interests: Programming, AI, Design`;
  const activityHistory = 'Recently chatted with: Bob, Charlie. Active in the "React Developers" group.';

  let suggestions: string[] = [];
  try {
    // In a real app, this would return a dynamic list of user IDs.
    // For this demo, we'll mock the output to ensure we get results.
    // suggestions = await suggestNewConnections({
    //   userId: currentUser.id,
    //   profileInformation,
    //   activityHistory,
    // });
    suggestions = ['user5', 'user6', 'user7'];
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    // Fallback to a default list if AI fails
    suggestions = ['user5', 'user6', 'user7'];
  }

  const suggestedUsers = allUsers.filter(
    (user) => suggestions.includes(user.id) && user.id !== currentUser.id
  );
  
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Sparkles className="h-5 w-5 text-accent" />
          Suggested Friends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {suggestedUsers.length > 0 ? (
          <div className="space-y-4">
            {suggestedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[150px]">{user.bio}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add friend</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No suggestions right now. Check back later!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
