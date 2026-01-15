"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Batch, Student, AttendanceInput, AttendanceStatus } from "@/lib/types";
import { getBatchStudents, getAttendanceForDate, markAttendance } from "@/lib/actions/attendance";
import { formatDate } from "@/lib/utils";
import { Loader2, ArrowLeft, Users, CheckCircle, XCircle, Save } from "lucide-react";

interface AttendanceFormProps {
  batch: Batch;
  date: string;
  onBack: () => void;
}

interface StudentAttendance {
  student: Student;
  status: AttendanceStatus;
}

export function AttendanceForm({ batch, date, onBack }: AttendanceFormProps) {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      // Load students
      const studentsResult = await getBatchStudents(batch.id);
      if (studentsResult.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: studentsResult.error,
        });
        setIsLoading(false);
        return;
      }

      // Load existing attendance
      const attendanceResult = await getAttendanceForDate(batch.id, date);

      // Map students with attendance status
      const studentList = studentsResult.data || [];
      const existingAttendance = attendanceResult.data || [];

      setHasExisting(existingAttendance.length > 0);

      const mappedStudents: StudentAttendance[] = studentList.map((student) => {
        const existing = existingAttendance.find((a) => a.student_id === student.id);
        return {
          student,
          status: existing ? existing.status : "Present", // Default to Present
        };
      });

      setStudents(mappedStudents);
      setIsLoading(false);
    }

    loadData();
  }, [batch.id, date]);

  const toggleStatus = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student.id === studentId
          ? { ...s, status: s.status === "Present" ? "Absent" : "Present" }
          : s
      )
    );
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "Present" })));
  };

  const markAllAbsent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "Absent" })));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    
    // Show immediate feedback
    toast({
      title: "Saving attendance...",
      description: `${presentCount} present, ${absentCount} absent`,
    });

    const records: AttendanceInput[] = students.map((s) => ({
      student_id: s.student.id,
      status: s.status,
    }));

    const result = await markAttendance(batch.id, date, records);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
      toast({
        variant: "default",
        title: "✓ Attendance saved",
        description: `${batch.name}: ${presentCount} present, ${absentCount} absent`,
      });
      setHasExisting(true);
    }

    setIsSaving(false);
  };

  const presentCount = students.filter((s) => s.status === "Present").length;
  const absentCount = students.filter((s) => s.status === "Absent").length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <CardTitle>{batch.name}</CardTitle>
            <CardDescription>
              {formatDate(date)} | {batch.timing}
            </CardDescription>
          </div>
          {hasExisting && (
            <Badge variant="secondary">Previously saved</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary and quick actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {students.length} students
            </span>
            <span className="flex items-center gap-2 text-success">
              <CheckCircle className="w-4 h-4" />
              {presentCount} present
            </span>
            <span className="flex items-center gap-2 text-destructive">
              <XCircle className="w-4 h-4" />
              {absentCount} absent
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              All Present
            </Button>
            <Button variant="outline" size="sm" onClick={markAllAbsent}>
              All Absent
            </Button>
          </div>
        </div>

        {/* Student list */}
        {students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No students in this batch
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((item, index) => (
              <div
                key={item.student.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground font-mono w-20">
                    {item.student.roll_number}
                  </span>
                  <span className="font-medium">{item.student.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor={`status-${item.student.id}`}
                    className={item.status === "Present" ? "text-success" : "text-destructive"}
                  >
                    {item.status}
                  </Label>
                  <Switch
                    id={`status-${item.student.id}`}
                    checked={item.status === "Present"}
                    onCheckedChange={() => toggleStatus(item.student.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-muted/30 sticky bottom-0">
        <div className="flex items-center justify-between w-full pt-4">
          <p className="text-sm text-muted-foreground">
            {presentCount} of {students.length} present ({Math.round((presentCount / students.length) * 100) || 0}%)
          </p>
          <Button onClick={handleSubmit} disabled={isSaving || students.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Attendance
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

