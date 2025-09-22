import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessagesSquare, MessageSquare, Shield, Users } from 'lucide-react';
import { UserManagement } from '@/components/app/user-management';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminStats } from '@/app/actions/admin';

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

  const { totalChats, totalMessages, error: statsError } = await getAdminStats();

  if (statsError) {
    console.error('Error fetching admin stats:', statsError);
    // Handle stats error gracefully
  }


  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
            <CardTitle className='font-headline flex items-center gap-2'>
                <Users className='h-6 w-6'/>
                User Management
            </CardTitle>
        </CardHeader>
        <CardContent>
            <UserManagement users={users || []}/>
        </CardContent>
      </Card>
    </div>
  );
}
