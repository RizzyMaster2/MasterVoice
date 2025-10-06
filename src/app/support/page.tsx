
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { LifeBuoy } from 'lucide-react';

export default async function SupportPage() {
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
                <LifeBuoy className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Support</CardTitle>
              <CardDescription>We're here to help.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-center">
              <p>If you are experiencing issues or have questions about MasterVoice, please check our <a href="/faq">FAQ page</a> first.</p>
              <p>For all other inquiries, please contact our support team at <a href="mailto:support@mastervoice.example.com">support@mastervoice.example.com</a>.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
