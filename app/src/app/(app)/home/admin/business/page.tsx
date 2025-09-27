
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Users, Link as LinkIcon, Building, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function BusinessAdminPage() {
  const { user, isBusinessPlan, isLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
  }

  if (!user || !isBusinessPlan) {
    // Redirect to home if not a business user. Using router.replace to avoid adding to history.
    router.replace('/home');
    return (
       <div className="flex flex-col items-center justify-center h-full">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
         <p className="text-muted-foreground">Redirecting...</p>
       </div>
    );
  }

  const inviteLink = user.user_metadata?.business_invite_link || 'No invite link found. Please contact support.';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
        title: 'Invite Link Copied',
        description: 'You can now share the link with your team.',
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Building className="h-6 w-6" />
            Business Admin Panel
          </CardTitle>
          <CardDescription>
            Manage your organization, members, and settings.
          </CardDescription>
        </CardHeader>
      </Card>
      
       <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Team Invite Link
            </CardTitle>
            <CardDescription>
                Share this link with your team members to invite them to your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input readOnly value={inviteLink} className="font-mono"/>
            <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle className='font-headline flex items-center gap-2'>
              <Users className="h-6 w-6" />
              Manage Members
          </CardTitle>
          <CardDescription>
              View and manage members of your organization. (Functionality coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                Member management will be available here.
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
