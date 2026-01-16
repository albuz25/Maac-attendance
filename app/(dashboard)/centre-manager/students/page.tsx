"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { StudentForm } from "@/components/students/student-form";
import { BulkUploadForm } from "@/components/students/bulk-upload-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { deleteStudent } from "@/lib/actions/students";
import { useStudents, useBatches, mutate } from "@/lib/hooks/use-data";
import { Student } from "@/lib/types";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  BookOpen,
  Upload,
} from "lucide-react";

export default function StudentsPage() {
  // Use SWR for data fetching with caching
  const { data: students = [], isLoading: studentsLoading, error: studentsError } = useStudents();
  const { data: batches = [], isLoading: batchesLoading } = useBatches();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const { toast } = useToast();

  const isLoading = studentsLoading || batchesLoading;

  // Refresh data function
  const refreshData = () => {
    mutate(["students", undefined]);
    mutate("batches");
  };

  // Show error toast if loading failed
  useEffect(() => {
    if (studentsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load students",
      });
    }
  }, [studentsError, toast]);

  // Memoized filtered students for better performance
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by batch
    if (selectedBatchFilter === "unassigned") {
      filtered = filtered.filter((s) => !s.batch_id);
    } else if (selectedBatchFilter !== "all") {
      filtered = filtered.filter((s) => s.batch_id === selectedBatchFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [searchQuery, selectedBatchFilter, students]);

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormOpen(true);
  };

  const handleDelete = async () => {
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
        description: `${studentToDelete.name} has been removed.`,
      });
      refreshData();
    }
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setSelectedStudent(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Students"
          description="Manage students and their batch assignments"
        />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage students and their batch assignments"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkFormOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Add
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </PageHeader>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Add your first student to start tracking attendance."
        >
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkFormOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Add
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </div>
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedBatchFilter} onValueChange={setSelectedBatchFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="unassigned">Not Assigned to Batch</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">
                        {student.roll_number}
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        {student.batch_id && (student.batch as any)?.name ? (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {(student.batch as any).name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Not Assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.batch_id && (student.batch as any)?.days ? (
                          <Badge variant="secondary">
                            {(student.batch as any).days === "MWF"
                              ? "Mon/Wed/Fri"
                              : "Tue/Thu/Sat"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(student)}>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        </>
      )}

      <StudentForm
        open={formOpen}
        onOpenChange={handleFormClose}
        student={selectedStudent}
        onSuccess={refreshData}
      />

      <BulkUploadForm
        open={bulkFormOpen}
        onOpenChange={setBulkFormOpen}
        onSuccess={refreshData}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{studentToDelete?.name}"? This will
              also delete all attendance records for this student. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

