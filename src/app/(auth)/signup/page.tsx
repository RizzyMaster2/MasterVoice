import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignupForm } from '@/components/auth/signup-form';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminUserActions } from '@/components/auth/admin-user-actions';

export default async function SignupPage() {
  const supabaseAdmin = createAdminClient();
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error("Failed to fetch users for admin actions:", error);
  }

  return (
    <Card className="w-full max-w-sm shadow-xl relative">
       {users && <AdminUserActions users={users} />}
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
        <CardDescription>
          Enter your information to create your MasterVoice account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="underline text-primary font-medium">
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
