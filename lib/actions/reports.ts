"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCentreWiseReport(
  centerId: string,
  date: string
): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Get the day of week for the selected date (0 = Sunday, 1 = Monday, etc.)
  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();
  
  // MWF = Monday(1), Wednesday(3), Friday(5)
  // TTS = Tuesday(2), Thursday(4), Saturday(6)
  const isMWF = [1, 3, 5].includes(dayOfWeek);
  const isTTS = [2, 4, 6].includes(dayOfWeek);
  
  // Get batches for this center that run on the selected day
  let query = supabase
    .from("batches")
    .select(`
      id,
      name,
      days,
      timing,
      faculty:users!batches_faculty_id_fkey(id, full_name),
      center:centers(id, name)
    `)
    .eq("center_id", centerId);

  // Filter by day schedule
  if (isMWF) {
    query = query.eq("days", "MWF");
  } else if (isTTS) {
    query = query.eq("days", "TTS");
  } else {
    // Sunday - no batches
    return { data: [], error: null };
  }

  const { data: batches, error: batchError } = await query.order("timing");

  if (batchError) {
    return { data: null, error: batchError.message };
  }

  // Get student counts and attendance for each batch
  const batchesWithStats = await Promise.all(
    batches.map(async (batch) => {
      // Get total students in batch
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id);

      // Get present students for the date
      const { count: presentStudents } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("date", date)
        .eq("status", "Present");

      // Check if attendance was marked
      const { count: attendanceMarked } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("date", date);

      return {
        ...batch,
        total_students: totalStudents || 0,
        present_students: presentStudents || 0,
        attendance_marked: (attendanceMarked || 0) > 0,
      };
    })
  );

  return { data: batchesWithStats, error: null };
}

export async function getFacultyWiseReport(
  date: string
): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Get all faculty members
  const { data: facultyList, error: facultyError } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "FACULTY")
    .order("full_name");

  if (facultyError) {
    return { data: null, error: facultyError.message };
  }

  // Get the day of week for the selected date
  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();
  
  const isMWF = [1, 3, 5].includes(dayOfWeek);
  const isTTS = [2, 4, 6].includes(dayOfWeek);

  // Get batches and stats for each faculty
  const facultyWithBatches = await Promise.all(
    facultyList.map(async (faculty) => {
      // Get batches assigned to this faculty
      let batchQuery = supabase
        .from("batches")
        .select(`
          id,
          name,
          days,
          timing,
          center:centers(id, name)
        `)
        .eq("faculty_id", faculty.id);

      // Filter by day if not Sunday
      if (isMWF) {
        batchQuery = batchQuery.eq("days", "MWF");
      } else if (isTTS) {
        batchQuery = batchQuery.eq("days", "TTS");
      }

      const { data: batches } = await batchQuery.order("timing");

      if (!batches || batches.length === 0) {
        return {
          ...faculty,
          batches: [],
          total_batches: 0,
          total_students: 0,
          total_present: 0,
        };
      }

      // Get stats for each batch
      const batchesWithStats = await Promise.all(
        batches.map(async (batch) => {
          const { count: totalStudents } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("batch_id", batch.id);

          const { count: presentStudents } = await supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("batch_id", batch.id)
            .eq("date", date)
            .eq("status", "Present");

          const { count: attendanceMarked } = await supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("batch_id", batch.id)
            .eq("date", date);

          return {
            ...batch,
            total_students: totalStudents || 0,
            present_students: presentStudents || 0,
            attendance_marked: (attendanceMarked || 0) > 0,
          };
        })
      );

      const totalStudents = batchesWithStats.reduce((sum, b) => sum + b.total_students, 0);
      const totalPresent = batchesWithStats.reduce((sum, b) => sum + b.present_students, 0);

      return {
        ...faculty,
        batches: batchesWithStats,
        total_batches: batchesWithStats.length,
        total_students: totalStudents,
        total_present: totalPresent,
      };
    })
  );

  // Filter out faculty with no batches on this day
  const facultyWithActiveBatches = facultyWithBatches.filter(f => f.total_batches > 0);

  return { data: facultyWithActiveBatches, error: null };
}

