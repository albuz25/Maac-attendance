"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Center } from "@/lib/types";

export async function getCenters(): Promise<{ data: Center[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("centers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getCenterDetails(centerId: string): Promise<{ data: any | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Get center
  const { data: center, error: centerError } = await supabase
    .from("centers")
    .select("*")
    .eq("id", centerId)
    .single();

  if (centerError) {
    return { data: null, error: centerError.message };
  }

  // Get stats
  const [batchesResult, studentsResult, usersResult] = await Promise.all([
    supabase.from("batches").select("id").eq("center_id", centerId),
    supabase.from("students").select("id").eq("center_id", centerId),
    supabase.from("users").select("id, role").eq("center_id", centerId),
  ]);

  const managerCount = usersResult.data?.filter((u) => u.role === "CENTRE_MANAGER").length || 0;

  return {
    data: {
      ...center,
      batch_count: batchesResult.data?.length || 0,
      student_count: studentsResult.data?.length || 0,
      manager_count: managerCount,
    },
    error: null,
  };
}

export async function getCentersWithStats(): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Get all centers
  const { data: centers, error } = await supabase
    .from("centers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  // Get stats for each center
  const centersWithStats = await Promise.all(
    centers.map(async (center) => {
      const [batchesResult, studentsResult, usersResult] = await Promise.all([
        supabase.from("batches").select("id").eq("center_id", center.id),
        supabase.from("students").select("id").eq("center_id", center.id),
        supabase.from("users").select("id, role").eq("center_id", center.id),
      ]);

      const managerCount = usersResult.data?.filter((u) => u.role === "CENTRE_MANAGER").length || 0;

      return {
        ...center,
        batch_count: batchesResult.data?.length || 0,
        student_count: studentsResult.data?.length || 0,
        manager_count: managerCount,
      };
    })
  );

  return { data: centersWithStats, error: null };
}

export async function createCenter(
  name: string
): Promise<{ data: Center | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (userData?.role !== "ADMIN") {
    return { data: null, error: "Not authorized" };
  }

  const { data, error } = await supabase
    .from("centers")
    .insert({ name })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "A center with this name already exists" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/centers");
  return { data, error: null };
}

export async function updateCenter(
  id: string,
  name: string
): Promise<{ data: Center | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (userData?.role !== "ADMIN") {
    return { data: null, error: "Not authorized" };
  }

  const { data, error } = await supabase
    .from("centers")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/centers");
  return { data, error: null };
}

export async function deleteCenter(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (userData?.role !== "ADMIN") {
    return { success: false, error: "Not authorized" };
  }

  // Check if center has any associated data
  const { data: batches } = await supabase
    .from("batches")
    .select("id")
    .eq("center_id", id)
    .limit(1);

  if (batches && batches.length > 0) {
    return { success: false, error: "Cannot delete center with existing batches. Delete all batches first." };
  }

  const { error } = await supabase.from("centers").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/centers");
  return { success: true, error: null };
}

