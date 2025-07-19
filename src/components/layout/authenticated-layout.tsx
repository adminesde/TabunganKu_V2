"use client";

import * as React from "react";
import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react"; // Import Menu icon
import { Button } from "@/components/ui/button"; // Ensure Button is imported

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex-shrink-0 transition-all duration-300 ease-in-out",
          isMobile ? "fixed inset-y-0 left-0 z-50 bg-sidebar shadow-lg" : "relative",
          isCollapsed ? "w-16" : "w-72",
          isMobile && isCollapsed ? "hidden" : "block" // Hide completely on mobile when collapsed
        )}
      >
        <SidebarNav
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          onLinkClick={() => {
            if (isMobile) setIsCollapsed(true); // Collapse sidebar on link click if on mobile
          }}
        />
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsCollapsed(true)} // Close sidebar when clicking overlay
        ></div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-grow">
        {/* Mobile menu button */}
        {isMobile && isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm" // Position and style
            onClick={toggleCollapse}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
        <main className={cn(
          "flex-grow p-6 md:p-8 lg:p-10 overflow-x-hidden", // Added overflow-x-hidden here
          isMobile && isCollapsed && "pt-16" // Add top padding when mobile menu button is visible
        )}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}