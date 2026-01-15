"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { TableSkeleton } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { getBatchAttendanceReport } from "@/lib/actions/attendance";
import { format } from "date-fns";
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  BookOpen,
  User,
  Calendar,
  Clock,
} from "lucide-react";

interface BatchDayReport {
  batch_id: string;
  batch_name: string;
  timing: string;
  days: string;
  faculty_name: string | null;
  date: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export default function ReportsPage() {
  const [report, setReport] = useState<BatchDayReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    const { data, error } = await getBatchAttendanceReport(selectedDate);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else if (data) {
      setReport(data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Calculate summary stats
  const totalBatches = report.length;
  const totalStudents = report.reduce((sum, r) => sum + r.total_students, 0);
  const totalPresent = report.reduce((sum, r) => sum + r.present_count, 0);
  const avgAttendance =
    totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
  const batchesWithLowAttendance = report.filter((r) => r.attendance_percentage < 75).length;

  // Get day info
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getScheduleType = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    if ([1, 3, 5].includes(day)) return "MWF";
    if ([2, 4, 6].includes(day)) return "TTS";
    return "Sunday";
  };

  const getAttendanceBadge = (percentage: number) => {
    if (percentage >= 75) {
      return <Badge className="bg-green-100 text-green-800">{percentage}%</Badge>;
    } else if (percentage >= 50) {
      return <Badge variant="secondary">{percentage}%</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">{percentage}%</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Daily Attendance Report"
          description="View batch-wise attendance for any day"
        />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Daily Attendance Report"
        description="View batch-wise attendance for any day"
      />

      {/* Date Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {getDayName(selectedDate)}
              </Badge>
              <Badge variant="secondary">{getScheduleType(selectedDate)}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - Square Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="flex flex-col items-center justify-center p-4 bg-white border rounded-xl aspect-square max-h-28">
          <BookOpen className="h-6 w-6 text-blue-500 mb-2" />
          <span className="text-2xl font-bold">{totalBatches}</span>
          <span className="text-xs text-muted-foreground">Batches</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 bg-white border rounded-xl aspect-square max-h-28">
          <Users className="h-6 w-6 text-purple-500 mb-2" />
          <span className="text-2xl font-bold">{totalStudents}</span>
          <span className="text-xs text-muted-foreground">Students</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-200 rounded-xl aspect-square max-h-28">
          <CheckCircle2 className="h-6 w-6 text-green-500 mb-2" />
          <span className="text-2xl font-bold text-green-700">
            {totalPresent}<span className="text-base text-green-600">/{totalStudents}</span>
          </span>
          <span className="text-xs text-green-600">{avgAttendance}% Present</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 bg-red-50 border border-red-200 rounded-xl aspect-square max-h-28">
          <XCircle className="h-6 w-6 text-red-500 mb-2" />
          <span className="text-2xl font-bold text-red-700">{batchesWithLowAttendance}</span>
          <span className="text-xs text-red-600">Below 75%</span>
        </div>
      </div>

      {getScheduleType(selectedDate) === "Sunday" ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-6">
            <Calendar className="w-8 h-8 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">No Classes on Sunday</h3>
              <p className="text-amber-700">
                Please select a weekday to view attendance.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : report.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No attendance data"
          description={`No batches scheduled or attendance not marked for ${getDayName(selectedDate)}.`}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Batch-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead className="text-center">Total Students</TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Present
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" />
                      Absent
                    </span>
                  </TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((row) => (
                  <TableRow key={row.batch_id}>
                    <TableCell>
                      <div className="font-medium">{row.batch_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.days === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {row.timing}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.faculty_name ? (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {row.faculty_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{row.total_students}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.present_count > 0 ? (
                        <span className="font-medium text-green-600">{row.present_count}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.absent_count > 0 ? (
                        <span className="font-medium text-red-600">{row.absent_count}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.present_count > 0 || row.absent_count > 0 ? (
                        getAttendanceBadge(row.attendance_percentage)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.present_count > 0 || row.absent_count > 0 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Marked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {report.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          Showing {report.length} batch(es) for {getDayName(selectedDate)}
        </p>
      )}
    </div>
  );
}
