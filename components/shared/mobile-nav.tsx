"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  ClipboardCheck,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const centreManagerNavItems: NavItem[] = [
  { title: "Batches", href: "/centre-manager/batches", icon: BookOpen },
  { title: "Students", href: "/centre-manager/students", icon: Users },
  { title: "Reports", href: "/centre-manager/reports", icon: BarChart3 },
];

const facultyNavItems: NavItem[] = [
  { title: "Attendance", href: "/faculty", icon: ClipboardCheck },
];

const adminNavItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Centers", href: "/admin/centers", icon: GraduationCap },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Reports", href: "/admin/reports", icon: FileText },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

interface MobileNavProps {
  role: UserRole;
  userName: string;
  centerName?: string;
}

export function MobileNav({ role, userName, centerName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = 
    role === "ADMIN" ? adminNavItems :
    role === "CENTRE_MANAGER" ? centreManagerNavItems :
    facultyNavItems;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold">MAAC</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <div
        className={cn(
          "lg:hidden fixed top-0 right-0 z-50 h-full w-64 bg-white transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full pt-16">
          {/* User info */}
          <div className="px-4 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {centerName || role.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

