import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that don't require authentication
const publicRoutes = ["/login", "/auth/callback"];

// Role-based route access
const roleRoutes: Record<string, string[]> = {
  ADMIN: ["/admin", "/centre-manager", "/faculty"],
  CENTRE_MANAGER: ["/centre-manager"],
  FACULTY: ["/faculty"],
};

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    // If user is logged in and trying to access login, redirect to appropriate dashboard
    if (user && pathname === "/login") {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userData?.role) {
        const redirectPath = getDefaultRouteForRole(userData.role);
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    return response;
  }

  // Redirect to login if not authenticated
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user role for authorization
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData?.role) {
    // User exists in auth but not in users table - redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check role-based access
  const userRole = userData.role as keyof typeof roleRoutes;
  const allowedRoutes = roleRoutes[userRole] || [];

  // Check if user has access to the requested route
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess && pathname !== "/") {
    // Redirect to their default dashboard
    const defaultRoute = getDefaultRouteForRole(userRole);
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  // Redirect root to appropriate dashboard
  if (pathname === "/") {
    const defaultRoute = getDefaultRouteForRole(userRole);
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  return response;
}

function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CENTRE_MANAGER":
      return "/centre-manager/batches";
    case "FACULTY":
      return "/faculty";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

