import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminUserActions } from '@/components/auth/admin-user-actions';


export default async function LoginPage() {
  const supabaseAdmin = createAdminClient();
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error("Failed to fetch users for admin actions:", error);
  }

  return (
    <Card className="w-full max-w-sm shadow-xl relative">
       {users && <AdminUserActions users={users} />}
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Enter your email below to log in to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline text-primary font-medium">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
