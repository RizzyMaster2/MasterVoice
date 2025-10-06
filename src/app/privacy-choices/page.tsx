
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ToggleRight } from 'lucide-react';

export default async function PrivacyChoicesPage() {
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
                <ToggleRight className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Your Privacy Choices</CardTitle>
              <CardDescription>Manage your privacy settings.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-center">
              <p>This page is under construction.</p>
              <p>In the future, you will be able to manage your data and privacy settings here.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
