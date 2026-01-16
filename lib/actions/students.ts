"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CreateStudentInput, Student, BulkStudentInput, CsvStudentInput } from "@/lib/types";

export async function getStudents(batchId?: string): Promise<{ data: Student[] | null; error: string | null }> {
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
    .from("students")
    .select(`
      *,
      batch:batches(id, name, days, timing),
      center:centers(id, name)
    `)
    .order("roll_number", { ascending: true });

  // Filter by center for non-admin users
  if (userData.role !== "ADMIN" && userData.center_id) {
    query = query.eq("center_id", userData.center_id);
  }

  // Filter by batch if provided
  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createStudent(
  input: CreateStudentInput
): Promise<{ data: Student | null; error: string | null }> {
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

  if (userData.role !== "ADMIN" && userData.role !== "CENTRE_MANAGER") {
    return { data: null, error: "Not authorized" };
  }

  // Determine center_id based on role
  let centerId: string;
  if (userData.role === "ADMIN") {
    // Admin must provide center_id or it's an error
    if (!input.center_id) {
      return { data: null, error: "Center must be specified" };
    }
    centerId = input.center_id;
  } else {
    // Centre Manager uses their own center
    if (!userData.center_id) {
      return { data: null, error: "User center not found" };
    }
    centerId = userData.center_id;
  }

  const insertData: any = {
    name: input.name,
    roll_number: input.roll_number,
    center_id: centerId,
  };

  // Only add batch_id if it's provided
  if (input.batch_id) {
    insertData.batch_id = input.batch_id;
  }

  const { data, error } = await supabase
    .from("students")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "A student with this roll number already exists" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath("/centre-manager/students");
  revalidatePath("/centre-manager/batches");
  revalidatePath("/admin/students");
  return { data, error: null };
}

export async function updateStudent(
  id: string,
  input: Partial<CreateStudentInput>
): Promise<{ data: Student | null; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { data: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("students")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/centre-manager/students");
  revalidatePath("/centre-manager/batches");
  return { data, error: null };
}

export async function deleteStudent(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/centre-manager/students");
  revalidatePath("/centre-manager/batches");
  return { success: true, error: null };
}

// Generate roll number with center prefix
async function generateRollNumber(
  supabase: any,
  centerId: string
): Promise<string> {
  // Get center info for prefix
  const { data: centerData } = await supabase
    .from("centers")
    .select("name")
    .eq("id", centerId)
    .single();

  // Create prefix from center name (e.g., "Greater Noida" -> "GN")
  let prefix = "STU";
  if (centerData?.name) {
    const words = centerData.name.split(" ");
    if (words.length >= 2) {
      prefix = words.map((w: string) => w[0].toUpperCase()).join("");
    } else {
      prefix = centerData.name.substring(0, 2).toUpperCase();
    }
  }

  // Get current year
  const year = new Date().getFullYear();

  // Get the highest roll number for this center this year
  const { data: lastStudent } = await supabase
    .from("students")
    .select("roll_number")
    .eq("center_id", centerId)
    .like("roll_number", `${prefix}-${year}-%`)
    .order("roll_number", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastStudent?.roll_number) {
    const match = lastStudent.roll_number.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${year}-${nextNumber.toString().padStart(3, "0")}`;
}

export async function searchStudents(
  query: string
): Promise<{ data: Student[] | null; error: string | null }> {
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

  // Search by name or roll number
  let searchQuery = supabase
    .from("students")
    .select("*")
    .or(`name.ilike.%${query}%,roll_number.ilike.%${query}%`)
    .order("name", { ascending: true })
    .limit(10);

  // Filter by center for non-admin users
  if (userData.role !== "ADMIN" && userData.center_id) {
    searchQuery = searchQuery.eq("center_id", userData.center_id);
  }

  const { data, error } = await searchQuery;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function assignStudentsToBatch(
  studentIds: string[],
  batchId: string
): Promise<{ data: { assigned: number } | null; error: string | null }> {
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

  if (userData.role !== "ADMIN" && userData.role !== "CENTRE_MANAGER") {
    return { data: null, error: "Not authorized" };
  }

  // Update students to assign them to the batch
  const { error } = await supabase
    .from("students")
    .update({ batch_id: batchId })
    .in("id", studentIds);

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/centre-manager/students");
  revalidatePath("/centre-manager/batches");
  
  return { data: { assigned: studentIds.length }, error: null };
}

export async function removeStudentFromBatch(
  studentId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("students")
    .update({ batch_id: null })
    .eq("id", studentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/centre-manager/students");
  revalidatePath("/centre-manager/batches");
  
  return { success: true, error: null };
}

export async function createStudentsBulk(
  students: BulkStudentInput[],
  centerId?: string // Optional center ID for Admin
): Promise<{ data: { created: number; failed: string[] } | null; error: string | null }> {
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

  if (userData.role !== "ADMIN" && userData.role !== "CENTRE_MANAGER") {
    return { data: null, error: "Not authorized" };
  }

  // Determine center_id based on role
  let targetCenterId: string;
  if (userData.role === "ADMIN") {
    if (!centerId) {
      return { data: null, error: "Center must be specified" };
    }
    targetCenterId = centerId;
  } else {
    if (!userData.center_id) {
      return { data: null, error: "User center not found" };
    }
    targetCenterId = userData.center_id;
  }

  const failed: string[] = [];
  let created = 0;

  for (const student of students) {
    if (!student.name.trim()) {
      failed.push(`Empty name provided`);
      continue;
    }

    try {
      // Generate roll number for each student
      const rollNumber = await generateRollNumber(supabase, targetCenterId);

      const insertData: any = {
        name: student.name.trim(),
        roll_number: rollNumber,
        center_id: targetCenterId,
      };

      if (student.batch_id) {
        insertData.batch_id = student.batch_id;
      }

      const { error } = await supabase.from("students").insert(insertData);

      if (error) {
        failed.push(`${student.name}: ${error.message}`);
      } else {
        created++;
      }
    } catch (err: any) {
      failed.push(`${student.name}: ${err.message}`);
    }
  }

  revalidatePath("/centre-manager/students");
  revalidatePath("/centre-manager/batches");
  revalidatePath("/admin/students");

  return {
    data: { created, failed },
    error: null,
  };
}

export async function createStudentsFromCsv(
  students: CsvStudentInput[]
): Promise<{ data: { created: number; failed: string[] } | null; error: string | null }> {
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

  if (userData.role !== "ADMIN" && userData.role !== "CENTRE_MANAGER") {
    return { data: null, error: "Not authorized" };
  }

  if (!userData.center_id) {
    return { data: null, error: "User center not found" };
  }

  const failed: string[] = [];
  let created = 0;

  for (const student of students) {
    if (!student.name.trim()) {
      failed.push(`Row with roll number ${student.roll_number}: Empty name`);
      continue;
    }

    if (!student.roll_number.trim()) {
      failed.push(`${student.name}: Empty roll number`);
      continue;
    }

    try {
      const insertData: any = {
        name: student.name.trim(),
        roll_number: student.roll_number.trim(),
        center_id: userData.center_id,
      };

      if (student.batch_id) {
        insertData.batch_id = student.batch_id;
      }

      const { error } = await supabase.from("students").insert(insertData);

      if (error) {
        if (error.code === "23505") {
          failed.push(`${student.name}: Roll number ${student.roll_number} already exists`);
        } else {
          failed.push(`${student.name}: ${error.message}`);
        }
      } else {
        created++;
      }
    } catch (err: any) {
      failed.push(`${student.name}: ${err.message}`);
    }
  }

  revalidatePath("/centre-manager/students");
  revalidatePath("/centre-manager/batches");

  return {
    data: { created, failed },
    error: null,
  };
}

