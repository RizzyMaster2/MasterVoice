
import { MainHeader } from '@/components/app/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <Card className="max-w-4xl mx-auto bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
               <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-4xl">Privacy Policy</CardTitle>
              <CardDescription>Last updated: <span className="font-medium">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none prose-h2:font-headline prose-h2:text-primary prose-a:text-accent hover:prose-a:text-accent/80">
              
              <h2>1. Introduction</h2>
              <p>Welcome to MasterVoice. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.</p>
              
              <h2>2. Information We Collect</h2>
              <p>We collect personal information that you voluntarily provide to us when you register on the MasterVoice, express an interest in obtaining information about us or our products and services, when you participate in activities on the MasterVoice or otherwise when you contact us.</p>
              <p>The personal information that we collect depends on the context of your interactions with us and the MasterVoice, the choices you make and the products and features you use. The personal information we collect may include the following:</p>
              <ul>
                  <li><strong>Personal Information Provided by You.</strong> We collect names; email addresses; passwords; contact preferences; and other similar information.</li>
                  <li><strong>Usage Data.</strong> We may also collect information on how the Service is accessed and used. This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <p>We use personal information collected via our MasterVoice for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
              
              <h2>4. Will Your Information Be Shared With Anyone?</h2>
              <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>
              
              <h2>5. How We Keep Your Information Safe</h2>
              <p>We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security, and improperly collect, access, steal, or modify your information.</p>
              
              <h2>6. Do We Make Updates to This Policy?</h2>
              <p>In short: Yes, we will update this policy as necessary to stay compliant with relevant laws.</p>
              <p>We may update this privacy policy from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible. We encourage you to review this privacy policy frequently to be informed of how we are protecting your information.</p>
              
              <h2>7. How Can You Contact Us About This Policy?</h2>
              <p>If you have questions or comments about this policy, you may reach out to us through our official support channels.</p>

            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