export async function getAllBatchesReport(
  date: string
): Promise<{ data: any[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // Get the day of week
  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();
  
  const isMWF = [1, 3, 5].includes(dayOfWeek);
  const isTTS = [2, 4, 6].includes(dayOfWeek);

  if (!isMWF && !isTTS) {
    return { data: [], error: null };
  }

  // Get all batches for the day
  const { data: batches, error } = await supabase
    .from("batches")
    .select(`
      id,
      name,
      days,
      timing,
      faculty:users!batches_faculty_id_fkey(id, full_name),
      center:centers(id, name)
    `)
    .eq("days", isMWF ? "MWF" : "TTS")
    .order("timing");

  if (error) {
    return { data: null, error: error.message };
  }

  // Get stats for each batch
  const batchesWithStats = await Promise.all(
    batches.map(async (batch) => {
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id);

      const { count: presentStudents } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("date", date)
        .eq("status", "Present");

      const { count: attendanceMarked } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("date", date);

      return {
        ...batch,
        total_students: totalStudents || 0,
        present_students: presentStudents || 0,
        attendance_marked: (attendanceMarked || 0) > 0,
      };
    })
  );

  return { data: batchesWithStats, error: null };
}

export async function getDaysheetData(
  centerId: string | null,
  date: string
): Promise<{
  data: {
    batches: any[];
    faculty: { id: string; name: string }[];
    dayType: "MWF" | "TTS" | null;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  // If no centerId provided, get user's center
  let targetCenterId = centerId;
  if (!targetCenterId) {
    const { data: userData } = await supabase
      .from("users")
      .select("center_id, role")
      .eq("id", user.user.id)
      .single();
    
    if (userData?.role !== "ADMIN" && userData?.center_id) {
      targetCenterId = userData.center_id;
    }
  }

  // Get the day of week
  const selectedDate = new Date(date);
  const dayOfWeek = selectedDate.getDay();
  
  const isMWF = [1, 3, 5].includes(dayOfWeek);
  const isTTS = [2, 4, 6].includes(dayOfWeek);

  if (!isMWF && !isTTS) {
    return { 
      data: { batches: [], faculty: [], dayType: null }, 
      error: null 
    };
  }

  const dayType = isMWF ? "MWF" : "TTS";

  // Build batch query
  let batchQuery = supabase
    .from("batches")
    .select(`
      id,
      name,
      days,
      timing,
      start_time,
      end_time,
      faculty_id,
      faculty:users!batches_faculty_id_fkey(id, full_name),
      center:centers(id, name)
    `)
    .eq("days", dayType)
    .order("start_time");

  // Filter by center if we have one
  if (targetCenterId) {
    batchQuery = batchQuery.eq("center_id", targetCenterId);
  }

  const { data: batches, error: batchError } = await batchQuery;

  if (batchError) {
    return { data: null, error: batchError.message };
  }

  // Get all faculty who have batches
  const facultyIds = [...new Set(batches.map(b => b.faculty_id).filter(Boolean))];
  
  const { data: facultyData } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", facultyIds.length > 0 ? facultyIds : [''])
    .order("full_name");

  const faculty = (facultyData || []).map(f => ({
    id: f.id,
    name: f.full_name,
  }));

  // Get stats for each batch
  const batchesWithStats = await Promise.all(
    batches.map(async (batch) => {
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id);

      const { count: presentCount } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("date", date)
        .eq("status", "Present");

      const { count: absentCount } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("date", date)
        .eq("status", "Absent");

      // Handle faculty - could be array or object from Supabase
      const facultyData = Array.isArray(batch.faculty) ? batch.faculty[0] : batch.faculty;
      
      return {
        id: batch.id,
        name: batch.name,
        start_time: batch.start_time || "10:00",
        end_time: batch.end_time || "11:30",
        timing: batch.timing,
        days: batch.days,
        faculty_id: batch.faculty_id,
        faculty_name: facultyData?.full_name || null,
        student_count: studentCount || 0,
        present_count: presentCount || 0,
        absent_count: absentCount || 0,
      };
    })
  );

  return {
    data: {
      batches: batchesWithStats,
      faculty,
      dayType,
    },
    error: null,
  };
}

