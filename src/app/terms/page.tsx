
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FileText } from 'lucide-react';

export default async function TermsOfUsePage() {
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
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Terms of Use</CardTitle>
              <CardDescription>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none">
              
              <h2>1. Agreement to Terms</h2>
              <p>By using our services, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the services.</p>
              
              <h2>2. Changes to Terms or Services</h2>
              <p>We may modify the Terms at any time, in our sole discretion. If we do so, we’ll let you know either by posting the modified Terms on the Site or through other communications. It’s important that you review the Terms whenever we modify them because if you continue to use the Services after we have posted modified Terms on the Site, you are indicating to us that you agree to be bound by the modified Terms.</p>
              
              <h2>3. Who May Use the Services</h2>
              <p>You may use the Services only if you are 13 years or older and are not barred from using the Services under applicable law.</p>

              <h2>4. Content and Content Rights</h2>
              <p>For purposes of these Terms: (i) “Content” means text, graphics, images, music, software, audio, video, works of authorship of any kind, and information or other materials that are posted, generated, provided or otherwise made available through the Services; and (ii) “User Content” means any Content that Account holders (including you) provide to be made available through the Services.</p>

              <h2>5. General Prohibitions</h2>
              <p>You agree not to do any of the following: Post, upload, publish, submit or transmit any User Content that: (i) infringes, misappropriates or violates a third party’s patent, copyright, trademark, trade secret, moral rights or other intellectual property rights, or rights of publicity or privacy; (ii) violates, or encourages any conduct that would violate, any applicable law or regulation or would give rise to civil liability; (iii) is fraudulent, false, misleading or deceptive; (iv) is defamatory, obscene, pornographic, vulgar or offensive; (v) promotes discrimination, bigotry, racism, hatred, harassment or harm against any individual or group; (vi) is violent or threatening or promotes violence or actions that are threatening to any person or entity; or (vii) promotes illegal or harmful activities or substances.</p>
              
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
