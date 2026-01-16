"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

// Global SWR config - optimized for speed
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 30000, // 30 seconds - longer to reduce API calls
  errorRetryCount: 2,
  keepPreviousData: true, // Show stale data while loading
};

// Create a reusable fetcher - singleton
let supabaseInstance: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

// Hook for fetching students
export function useStudents(batchId?: string) {
  return useSWR(
    ["students", batchId],
    async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("students")
        .select(`
          *,
          batch:batches(id, name, days, timing),
          center:centers(id, name)
        `)
        .order("roll_number", { ascending: true });

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
    }
  );
}

// Hook for fetching batches
export function useBatches() {
  return useSWR(
    "batches",
    async () => {
      const supabase = getSupabase();
      // Fetch both in parallel for speed
      const [batchesResult, studentsResult] = await Promise.all([
        supabase
          .from("batches")
          .select(`
            *,
            faculty:users!batches_faculty_id_fkey(id, full_name, email),
            center:centers(id, name)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("students")
          .select("batch_id")
      ]);

      if (batchesResult.error) throw batchesResult.error;

      const countsMap: Record<string, number> = {};
      studentsResult.data?.forEach((s) => {
        if (s.batch_id) {
          countsMap[s.batch_id] = (countsMap[s.batch_id] || 0) + 1;
        }
      });

      return batchesResult.data?.map((batch) => ({
        ...batch,
        student_count: countsMap[batch.id] || 0,
      }));
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
    }
  );
}

// Hook for fetching centers
export function useCenters() {
  return useSWR(
    "centers",
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("centers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
      dedupingInterval: 60000, // Centers rarely change - cache for 1 min
    }
  );
}

// Hook for fetching faculty
export function useFaculty() {
  return useSWR(
    "faculty",
    async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "FACULTY")
        .order("full_name");

      if (error) throw error;
      return data;
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
      dedupingInterval: 60000, // Faculty list rarely changes
    }
  );
}

// Hook for current user data
export function useCurrentUser() {
  return useSWR(
    "currentUser",
    async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          center:centers(id, name)
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
      dedupingInterval: 120000, // 2 minutes for user data
    }
  );
}

// Mutate functions to trigger revalidation
export { mutate } from "swr";

