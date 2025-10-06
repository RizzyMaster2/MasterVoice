
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Cookie } from 'lucide-react';

export default async function CookiePolicyPage() {
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
                <Cookie className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Cookie Policy</CardTitle>
              <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              
              <h2>1. What are cookies?</h2>
              <p>A cookie is a small text file that a website saves on your computer or mobile device when you visit the site. It enables the website to remember your actions and preferences (such as login, language, font size and other display preferences) over a period of time, so you don’t have to keep re-entering them whenever you come back to the site or browse from one page to another.</p>
              
              <h2>2. How do we use cookies?</h2>
              <p>We use cookies for the following purposes:</p>
              <ul>
                <li><strong>Authentication:</strong> To identify you when you visit our website and as you navigate our website.</li>
                <li><strong>Status:</strong> To help us to determine if you are logged into our website.</li>
                <li><strong>Personalization:</strong> To store information about your preferences and to personalize the website for you.</li>
                <li><strong>Security:</strong> As an element of the security measures used to protect user accounts, including preventing fraudulent use of login credentials, and to protect our website and services generally.</li>
                <li><strong>Analysis:</strong> To help us to analyze the use and performance of our website and services.</li>
                <li><strong>Cookie Consent:</strong> To store your preferences in relation to the use of cookies more generally.</li>
              </ul>
              
              <h2>3. How to manage cookies</h2>
              <p>You can control and/or delete cookies as you wish – for details, see aboutcookies.org. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. If you do this, however, you may have to manually adjust some preferences every time you visit a site and some services and functionalities may not work.</p>
              
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
