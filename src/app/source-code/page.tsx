

import { MainHeader } from '@/components/app/main-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Code2, GitBranch } from 'lucide-react';
import Link from 'next/link';

export default async function SourceCodePage() {
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
                <Code2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Our Commitment to Transparency</CardTitle>
              <CardDescription>MasterVoice is built on open standards and principles.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none text-center">
              <p>We believe that security and privacy are best achieved through transparency. That's why the source code for the MasterVoice application is publicly available for anyone to review, audit, and contribute to.</p>
              <p>By making our code open, we empower our community to verify our security claims and help us build a better, more secure platform for everyone.</p>
              <div className="not-prose pt-4">
                <Button asChild size="lg">
                    <Link href="https://github.com/RizzyMaster2/MasterVoice" target="_blank" rel="noopener noreferrer">
                        <GitBranch className="mr-2 h-5 w-5" />
                        View Source on GitHub
                    </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
