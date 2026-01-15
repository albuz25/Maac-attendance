"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { StudentForm } from "@/components/students/student-form";
import { BulkUploadForm } from "@/components/students/bulk-upload-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  User,
  BookOpen,
  BarChart3,
  Plus,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  GraduationCap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getBatchDetails } from "@/lib/actions/batches";
import { deleteStudent } from "@/lib/actions/students";
import { Batch, Student } from "@/lib/types";

interface StudentWithAttendance extends Student {
  attendance_status: "Present" | "Absent" | null;
}

interface BatchDetails extends Batch {
  students: StudentWithAttendance[];
  lectures_completed: number;
  average_attendance: number;
  present_today: number;
  attendance_marked_today: boolean;
  selected_date: string;
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const { toast } = useToast();

  const loadBatchDetails = async (date?: string) => {
    setIsLoading(true);
    const { data, error } = await getBatchDetails(batchId, date || selectedDate);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else if (data) {
      setBatch(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadBatchDetails();
  }, [batchId]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    loadBatchDetails(newDate);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentFormOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    const { error } = await deleteStudent(studentToDelete.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      toast({
        title: "Student removed",
        description: `${studentToDelete.name} has been removed from this batch.`,
      });
      loadBatchDetails();
    }
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  const handleStudentFormClose = (open: boolean) => {
    setStudentFormOpen(open);
    if (!open) {
      setSelectedStudent(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Batch not found</h2>
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{batch.name}</h1>
            <p className="text-muted-foreground">Batch details and student management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkFormOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Add
          </Button>
          <Button onClick={() => setStudentFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Batch Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schedule</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {batch.days === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <Badge variant="secondary">{batch.days}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.timing}</div>
            <p className="text-xs text-muted-foreground mt-1">Class hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faculty</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(batch.faculty as any)?.full_name || "Not Assigned"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Assigned instructor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batch.students?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled students</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Selector & Stats Row */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="date">View Attendance For</Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present on Date</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {batch.attendance_marked_today ? (
                <span>
                  {batch.present_today}
                  <span className="text-lg text-muted-foreground">
                    /{batch.students?.length || 0}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground text-xl">Not marked</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {batch.attendance_marked_today
                ? "Students attended"
                : "Attendance not taken"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lectures Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{batch.lectures_completed || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total classes conducted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {batch.average_attendance !== undefined
                ? `${batch.average_attendance.toFixed(1)}%`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Batch attendance rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Students ({batch.students?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!batch.students || batch.students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No students in this batch</h3>
              <p className="text-muted-foreground mb-4">
                Add students to start tracking attendance
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setBulkFormOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Add
                </Button>
                <Button onClick={() => setStudentFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.students.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {student.roll_number}
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-center">
                      {student.attendance_status === "Present" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Present
                        </Badge>
                      ) : student.attendance_status === "Absent" ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          <XCircle className="w-3 h-3 mr-1" />
                          Absent
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          —
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(student.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setStudentToDelete(student);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Student Form Dialog */}
      <StudentForm
        open={studentFormOpen}
        onOpenChange={handleStudentFormClose}
        student={selectedStudent}
        defaultBatchId={batchId}
        onSuccess={loadBatchDetails}
      />

      {/* Bulk Upload Form */}
      <BulkUploadForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
        defaultBatchId={batchId}
        onSuccess={loadBatchDetails}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{studentToDelete?.name}" from this
              batch? This will also delete all attendance records for this student.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStudent}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

