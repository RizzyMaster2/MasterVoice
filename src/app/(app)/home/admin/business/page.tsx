
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Users, Link as LinkIcon, Building } from 'lucide-react';

export default async function BusinessAdminPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.plan !== 'business') {
    // Only allow users on the business plan to see this page
    notFound();
  }

  const inviteLink = user.user_metadata?.business_invite_link || 'No invite link found. Please contact support.';
  
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
            <Button variant="outline" size="icon" onClick={async () => {
                'use server';
                // This is a placeholder for a real copy action
                console.log('Copying link...');
            }}>
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
