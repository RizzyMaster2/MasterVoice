
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Building } from 'lucide-react';

export default async function CaliforniaPrivacyPage() {
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
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
               <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">California Privacy Notice</CardTitle>
              <CardDescription>Information for California Residents.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              <p>This section provides additional details about the personal information we collect about California consumers and the rights afforded to them under the California Consumer Privacy Act or "CCPA."</p>
              <h2>Your Rights</h2>
              <p>Subject to certain limitations, the CCPA provides California consumers the right to request to know more details about the categories or specific pieces of personal information we collect (including how we use and disclose this information), to delete their personal information, to opt out of any "sales" that may be occurring, and to not be discriminated against for exercising these rights.</p>
              <p>This page is a placeholder. A full implementation would require a robust process for handling user data requests.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
