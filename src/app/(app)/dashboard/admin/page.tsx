import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessagesSquare, MessageSquare, Shield, Users, LineChart, ShieldCheck } from 'lucide-react';
import { UserManagement } from '@/components/app/user-management';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminStats, getUserSignupsByDay, getMessageCountByDay } from '@/app/actions/admin';
import { TimeSeriesChart } from '@/components/app/timeseries-chart';

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    notFound();
  }
  
  const supabaseAdmin = createAdminClient();
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error('Error fetching users:', usersError);
    // Render an error state for users
  }

  const [
    { totalChats, totalMessages, error: statsError },
    { data: userSignups, error: userSignupsError },
    { data: messageCounts, error: messageCountsError },
  ] = await Promise.all([
    getAdminStats(),
    getUserSignupsByDay(),
    getMessageCountByDay(),
  ]);


  if (statsError) {
    console.error('Error fetching admin stats:', statsError);
    // Handle stats error gracefully
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Console
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome, Admin! This is your control panel.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              Current Administrator
            </CardTitle>
            <CardDescription>
                The user with this email has full administrative privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm bg-muted p-2 rounded-md inline-block">{process.env.ADMIN_EMAIL}</p>
          </CardContent>
        </Card>
      </div>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently registered users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChats ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Total conversations started
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessagesSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Messages sent across all chats
            </p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2 text-lg">
                <LineChart className="h-5 w-5" />
                New Users (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userSignupsError ? (
                <p className="text-destructive">{userSignupsError}</p>
              ) : (
                <TimeSeriesChart data={userSignups} dataKey="count" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2 text-lg">
                <LineChart className="h-5 w-5" />
                Messages Sent (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
               {messageCountsError ? (
                <p className="text-destructive">{messageCountsError}</p>
              ) : (
                <TimeSeriesChart data={messageCounts} dataKey="count" />
              )}
            </CardContent>
          </Card>
        </div>


      <Card>
        <CardHeader>
            <CardTitle className='font-headline flex items-center gap-2'>
                <Users className='h-6 w-6'/>
                User Management
            </CardTitle>
            <CardDescription>
                View and manage all registered users in the system.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <UserManagement users={users || []}/>
        </CardContent>
      </Card>
    </div>
  );
}
