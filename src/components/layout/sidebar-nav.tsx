"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  DollarSign,
  Calendar,
  LogOut,
  UserPlus,
  BookOpen,
  Wallet,
  FileText,
  KeyRound,
  User,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuthActions } from "@/hooks/use-auth-actions";
import { useIsMobile } from "@/hooks/use-mobile";
import { ModeToggle } from "@/components/mode-toggle";
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface SidebarNavProps {
  onLinkClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarNav({ onLinkClick, isCollapsed = false, onToggleCollapse }: SidebarNavProps) {
  const { session } = useSupabase(); // Still need session for user.id
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthActions();
  const isMobile = useIsMobile();

  const [userName, setUserName] = useState("Memuat...");
  const [userRoleFromProfile, setUserRoleFromProfile] = useState<string | null>(null);
  const [userClassTaught, setUserClassTaught] = useState<string | null>(null);
  const [parentChildName, setParentChildName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) {
        console.log("No session user ID found for sidebar profile fetch.");
        setUserName("Pengguna"); // Fallback
        setUserRoleFromProfile(null);
        setUserClassTaught(null);
        setParentChildName(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, role, class_taught")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile for sidebar:", error.message);
        setUserName("Pengguna"); // Fallback
      } else if (profile) {
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        setUserName(name || "Pengguna");
        setUserRoleFromProfile(profile.role);
        setUserClassTaught(profile.class_taught);

        if (profile.role === "parent") {
          const { data: childrenData, error: childrenError } = await supabase
            .from("students")
            .select("name")
            .eq("parent_id", session.user.id)
            .limit(1); // Get the first child's name

          if (childrenError) {
            console.error("Error fetching children for parent sidebar:", childrenError.message);
          } else if (childrenData && childrenData.length > 0) {
            setParentChildName(childrenData[0].name);
          }
        }
      }
    };
    fetchUserProfile();
  }, [session]); // Removed supabase from dependencies

  const displayRole = userRoleFromProfile || session?.user?.user_metadata?.role || "Pengguna";

  const handleLogout = async () => {
    await logout();
    onLinkClick?.();
  };

  const adminNavItems = [
    { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
    { href: "/admin/recap", icon: BookOpen, label: "Rekapitulasi" },
    { href: "/admin/transactions", icon: DollarSign, label: "Transaksi" },
    { href: "/admin/saving-schedules", icon: Calendar, label: "Jadwal Menabung" },
    { href: "/admin/users", icon: Users, label: "Manajemen Pengguna" },
  ];

  const teacherNavItems = [
    { href: "/teacher/dashboard", icon: Home, label: "Dashboard" },
    { href: "/teacher/students/manage", icon: UserPlus, label: "Manajemen Siswa" },
    { href: "/teacher/students", icon: BookOpen, label: "Tabungan Siswa" },
    { href: "/teacher/saving-schedules", icon: Calendar, label: "Jadwal Menabung" },
  ];

  const parentNavItems = [
    { href: "/parent/dashboard", icon: Home, label: "Dashboard" },
    { href: "/parent/saving-schedules", icon: Calendar, label: "Jadwal Menabung" },
  ];

  let navItems: { href: string; icon: React.ElementType; label: string }[] = [];

  switch (displayRole) {
    case "admin":
      navItems = adminNavItems;
      break;
    case "teacher":
      navItems = teacherNavItems;
      break;
    case "parent":
      navItems = parentNavItems;
      break;
    default:
      navItems = [];
      break;
  }

  const getRoleTranslation = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "teacher": return "Guru";
      case "parent": return "Orang Tua";
      default: return "Pengguna";
    }
  };

  return (
    <div className="flex h-full flex-col justify-between bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-6"> {/* Increased padding */}
      <div>
        {!isCollapsed && (
          <div className="mb-6"> {/* Added margin-bottom to user info block */}
            {/* Use text-foreground for better contrast regardless of theme */}
            <h2 className={cn("font-bold mb-1 text-foreground", isMobile ? "text-lg" : "text-xl")}>{userName}</h2>
            <p className={cn("text-sm mb-1 capitalize text-foreground", isMobile && "text-xs", "whitespace-normal")}>{getRoleTranslation(displayRole)}</p> {/* Removed whitespace-nowrap */}
            {displayRole === "teacher" && userClassTaught && (
              <p className={cn("text-sm text-foreground", isMobile && "text-xs", "whitespace-normal")}>Kelas: {userClassTaught}</p> {/* Removed whitespace-nowrap */}
            )}
            {displayRole === "parent" && parentChildName && (
              <p className={cn("text-sm text-foreground", isMobile && "text-xs", "whitespace-normal")}>{parentChildName}</p> {/* Removed whitespace-nowrap */}
            )}
          </div>
        )}
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed ? "h-10 w-10 p-0 flex items-center justify-center" : "px-4 py-2",
                  pathname === item.href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    : pathname.startsWith(item.href) && item.href !== "/" && item.href !== "/admin/dashboard" && item.href !== "/teacher/dashboard" && item.href !== "/parent/dashboard"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : ""
                )}
                onClick={onLinkClick}
              >
                <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && item.label}
              </Button>
            </Link>
          ))}
          {session && (
            <>
              <Link href="/my-profile" passHref>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isCollapsed ? "h-10 w-10 p-0 flex items-center justify-center" : "px-4 py-2",
                    pathname === "/my-profile"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                      : ""
                  )}
                  onClick={onLinkClick}
                >
                  <User className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && "Profil Saya"}
                </Button>
              </Link>
              {/* Removed the Change Password link from here */}
            </>
          )}
        </nav>
      </div>
      <div className="mt-auto">
        <ModeToggle />
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed ? "h-10 w-10 p-0 flex items-center justify-center" : "px-4 py-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Logout"}
        </Button>
        {!isMobile && onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full justify-center mt-2"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </div>
  );
}