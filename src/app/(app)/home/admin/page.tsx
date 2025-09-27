
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserManagement } from '@/components/app/user-management';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminStats, getUserSignupsByDay, getMessageCountByDay } from '@/app/(auth)/actions/admin';
import { TimeSeriesChart } from '@/components/app/timeseries-chart';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';

const UsersStatIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" style={{ animation: 'slide-in 0.5s forwards' }} /><circle cx="9" cy="7" r="4" style={{ animation: 'pop-in 0.5s 0.2s forwards', transformOrigin: 'center', opacity: 0 }} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" style={{ animation: 'slide-in 0.5s 0.4s forwards', opacity: 0 }} /><path d="M16 3.13a4 4 0 0 1 0 7.75" style={{ animation: 'slide-in 0.5s 0.6s forwards', opacity: 0 }} /><style>{`@keyframes slide-in { from { transform: translateY(5px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style></g></svg>
);

const ChatsStatIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" style={{ animation: 'pop-in 0.5s forwards' }} /><path d="M13 8H9" style={{ animation: 'fade-in 0.5s 0.3s forwards', opacity: 0 }}/><path d="M15 12H9" style={{ animation: 'fade-in 0.5s 0.5s forwards', opacity: 0 }}/><style>{`@keyframes pop-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style></g></svg>
);

const MessagesStatIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" style={{ animation: 'pop-in 0.5s forwards' }} /><path d="m15 8-4 4-1-1" style={{ animation: 'draw-check 0.5s 0.3s forwards', strokeDasharray: 20, strokeDashoffset: 20 }}/><style>{`@keyframes pop-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes draw-check { to { stroke-dashoffset: 0; } }`}</style></g></svg>
);
const AdminConsoleIcon = () => (
    <svg viewBox="0 0 24 24" className="h-6 w-6"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" style={{ animation: 'pop-in 0.5s forwards' }} /><path d="m9 12 2 2 4-4" style={{ animation: 'draw-check 0.5s 0.3s forwards', opacity: 0, strokeDasharray: 20, strokeDashoffset: 20 }}/><style>{`@keyframes pop-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } } @keyframes draw-check { from { opacity: 0; } to { opacity: 1; stroke-dashoffset: 0; } }`}</style></g></svg>
);
const CurrentAdminsIcon = () => (
    <svg viewBox="0 0 24 24" className="h-6 w-6"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" style={{ animation: 'pop-in 0.5s forwards' }}/><circle cx="12" cy="12" r="3" style={{ animation: 'pop-in 0.5s 0.2s forwards', transformOrigin: 'center', opacity: 0 }}/></g><style>{`@keyframes pop-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style></svg>
);
const ChartIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M3 3v18h18" style={{ animation: 'draw-path 0.5s forwards' }}/><path d="m19 9-5 5-4-4-3 3" style={{ opacity: 0, animation: 'draw-path 0.5s 0.3s forwards', strokeDasharray: 40, strokeDashoffset: 40 }}/></g><style>{`@keyframes draw-path { to { opacity: 1; stroke-dashoffset: 0; } }`}</style></svg>
);
const CommandsIcon = () => (
    <svg viewBox="0 0 24 24" className="h-6 w-6"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" style={{ animation: 'pop-in 0.5s forwards' }}/><path d="m9 9 3 3-3 3" style={{ opacity: 0, animation: 'slide-in 0.5s 0.3s forwards' }}/></g><style>{`@keyframes pop-in { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }@keyframes slide-in { from { transform: translateX(-5px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style></svg>
);
const CommandActionIcon = () => (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M10 9-3 4.5 10 0v9z" style={{ animation: 'slide-right 0.5s forwards' }}/><path d="M14 5.5 21 10l-7 4.5v-9z" style={{ opacity: 0, animation: 'slide-left 0.5s 0.3s forwards' }}/></g><style>{`@keyframes slide-right { from { transform: translateX(-5px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }@keyframes slide-left { from { transform: translateX(5px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style></svg>
);
const UserManagementIcon = () => (
    <svg viewBox="0 0 24 24" className="h-6 w-6"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" style={{ animation: 'slide-up 0.5s forwards' }}/><circle cx="9" cy="7" r="4" style={{ animation: 'pop-in 0.5s 0.2s forwards', transformOrigin: 'center', opacity: 0 }}/><path d="M22 21v-2a4 4 0 0 0-3-3.87" style={{ opacity: 0, animation: 'fade-in 0.5s 0.4s forwards' }}/><path d="M16 3.13a4 4 0 0 1 0 7.75" style={{ opacity: 0, animation: 'fade-in 0.5s 0.6s forwards' }}/></g><style>{`@keyframes slide-up { from { transform: translateY(5px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }@keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style></svg>
);


export default async function AdminPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmails = process.env.ADMIN_EMAIL?.split(',') || [];
  if (!user || !user.email || !adminEmails.includes(user.email)) {
    notFound();
  }
  
  const isVerified = !!user.email_confirmed_at;

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
      {!isVerified && <UnverifiedAccountWarning />}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <AdminConsoleIcon />
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
              <CurrentAdminsIcon />
              Current Administrators
            </CardTitle>
            <CardDescription>
                Users with these emails have full administrative privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {adminEmails.map((email) => (
                <p key={email} className="font-mono text-sm bg-muted p-2 rounded-md inline-block">{email}</p>
            ))}
          </CardContent>
        </Card>
      </div>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersStatIcon />
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
            <ChatsStatIcon />
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
            <MessagesStatIcon />
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
                <ChartIcon />
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
                <ChartIcon />
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
            <CommandsIcon />
            Admin Commands
          </CardTitle>
          <CardDescription>
            Run specific administrative tasks and commands.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline"><CommandActionIcon /> Clear System Cache</Button>
            <Button variant="outline"><CommandActionIcon /> Re-analyze User Data</Button>
            <Button variant="outline"><CommandActionIcon /> Trigger Backup</Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
            <CardTitle className='font-headline flex items-center gap-2'>
                <UserManagementIcon />
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
