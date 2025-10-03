
import type { Metadata, Viewport } from 'next';
import { Poppins, PT_Sans, Fira_Code } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/app/theme-provider';
import { AnimatedFavicon } from '@/components/app/animated-favicon';

const fontPoppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-headline',
});

const fontPTSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-body',
});

const fontFiraCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-code',
});


export const metadata: Metadata = {
  title: 'MasterVoice',
  description: 'Find your harmony. Connect with the world.',
  icons: [
    {
      rel: 'icon',
      id: 'favicon',
      url: '/favicon.ico', // Default fallback
      type: 'image/x-icon',
    }
  ]
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AnimatedFavicon />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontPoppins.variable,
          fontPTSans.variable,
          fontFiraCode.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
