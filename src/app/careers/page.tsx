
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Briefcase } from 'lucide-react';

export default async function CareersPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainHeader user={user} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <Card className="max-w-4xl mx-auto text-center">
            <CardHeader>
               <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Careers at MasterVoice</CardTitle>
              <CardDescription>Join our mission to connect the world.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-center">
              <p>We are not currently hiring, but we are always looking for talented individuals to join our team.</p>
              <p>If you are passionate about communication technology and want to make a difference, we would love to hear from you. Please check back later for open positions.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
