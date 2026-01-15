import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/sidebar";
import { MobileNav } from "@/components/shared/mobile-nav";
import { UserRole } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select(`
      *,
      center:centers(name)
    `)
    .eq("id", user.id)
    .single();

  if (!userData) {
    redirect("/login");
  }

  const userName = userData.full_name || user.email?.split("@")[0] || "User";
  const centerName = userData.center?.name;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <Sidebar
          role={userData.role as UserRole}
          userName={userName}
          centerName={centerName}
        />
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

