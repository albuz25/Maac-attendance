"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { getCenters } from "@/lib/actions/centers";
import { getCentreWiseReport, getFacultyWiseReport } from "@/lib/actions/reports";
import { Center } from "@/lib/types";
import {
  Building2,
  Users,
  Calendar,
  Clock,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  User,
  BookOpen,
  AlertCircle,
} from "lucide-react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("centre");
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [centreReport, setCentreReport] = useState<any[]>([]);
  const [facultyReport, setFacultyReport] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();

  // Load centers on mount
  useEffect(() => {
    async function loadCenters() {
      const { data, error } = await getCenters();
      if (data && data.length > 0) {
        setCenters(data);
        setSelectedCenterId(data[0].id);
      }
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
      }
      setIsInitialLoading(false);
    }
    loadCenters();
  }, []);

  // Load centre report when center or date changes
  useEffect(() => {
    if (activeTab === "centre" && selectedCenterId && selectedDate) {
      loadCentreReport();
    }
  }, [selectedCenterId, selectedDate, activeTab]);

  // Load faculty report when date changes
  useEffect(() => {
    if (activeTab === "faculty" && selectedDate) {
      loadFacultyReport();
    }
  }, [selectedDate, activeTab]);

  const loadCentreReport = async () => {
    if (!selectedCenterId) return;
    setIsLoading(true);
    const { data, error } = await getCentreWiseReport(selectedCenterId, selectedDate);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else if (data) {
      setCentreReport(data);
    }
    setIsLoading(false);
  };

  const loadFacultyReport = async () => {
    setIsLoading(true);
    const { data, error } = await getFacultyWiseReport(selectedDate);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else if (data) {
      setFacultyReport(data);
    }
    setIsLoading(false);
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getScheduleType = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    if ([1, 3, 5].includes(day)) return "MWF";
    if ([2, 4, 6].includes(day)) return "TTS";
    return "Sunday (No Classes)";
  };

  const selectedCenterName = centers.find((c) => c.id === selectedCenterId)?.name || "";

  // Calculate totals for centre report
  const centreTotals = {
    batches: centreReport.length,
    students: centreReport.reduce((sum, b) => sum + b.total_students, 0),
    present: centreReport.reduce((sum, b) => sum + b.present_students, 0),
  };

  // Calculate totals for faculty report
  const facultyTotals = {
    faculty: facultyReport.length,
    batches: facultyReport.reduce((sum, f) => sum + f.total_batches, 0),
    students: facultyReport.reduce((sum, f) => sum + f.total_students, 0),
    present: facultyReport.reduce((sum, f) => sum + f.total_present, 0),
  };

  if (isInitialLoading) {
    return (
      <div>
        <PageHeader
          title="Reports"
          description="View attendance reports by centre or faculty"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="View attendance reports by centre or faculty"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="centre" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Centre-wise Reports
          </TabsTrigger>
          <TabsTrigger value="faculty" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Faculty-wise Reports
          </TabsTrigger>
        </TabsList>

        {/* Centre-wise Reports */}
        <TabsContent value="centre">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Report Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label>Select Centre</Label>
                  <Select
                    value={selectedCenterId}
                    onValueChange={setSelectedCenterId}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select centre" />
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
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day Info</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge variant="outline">{getDayName(selectedDate)}</Badge>
                    <Badge variant="secondary">{getScheduleType(selectedDate)}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Centre Report Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{centreTotals.batches}</div>
                <p className="text-xs text-muted-foreground">Scheduled for this day</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{centreTotals.students}</div>
                <p className="text-xs text-muted-foreground">Across all batches</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {centreTotals.present}
                  <span className="text-lg text-muted-foreground">/{centreTotals.students}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {centreTotals.students > 0
                    ? `${((centreTotals.present / centreTotals.students) * 100).toFixed(1)}% attendance`
                    : "No students"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Centre Report Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedCenterName} - {getDayName(selectedDate)} Report
              </CardTitle>
              <CardDescription>
                All batches scheduled on {new Date(selectedDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : centreReport.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No batches scheduled</h3>
                  <p className="text-muted-foreground">
                    {getScheduleType(selectedDate) === "Sunday (No Classes)"
                      ? "No classes on Sunday"
                      : `No ${getScheduleType(selectedDate)} batches at this centre`}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Name</TableHead>
                      <TableHead>Timing</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead className="text-center">Total Students</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centreReport.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.name}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {batch.timing}
                          </span>
                        </TableCell>
                        <TableCell>
                          {batch.faculty?.full_name || (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{batch.total_students}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {batch.attendance_marked ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {batch.present_students}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {batch.attendance_marked ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Marked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Faculty-wise Reports */}
        <TabsContent value="faculty">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Report Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Day Info</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge variant="outline">{getDayName(selectedDate)}</Badge>
                    <Badge variant="secondary">{getScheduleType(selectedDate)}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Faculty Report Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Faculty</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{facultyTotals.faculty}</div>
                <p className="text-xs text-muted-foreground">With batches today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{facultyTotals.batches}</div>
                <p className="text-xs text-muted-foreground">Scheduled today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{facultyTotals.students}</div>
                <p className="text-xs text-muted-foreground">Across all batches</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {facultyTotals.present}
                  <span className="text-lg text-muted-foreground">/{facultyTotals.students}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {facultyTotals.students > 0
                    ? `${((facultyTotals.present / facultyTotals.students) * 100).toFixed(1)}% attendance`
                    : "No students"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Faculty Report Content */}
          <Card>
            <CardHeader>
              <CardTitle>Faculty Report - {getDayName(selectedDate)}</CardTitle>
              <CardDescription>
                All faculty batches on {new Date(selectedDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : facultyReport.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No faculty batches scheduled</h3>
                  <p className="text-muted-foreground">
                    {getScheduleType(selectedDate) === "Sunday (No Classes)"
                      ? "No classes on Sunday"
                      : `No ${getScheduleType(selectedDate)} batches assigned to faculty`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {facultyReport.map((faculty) => (
                    <div key={faculty.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100">
                            <User className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{faculty.full_name}</h3>
                            <p className="text-sm text-muted-foreground">{faculty.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-bold text-lg">{faculty.total_batches}</p>
                            <p className="text-muted-foreground">Batches</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-lg">{faculty.total_students}</p>
                            <p className="text-muted-foreground">Students</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-lg text-green-600">
                              {faculty.total_present}
                            </p>
                            <p className="text-muted-foreground">Present</p>
                          </div>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batch</TableHead>
                            <TableHead>Centre</TableHead>
                            <TableHead>Timing</TableHead>
                            <TableHead className="text-center">Students</TableHead>
                            <TableHead className="text-center">Present</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {faculty.batches.map((batch: any) => (
                            <TableRow key={batch.id}>
                              <TableCell className="font-medium">{batch.name}</TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-muted-foreground" />
                                  {batch.center?.name || "Unknown"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {batch.timing}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{batch.total_students}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {batch.attendance_marked ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    {batch.present_students}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {batch.attendance_marked ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Marked
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

