"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

interface SidebarProps {
  role: UserRole;
  userName: string;
  centerName?: string;
}

export function Sidebar({ role, userName, centerName }: SidebarProps) {
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
    <div className="flex flex-col h-full bg-white border-r">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">MAAC Portal</h1>
            {centerName && (
              <p className="text-xs text-muted-foreground">{centerName}</p>
            )}
          </div>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
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

      <Separator />

      {/* User section */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {role.replace("_", " ").toLowerCase()}
            </p>
          </div>
        </div>
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
  );
}

