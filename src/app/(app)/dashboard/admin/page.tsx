import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    notFound();
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
    </div>
  );
}
