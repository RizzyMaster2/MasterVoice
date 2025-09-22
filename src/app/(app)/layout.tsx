
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app/app-sidebar';
import { UserNav } from '@/components/app/user-nav';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/app/theme-toggle';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <AppSidebar />
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16">
          <SidebarTrigger className="md:hidden"/>
          <div className="flex-1" />
          <ThemeToggle />
          <UserNav />
        </header>
        <main className="flex-1 flex flex-col p-4 sm:p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
