import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users } from 'lucide-react';
import { UserManagement } from '@/components/app/user-management';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The admin check must be done against the server-side environment variable.
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    notFound();
  }
  
  const supabaseAdmin = createAdminClient();
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error('Error fetching users:', error);
    // Render the page with an error message or an empty state
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
            <p>Error fetching users. Please check the server logs.</p>
          </CardContent>
        </Card>
      </div>
    );
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
      <Card>
        <CardHeader>
            <CardTitle className='font-headline flex items-center gap-2'>
                <Users className='h-6 w-6'/>
                User Management
            </CardTitle>
        </CardHeader>
        <CardContent>
            <UserManagement users={users}/>
        </CardContent>
      </Card>
    </div>
  );
}
