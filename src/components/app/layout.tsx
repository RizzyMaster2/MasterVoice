
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app/app-sidebar';
import { UserNav } from '@/components/app/user-nav';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/app/theme-toggle';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <AppSidebar />
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col p-0">
                <AppSidebar />
              </SheetContent>
            </Sheet>
            <div className="w-full flex-1" />
            <ThemeToggle />
            <UserNav />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 h-[calc(100vh-60px)] overflow-auto">
            {children}
          </main>
        </div>
      </div>
  );
}
