"use client";

import * as React from "react";
import { useSupabase } from "@/components/session-context-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarNav } from "./sidebar-nav";
import { Toaster } from "sonner";
import { Footer } from "./footer";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoadingSession } = useSupabase(); // Get isLoadingSession
  const isMobile = useIsMobile(); // This hook determines if it's mobile
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false); // Add state for sidebar open/close

  // Show a loading skeleton while isMobile is being determined OR session is loading
  if (isMobile === undefined || isLoadingSession) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-4">
        <Skeleton className="h-24 w-48 mb-4" />
        <Skeleton className="h-10 w-64" />
        <p className="text-muted-foreground mt-4">Memuat aplikasi...</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 z-[51]">
            <SidebarNav onLinkClick={() => setIsSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-grow p-4 pt-16">
          {children}
        </main>
        <Toaster richColors position="top-center" />
        <Footer />
      </div>
    );
  } else {
    return (
      <div className="flex flex-col min-h-screen">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
            <SidebarNav />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={85}>
            <main className="flex flex-col flex-grow p-8">
              {children}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
        <Toaster richColors position="top-center" />
        <Footer />
      </div>
    );
  }
}