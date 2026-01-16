import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/sidebar";
import { MobileNav } from "@/components/shared/mobile-nav";
import { UserRole } from "@/lib/types";
import { Suspense } from "react";

// Loading skeleton for the sidebar/nav
function NavSkeleton() {
  return (
    <div className="w-64 h-full bg-slate-800 animate-pulse" />
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Fetch user auth and data in parallel
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Fetch user data with minimal fields needed for nav
  const { data: userData } = await supabase
    .from("users")
    .select(`
      role,
      full_name,
      center:centers(name)
    `)
    .eq("id", user.id)
    .single();

  if (!userData) {
    redirect("/login");
  }

  const userName = userData.full_name || user.email?.split("@")[0] || "User";
  const centerData = Array.isArray(userData.center) ? userData.center[0] : userData.center;
  const centerName = centerData?.name;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <Suspense fallback={<NavSkeleton />}>
          <Sidebar
            role={userData.role as UserRole}
            userName={userName}
            centerName={centerName}
          />
        </Suspense>
      </aside>

      {/* Mobile navigation */}
      <MobileNav
        role={userData.role as UserRole}
        userName={userName}
        centerName={centerName}
      />

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0 min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

