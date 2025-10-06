
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie } from 'lucide-react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'mastervoice_cookie_consent';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleConsent = (consentType: 'all' | 'essential' | 'none') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, consentType);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5">
      <Card className="max-w-4xl mx-auto shadow-2xl">
        <CardHeader className="flex-row items-start gap-4">
          <Cookie className="h-6 w-6 text-primary mt-1" />
          <div>
            <CardTitle className="font-headline">Our Use of Cookies</CardTitle>
            <CardDescription>
              We use cookies and similar technologies to help personalize content, tailor and measure ads, and provide a better experience. By clicking "Accept All", you agree to this, as outlined in our <Link href="/cookie-policy" className="underline hover:text-primary">Cookie Policy</Link>.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => handleConsent('none')}>
            Decline
          </Button>
          <Button variant="secondary" onClick={() => handleConsent('essential')}>
            Accept Essential
          </Button>
          <Button onClick={() => handleConsent('all')}>
            Accept All
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
