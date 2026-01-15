"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CreateBatchInput, Batch } from "@/lib/types";

export async function getBatches(): Promise<{ data: Batch[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("center_id, role")
    .eq("id", user.user.id)
    .single();

  if (!userData) {
    return { data: null, error: "User not found" };
  }

  let query = supabase
    .from("batches")
    .select(`
      *,
      faculty:users!batches_faculty_id_fkey(id, full_name, email),
      center:centers(id, name)
    `)
    .order("created_at", { ascending: false });

  // Filter by center for non-admin users
  if (userData.role !== "ADMIN" && userData.center_id) {
    query = query.eq("center_id", userData.center_id);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  // Get student counts
  const batchIds = data.map((b) => b.id);
  const { data: studentCounts } = await supabase
    .from("students")
    .select("batch_id")
    .in("batch_id", batchIds);

  const countsMap = studentCounts?.reduce((acc, s) => {
    acc[s.batch_id] = (acc[s.batch_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const batchesWithCounts = data.map((batch) => ({
    ...batch,
    student_count: countsMap[batch.id] || 0,
  }));

  return { data: batchesWithCounts, error: null };
}

export async function createBatch(
  input: CreateBatchInput
): Promise<{ data: Batch | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("center_id, role")
    .eq("id", user.user.id)
    .single();

  if (!userData || !userData.center_id) {
    return { data: null, error: "User center not found" };
  }

  if (userData.role !== "ADMIN" && userData.role !== "CENTRE_MANAGER") {
    return { data: null, error: "Not authorized" };
  }

  const { data, error } = await supabase
    .from("batches")
    .insert({
      name: input.name,
      days: input.days,
      timing: input.timing,
      faculty_id: input.faculty_id,
      center_id: userData.center_id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "A batch with this name already exists" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath("/centre-manager/batches");
  return { data, error: null };
}

export async function updateBatch(
  id: string,
  input: Partial<CreateBatchInput>
): Promise<{ data: Batch | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("batches")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/centre-manager/batches");
  return { data, error: null };
}

export async function deleteBatch(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("batches").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/centre-manager/batches");
  return { success: true, error: null };
}

export async function getBatchDetails(batchId: string, date?: string): Promise<{ data: any | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Use provided date or default to today
  const selectedDate = date || new Date().toISOString().split("T")[0];

  // Get batch with faculty info
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select(`
      *,
      faculty:users!batches_faculty_id_fkey(id, full_name, email),
      center:centers(id, name)
    `)
    .eq("id", batchId)
    .single();

  if (batchError) {
    return { data: null, error: batchError.message };
  }

  // Get students in this batch
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("*")
    .eq("batch_id", batchId)
    .order("roll_number", { ascending: true });

  if (studentsError) {
    return { data: null, error: studentsError.message };
  }

  // Get attendance for selected date
  const { data: dateAttendance } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("batch_id", batchId)
    .eq("date", selectedDate);

  // Create a map of student attendance for the selected date
  const attendanceMap = new Map<string, string>();
  dateAttendance?.forEach((a) => {
    attendanceMap.set(a.student_id, a.status);
  });

  // Add attendance status to each student
  const studentsWithAttendance = students?.map((student) => ({
    ...student,
    attendance_status: attendanceMap.get(student.id) || null,
  })) || [];

  // Get attendance stats (all time)
  const { data: attendanceData } = await supabase
    .from("attendance")
    .select("date, status")
    .eq("batch_id", batchId);

  // Calculate lectures completed (unique dates)
  const uniqueDates = new Set(attendanceData?.map((a) => a.date) || []);
  const lecturesCompleted = uniqueDates.size;

  // Calculate average attendance
  let averageAttendance = 0;
  if (attendanceData && attendanceData.length > 0) {
    const presentCount = attendanceData.filter((a) => a.status === "Present").length;
    averageAttendance = (presentCount / attendanceData.length) * 100;
  }

  // Calculate present count for selected date
  const presentOnDate = dateAttendance?.filter((a) => a.status === "Present").length || 0;
  const attendanceMarkedOnDate = dateAttendance && dateAttendance.length > 0;

  return {
    data: {
      ...batch,
      students: studentsWithAttendance,
      lectures_completed: lecturesCompleted,
      average_attendance: averageAttendance,
      present_today: presentOnDate,
      attendance_marked_today: attendanceMarkedOnDate,
      selected_date: selectedDate,
    },
    error: null,
  };
}

export async function getFacultyList(): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Get ALL faculty members (they rotate across all centers)
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "FACULTY")
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

