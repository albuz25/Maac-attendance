"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

// Global SWR config
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 10000, // 10 seconds
  errorRetryCount: 2,
};

// Create a reusable fetcher
const supabase = createClient();

// Hook for fetching students
export function useStudents(batchId?: string) {
  return useSWR(
    ["students", batchId],
    async () => {
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
      const { data, error } = await supabase
        .from("batches")
        .select(`
          *,
          faculty:users!batches_faculty_id_fkey(id, full_name, email),
          center:centers(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get student counts
      const { data: studentCounts } = await supabase
        .from("students")
        .select("batch_id");

      const countsMap: Record<string, number> = {};
      studentCounts?.forEach((s) => {
        if (s.batch_id) {
          countsMap[s.batch_id] = (countsMap[s.batch_id] || 0) + 1;
        }
      });

      return data?.map((batch) => ({
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
    }
  );
}

// Hook for fetching faculty
export function useFaculty() {
  return useSWR(
    "faculty",
    async () => {
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
    }
  );
}

// Hook for current user data
export function useCurrentUser() {
  return useSWR(
    "currentUser",
    async () => {
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
      dedupingInterval: 60000, // 1 minute for user data
    }
  );
}

// Mutate functions to trigger revalidation
export { mutate } from "swr";

