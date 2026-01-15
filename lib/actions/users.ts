"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { User, UserRole } from "@/lib/types";

export async function getUsers(): Promise<{ data: User[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (currentUser?.role !== "ADMIN") {
    return { data: null, error: "Not authorized" };
  }

  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      center:centers(id, name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getUsersByRole(role: UserRole): Promise<{ data: User[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      center:centers(id, name)
    `)
    .eq("role", role)
    .order("full_name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getUsersStats(): Promise<{ data: any | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("role");

  if (error) {
    return { data: null, error: error.message };
  }

  const stats = {
    total: users?.length || 0,
    admins: users?.filter((u) => u.role === "ADMIN").length || 0,
    centre_managers: users?.filter((u) => u.role === "CENTRE_MANAGER").length || 0,
    faculty: users?.filter((u) => u.role === "FACULTY").length || 0,
  };

  return { data: stats, error: null };
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ data: User | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (currentUser?.role !== "ADMIN") {
    return { data: null, error: "Not authorized" };
  }

  // Prevent admin from demoting themselves
  if (userId === user.user.id && role !== "ADMIN") {
    return { data: null, error: "Cannot change your own role" };
  }

  const { data, error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/users");
  return { data, error: null };
}

export async function updateUserCenter(
  userId: string,
  centerId: string | null
): Promise<{ data: User | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (currentUser?.role !== "ADMIN") {
    return { data: null, error: "Not authorized" };
  }

  const { data, error } = await supabase
    .from("users")
    .update({ center_id: centerId })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/users");
  return { data, error: null };
}

export async function updateUser(
  userId: string,
  updates: { full_name?: string; role?: UserRole; center_id?: string | null }
): Promise<{ data: User | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (currentUser?.role !== "ADMIN") {
    return { data: null, error: "Not authorized" };
  }

  // Prevent admin from demoting themselves
  if (userId === user.user.id && updates.role && updates.role !== "ADMIN") {
    return { data: null, error: "Cannot change your own role" };
  }

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select(`
      *,
      center:centers(id, name)
    `)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/users");
  return { data, error: null };
}

export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "Not authorized" };
  }

  // Prevent admin from deleting themselves
  if (userId === user.user.id) {
    return { success: false, error: "Cannot delete your own account" };
  }

  // Delete user from users table (auth user remains but won't have access)
  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true, error: null };
}

