"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  BookOpen,
  BarChart3,
  Filter,
  Building2,
  ArrowRight,
  Loader2,
  UserCog,
  TrendingUp,
} from "lucide-react";
import { getCentersWithStats } from "@/lib/actions/centers";
import { getUsersStats } from "@/lib/actions/users";

interface CenterWithStats {
  id: string;
  name: string;
  batch_count: number;
  student_count: number;
  manager_count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [centers, setCenters] = useState<CenterWithStats[]>([]);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [centersResult, usersResult] = await Promise.all([
        getCentersWithStats(),
        getUsersStats(),
      ]);

      if (centersResult.data) {
        setCenters(centersResult.data);
        setSelectedCenters(centersResult.data.map((c) => c.id));
      }

      if (usersResult.data) {
        setUserStats(usersResult.data);
      }

      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleCenterToggle = (centerId: string) => {
    setSelectedCenters((prev) => {
      if (prev.includes(centerId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== centerId);
      } else {
        return [...prev, centerId];
      }
    });
  };

  const selectAll = () => {
    setSelectedCenters(centers.map((c) => c.id));
  };

  const isAllSelected = selectedCenters.length === centers.length;

  // Calculate filtered stats
  const filteredCenters = centers.filter((c) => selectedCenters.includes(c.id));
  const totalBatches = filteredCenters.reduce((sum, c) => sum + c.batch_count, 0);
  const totalStudents = filteredCenters.reduce((sum, c) => sum + c.student_count, 0);
  const totalManagers = filteredCenters.reduce((sum, c) => sum + c.manager_count, 0);

  const selectedCenterNames = filteredCenters.map((c) => c.name);

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Admin Dashboard"
          description="Overview of all centers and system management"
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
        title="Admin Dashboard"
        description="Overview of all centers and system management"
      />

      {/* Center Filter */}
      {centers.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filter by Center</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              {centers.map((center) => (
                <div key={center.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={center.id}
                    checked={selectedCenters.includes(center.id)}
                    onCheckedChange={() => handleCenterToggle(center.id)}
                  />
                  <Label
                    htmlFor={center.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {center.name}
                  </Label>
                </div>
              ))}
              <div className="h-6 w-px bg-border mx-2" />
              <button
                onClick={selectAll}
                className={`text-sm font-medium ${
                  isAllSelected
                    ? "text-muted-foreground"
                    : "text-primary hover:underline cursor-pointer"
                }`}
                disabled={isAllSelected}
              >
                Select All
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Showing stats for: {selectedCenterNames.join(", ") || "No centers selected"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Centers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedCenters.length}</div>
            <p className="text-xs text-muted-foreground">of {centers.length} centers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userStats?.admins || 0} Admins, {userStats?.centre_managers || 0} Managers, {userStats?.faculty || 0} Faculty
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBatches}</div>
            <p className="text-xs text-muted-foreground">In selected centers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>
      </div>

      {/* Center Overview */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Centers Overview</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/centers")}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {centers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No centers created yet
              </p>
            ) : (
              <div className="space-y-4">
                {centers.map((center) => (
                  <div
                    key={center.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{center.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {center.batch_count} batches · {center.student_count} students
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{center.manager_count} managers</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Statistics</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/users")}
              >
                Manage Users
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <Users className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Administrators</p>
                    <p className="text-xs text-muted-foreground">Full system access</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">
                  {userStats?.admins || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <UserCog className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Centre Managers</p>
                    <p className="text-xs text-muted-foreground">Manage assigned centers</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {userStats?.centre_managers || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <GraduationCap className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Faculty</p>
                    <p className="text-xs text-muted-foreground">Teaching staff</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {userStats?.faculty || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push("/admin/centers")}
            >
              <Building2 className="h-6 w-6" />
              <span>Manage Centers</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push("/admin/users")}
            >
              <Users className="h-6 w-6" />
              <span>Manage Users</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => router.push("/admin/reports")}
            >
              <TrendingUp className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
