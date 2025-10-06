
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ScrollText } from 'lucide-react';

export default async function CodeOfConductPage() {
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
                <ScrollText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Code of Conduct</CardTitle>
              <CardDescription>Our pledge to maintain a safe and inclusive community.</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              
              <h2>Our Pledge</h2>
              <p>We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.</p>
              
              <h2>Our Standards</h2>
              <p>Examples of behavior that contributes to a positive environment for our community include:</p>
              <ul>
                <li>Demonstrating empathy and kindness toward other people</li>
                <li>Being respectful of differing opinions, viewpoints, and experiences</li>
                <li>Giving and gracefully accepting constructive feedback</li>
                <li>Accepting responsibility and apologizing to those affected by our mistakes</li>
              </ul>
              
              <h2>Enforcement</h2>
              <p>Community leaders are responsible for clarifying and enforcing our standards and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.</p>
              
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
