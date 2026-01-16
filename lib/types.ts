// User roles enum
export type UserRole = "ADMIN" | "CENTRE_MANAGER" | "FACULTY";

// Batch schedule days
export type BatchDays = "MWF" | "TTS";

// Attendance status
export type AttendanceStatus = "Present" | "Absent";

// Database types
export interface Center {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  center_id: string;
  created_at: string;
  center?: Center;
}

export interface Batch {
  id: string;
  name: string;
  days: BatchDays;
  timing: string;
  faculty_id: string | null;
  center_id: string;
  created_at: string;
  faculty?: User;
  center?: Center;
  student_count?: number;
}

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  batch_id: string | null;
  center_id: string;
  created_at: string;
  batch?: Batch;
  center?: Center;
}

export interface Attendance {
  id: string;
  student_id: string;
  batch_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by_id: string;
  created_at: string;
  student?: Student;
  batch?: Batch;
  marked_by?: User;
}

// Form types
export interface CreateBatchInput {
  name: string;
  days: BatchDays;
  timing: string;
  faculty_id: string | null;
}

export interface CreateStudentInput {
  name: string;
  roll_number: string;
  batch_id?: string | null;
  center_id?: string; // Optional for Admin to specify center
}

// Bulk student input (without roll_number, will be auto-generated)
export interface BulkStudentInput {
  name: string;
  batch_id?: string | null;
  center_id?: string; // Optional for Admin to specify center
}

// CSV bulk student input (with roll_number from CSV)
export interface CsvStudentInput {
  roll_number: string;
  name: string;
  batch_id?: string | null;
}

export interface AttendanceInput {
  student_id: string;
  status: AttendanceStatus;
}

// Report types
export interface AttendanceReport {
  student_id: string;
  student_name: string;
  roll_number: string;
  batch_name: string;
  total_classes: number;
  present_count: number;
  absent_count: number;
  percentage: number;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

