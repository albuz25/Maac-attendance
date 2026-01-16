import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/sidebar";
import { MobileNav } from "@/components/shared/mobile-nav";
import { UserRole } from "@/lib/types";
import { unstable_cache } from "next/cache";

// Cache user data for 60 seconds
const getCachedUserData = unstable_cache(
  async (userId: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("users")
      .select(`
        *,
        center:centers(name)
      `)
      .eq("id", userId)
      .single();
    return data;
  },
  ["user-data"],
  { revalidate: 60 } // Cache for 60 seconds
);

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

  // Use cached user data
  const userData = await getCachedUserData(user.id);

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

