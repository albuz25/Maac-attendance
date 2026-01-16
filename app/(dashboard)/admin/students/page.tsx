"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Calendar,
  Building2,
  CheckCircle2,
  Plus,
  Upload,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createStudent, createStudentsBulk } from "@/lib/actions/students";

interface CenterStats {
  id: string;
  name: string;
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  assignedToBatches: number;
  unassigned: number;
  totalBatches: number;
  batchesToday: number;
}

interface StudentWithDetails {
  id: string;
  name: string;
  roll_number: string;
  batch_id: string | null;
  center_id: string;
  created_at: string;
  batch?: { name: string; days: string } | null;
  center?: { name: string } | null;
  attendance_status?: "Present" | "Absent" | null;
}

interface Center {
  id: string;
  name: string;
}

export default function AdminStudentsPage() {
  const [centerStats, setCenterStats] = useState<CenterStats[]>([]);
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCenter, setSelectedCenter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Add student dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentRollNumber, setNewStudentRollNumber] = useState("");
  const [newStudentCenter, setNewStudentCenter] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  // Bulk add state
  const [bulkNames, setBulkNames] = useState("");
  const [bulkCenter, setBulkCenter] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  
  const { toast } = useToast();

  const supabase = createClient();

  const loadData = async () => {
    setIsLoading(true);

    try {
      // Fetch all centers
      const { data: centersData } = await supabase
        .from("centers")
        .select("id, name")
        .order("name");

      if (!centersData) {
        setIsLoading(false);
        return;
      }
      
      setCenters(centersData);

      // Fetch all students with batch and center info
      const { data: allStudents } = await supabase
        .from("students")
        .select(`
          id,
          name,
          roll_number,
          batch_id,
          center_id,
          created_at,
          batch:batches(name, days),
          center:centers(name)
        `)
        .order("name");

      // Fetch attendance for the selected date
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("date", selectedDate);

      // Create attendance map
      const attendanceMap = new Map<string, "Present" | "Absent">();
      attendanceData?.forEach((a) => {
        attendanceMap.set(a.student_id, a.status as "Present" | "Absent");
      });

      // Add attendance status to students
      const studentsWithAttendance: StudentWithDetails[] = (allStudents || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        roll_number: s.roll_number,
        batch_id: s.batch_id,
        center_id: s.center_id,
        created_at: s.created_at,
        batch: Array.isArray(s.batch) ? s.batch[0] : s.batch,
        center: Array.isArray(s.center) ? s.center[0] : s.center,
        attendance_status: attendanceMap.get(s.id) || null,
      }));

      setStudents(studentsWithAttendance);

      // Fetch all batches
      const { data: allBatches } = await supabase
        .from("batches")
        .select("id, center_id, days");

      // Calculate day of week for selected date
      const selectedDay = new Date(selectedDate).getDay();
      const isMWF = [1, 3, 5].includes(selectedDay); // Mon, Wed, Fri
      const isTTS = [2, 4, 6].includes(selectedDay); // Tue, Thu, Sat

      // Calculate stats for each center
      const stats: CenterStats[] = centersData.map((center) => {
        const centerStudents = studentsWithAttendance.filter(
          (s) => s.center_id === center.id
        );
        const centerBatches = allBatches?.filter((b) => b.center_id === center.id) || [];

        const presentToday = centerStudents.filter(
          (s) => s.attendance_status === "Present"
        ).length;
        const absentToday = centerStudents.filter(
          (s) => s.attendance_status === "Absent"
        ).length;
        const assignedToBatches = centerStudents.filter((s) => s.batch_id).length;
        const unassigned = centerStudents.filter((s) => !s.batch_id).length;

        // Count batches scheduled for today
        const batchesToday = centerBatches.filter((b) => {
          if (isMWF && b.days === "MWF") return true;
          if (isTTS && b.days === "TTS") return true;
          return false;
        }).length;

        return {
          id: center.id,
          name: center.name,
          totalStudents: centerStudents.length,
          presentToday,
          absentToday,
          assignedToBatches,
          unassigned,
          totalBatches: centerBatches.length,
          batchesToday,
        };
      });

      setCenterStats(stats);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data",
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentCenter) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a center",
      });
      return;
    }
    
    setIsAdding(true);
    setAddDialogOpen(false);
    
    toast({
      title: "Adding student...",
      description: "Please wait...",
    });
    
    const { data, error } = await createStudent({
      name: newStudentName,
      roll_number: newStudentRollNumber,
      center_id: newStudentCenter,
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      toast({
        title: "Student added",
        description: `${newStudentName} has been added successfully.`,
      });
      setNewStudentName("");
      setNewStudentRollNumber("");
      setNewStudentCenter("");
      loadData();
    }
    
    setIsAdding(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkCenter) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a center",
      });
      return;
    }
    
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    
    if (names.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least one student name",
      });
      return;
    }
    
    setIsBulkAdding(true);
    setBulkDialogOpen(false);
    
    toast({
      title: "Adding students...",
      description: `Adding ${names.length} students...`,
    });
    
    const students = names.map((name) => ({ name }));
    const { data, error } = await createStudentsBulk(students, bulkCenter);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else if (data) {
      toast({
        title: "Students added",
        description: `${data.created} students added successfully.${data.failed.length > 0 ? ` ${data.failed.length} failed.` : ""}`,
      });
      setBulkNames("");
      setBulkCenter("");
      loadData();
    }
    
    setIsBulkAdding(false);
  };

  // Filter students based on selected center and search query
  const filteredStudents = students.filter((student) => {
    const matchesCenter =
      selectedCenter === "all" || student.center_id === selectedCenter;
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCenter && matchesSearch;
  });

  // Calculate totals
  const totals = centerStats.reduce(
    (acc, center) => ({
      totalStudents: acc.totalStudents + center.totalStudents,
      presentToday: acc.presentToday + center.presentToday,
      assignedToBatches: acc.assignedToBatches + center.assignedToBatches,
      batchesToday: acc.batchesToday + center.batchesToday,
    }),
    { totalStudents: 0, presentToday: 0, assignedToBatches: 0, batchesToday: 0 }
  );

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Students"
          description="View student statistics across all centers"
        />
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

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage students across all centers"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Add
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </PageHeader>

      {/* Date Selector */}
      <div className="mb-6 flex items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Select Date</Label>
          <Input
            id="date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <div className="text-sm text-muted-foreground pb-2">
          {new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all centers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {totals.presentToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalStudents > 0
                ? `${((totals.presentToday / totals.totalStudents) * 100).toFixed(1)}% attendance`
                : "No students"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned to Batches</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {totals.assignedToBatches}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.totalStudents > 0
                ? `${((totals.assignedToBatches / totals.totalStudents) * 100).toFixed(1)}% assigned`
                : "No students"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batches Today</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {totals.batchesToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled for today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Center-wise Stats Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Center-wise Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center</TableHead>
                <TableHead className="text-center">Total Students</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center">Assigned to Batches</TableHead>
                <TableHead className="text-center">Unassigned</TableHead>
                <TableHead className="text-center">Total Batches</TableHead>
                <TableHead className="text-center">Batches Today</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centerStats.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{center.totalStudents}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      {center.presentToday}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      {center.absentToday}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {center.assignedToBatches}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{center.unassigned}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {center.totalBatches}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                      {center.batchesToday}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">{totals.totalStudents}</TableCell>
                <TableCell className="text-center">{totals.presentToday}</TableCell>
                <TableCell className="text-center">
                  {centerStats.reduce((sum, c) => sum + c.absentToday, 0)}
                </TableCell>
                <TableCell className="text-center">{totals.assignedToBatches}</TableCell>
                <TableCell className="text-center">
                  {centerStats.reduce((sum, c) => sum + c.unassigned, 0)}
                </TableCell>
                <TableCell className="text-center">
                  {centerStats.reduce((sum, c) => sum + c.totalBatches, 0)}
                </TableCell>
                <TableCell className="text-center">{totals.batchesToday}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              All Students ({filteredStudents.length})
            </CardTitle>
            <div className="flex gap-2">
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {centerStats.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.roll_number}
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(student.center as any)?.name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.batch ? (
                          <Badge variant="secondary">
                            {(student.batch as any)?.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Not Assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.attendance_status === "Present" ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Present
                          </Badge>
                        ) : student.attendance_status === "Absent" ? (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                            <UserX className="w-3 h-3 mr-1" />
                            Absent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            —
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddStudent}>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Add a student to any center.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-center">Center *</Label>
                <Select value={newStudentCenter} onValueChange={setNewStudentCenter}>
                  <SelectTrigger id="add-center">
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-name">Student Name *</Label>
                <Input
                  id="add-name"
                  placeholder="Enter student name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-roll">Roll Number *</Label>
                <Input
                  id="add-roll"
                  placeholder="e.g., GN-2026-001"
                  value={newStudentRollNumber}
                  onChange={(e) => setNewStudentRollNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Student"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Add Students</DialogTitle>
            <DialogDescription>
              Add multiple students to a center. Roll numbers will be auto-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-center">Center *</Label>
              <Select value={bulkCenter} onValueChange={setBulkCenter}>
                <SelectTrigger id="bulk-center">
                  <SelectValue placeholder="Select center" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-names">Student Names (one per line) *</Label>
              <Textarea
                id="bulk-names"
                placeholder="John Doe&#10;Jane Smith&#10;..."
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                {bulkNames.split("\n").filter((n) => n.trim()).length} names entered
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={isBulkAdding}>
              {isBulkAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Add Students
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

