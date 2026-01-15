"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AttendanceInput, Attendance, AttendanceReport } from "@/lib/types";

export async function getFacultyBatches() {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("batches")
    .select(`
      *,
      center:centers(id, name)
    `)
    .eq("faculty_id", user.user.id)
    .order("timing", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  // Get student counts for each batch
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

export async function getBatchStudents(batchId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("batch_id", batchId)
    .order("roll_number", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getAttendanceForDate(batchId: string, date: string) {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      *,
      student:students(id, name, roll_number)
    `)
    .eq("batch_id", batchId)
    .eq("date", date);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function markAttendance(
  batchId: string,
  date: string,
  attendanceRecords: AttendanceInput[]
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { success: false, error: "Not authenticated" };
  }

  // Delete existing attendance for this batch and date
  await supabase
    .from("attendance")
    .delete()
    .eq("batch_id", batchId)
    .eq("date", date);

  // Insert new attendance records
  const records = attendanceRecords.map((record) => ({
    student_id: record.student_id,
    batch_id: batchId,
    date: date,
    status: record.status,
    marked_by_id: user.user!.id,
  }));

  const { error } = await supabase.from("attendance").insert(records);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/faculty");
  revalidatePath("/centre-manager/reports");
  return { success: true, error: null };
}

export async function getBatchAttendanceReport(
  date: string
): Promise<{ data: any[] | null; error: string | null }> {
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

  // Get the day of week for the selected date
  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();
  
  const isMWF = [1, 3, 5].includes(dayOfWeek);
  const isTTS = [2, 4, 6].includes(dayOfWeek);

  // Sunday - no batches
  if (!isMWF && !isTTS) {
    return { data: [], error: null };
  }

  // Get batches for this center scheduled on this day
  let batchQuery = supabase
    .from("batches")
    .select(`
      id,
      name,
      timing,
      days,
      faculty:users!batches_faculty_id_fkey(id, full_name)
    `)
    .eq("days", isMWF ? "MWF" : "TTS");

  // Filter by center for non-admin users
  if (userData.role !== "ADMIN" && userData.center_id) {
    batchQuery = batchQuery.eq("center_id", userData.center_id);
  }

  const { data: batches, error: batchError } = await batchQuery.order("timing");

  if (batchError) {
    return { data: null, error: batchError.message };
  }

  // Get stats for each batch
  const batchReport = await Promise.all(
    batches.map(async (batch) => {
      // Get total students in batch
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id);

      // Get attendance for the date
      const { data: attendance } = await supabase
        .from("attendance")
        .select("status")
        .eq("batch_id", batch.id)
        .eq("date", date);

      const presentCount = attendance?.filter((a) => a.status === "Present").length || 0;
      const absentCount = attendance?.filter((a) => a.status === "Absent").length || 0;
      const attendancePercentage = totalStudents && totalStudents > 0
        ? Math.round((presentCount / totalStudents) * 100)
        : 0;

      return {
        batch_id: batch.id,
        batch_name: batch.name,
        timing: batch.timing,
        days: batch.days,
        faculty_name: (batch.faculty as any)?.full_name || null,
        date: date,
        total_students: totalStudents || 0,
        present_count: presentCount,
        absent_count: absentCount,
        attendance_percentage: attendancePercentage,
      };
    })
  );

  return { data: batchReport, error: null };
}

export async function getAttendanceReport(
  batchId?: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: AttendanceReport[] | null; error: string | null }> {
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

  // Get students with their batches
  let studentsQuery = supabase
    .from("students")
    .select(`
      id,
      name,
      roll_number,
      batch_id,
      batch:batches(id, name)
    `);

  if (userData.role !== "ADMIN" && userData.center_id) {
    studentsQuery = studentsQuery.eq("center_id", userData.center_id);
  }

  if (batchId) {
    studentsQuery = studentsQuery.eq("batch_id", batchId);
  }

  const { data: students, error: studentsError } = await studentsQuery;

  if (studentsError) {
    return { data: null, error: studentsError.message };
  }

  if (!students || students.length === 0) {
    return { data: [], error: null };
  }

  // Get attendance records
  let attendanceQuery = supabase
    .from("attendance")
    .select("student_id, status");

  if (batchId) {
    attendanceQuery = attendanceQuery.eq("batch_id", batchId);
  }

  if (startDate) {
    attendanceQuery = attendanceQuery.gte("date", startDate);
  }

  if (endDate) {
    attendanceQuery = attendanceQuery.lte("date", endDate);
  }

  const { data: attendance, error: attendanceError } = await attendanceQuery;

  if (attendanceError) {
    return { data: null, error: attendanceError.message };
  }

  // Calculate report for each student
  const report: AttendanceReport[] = students.map((student) => {
    const studentAttendance = attendance?.filter((a) => a.student_id === student.id) || [];
    const totalClasses = studentAttendance.length;
    const presentCount = studentAttendance.filter((a) => a.status === "Present").length;
    const absentCount = totalClasses - presentCount;
    const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    return {
      student_id: student.id,
      student_name: student.name,
      roll_number: student.roll_number,
      batch_name: (student.batch as any)?.name || "Unknown",
      total_classes: totalClasses,
      present_count: presentCount,
      absent_count: absentCount,
      percentage,
    };
  });

  return { data: report, error: null };
}

