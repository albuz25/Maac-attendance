"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/loading-state";
import { BatchCard } from "@/components/attendance/batch-card";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getFacultyBatches, getAttendanceForDate } from "@/lib/actions/attendance";
import { getCurrentDayType, getDayName, formatDate } from "@/lib/utils";
import { Batch } from "@/lib/types";
import { format } from "date-fns";
import {
  Calendar,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";

export default function FacultyPage() {
  const [batches, setBatches] = useState<(Batch & { student_count?: number })[]>([]);
  const [todayBatches, setTodayBatches] = useState<(Batch & { student_count?: number; isMarked?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");
  const dayType = getCurrentDayType();
  const dayName = getDayName();

  const loadBatches = async () => {
    setIsLoading(true);
    const { data, error } = await getFacultyBatches();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
      setIsLoading(false);
      return;
    }

    if (data) {
      setBatches(data);

      // Filter batches for today
      const filtered = data.filter((batch) => batch.days === dayType);

      // Check which batches have been marked today
      const batchesWithStatus = await Promise.all(
        filtered.map(async (batch) => {
          const { data: attendance } = await getAttendanceForDate(batch.id, today);
          return {
            ...batch,
            isMarked: (attendance?.length || 0) > 0,
          };
        })
      );

      setTodayBatches(batchesWithStatus);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleBatchClick = (batch: Batch) => {
    setSelectedBatch(batch);
  };

  const handleBack = () => {
    setSelectedBatch(null);
    loadBatches(); // Refresh to update marked status
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Mark Attendance"
          description="Select a batch to mark attendance"
        />
        <CardSkeleton />
      </div>
    );
  }

  // Show attendance form if batch is selected
  if (selectedBatch) {
    return (
      <div>
        <AttendanceForm batch={selectedBatch} date={today} onBack={handleBack} />
      </div>
    );
  }

  // No batches assigned at all
  if (batches.length === 0) {
    return (
      <div>
        <PageHeader
          title="Mark Attendance"
          description="Select a batch to mark attendance"
        />
        <EmptyState
          icon={ClipboardCheck}
          title="No batches assigned"
          description="You don't have any batches assigned to you yet. Please contact your center manager."
        />
      </div>
    );
  }

  // It's Sunday - no classes
  if (!dayType) {
    return (
      <div>
        <PageHeader
          title="Mark Attendance"
          description="Select a batch to mark attendance"
        />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertCircle className="w-8 h-8 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">No Classes Today</h3>
              <p className="text-amber-700">
                Today is Sunday. There are no scheduled classes.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Your Assigned Batches</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <Card key={batch.id} className="opacity-60">
                <CardContent className="pt-6">
                  <h3 className="font-medium">{batch.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {batch.days === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"} | {batch.timing}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No batches for today's schedule
  if (todayBatches.length === 0) {
    return (
      <div>
        <PageHeader
          title="Mark Attendance"
          description="Select a batch to mark attendance"
        />
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-4 py-6">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">No Classes Today</h3>
              <p className="text-blue-700">
                Today is {dayName}. Your batches are scheduled for{" "}
                {dayType === "MWF" ? "Tuesday/Thursday/Saturday" : "Monday/Wednesday/Friday"}.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Your Batches (Other Days)</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch) => (
              <Card key={batch.id} className="opacity-60">
                <CardContent className="pt-6">
                  <h3 className="font-medium">{batch.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {batch.days === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"} | {batch.timing}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show today's batches
  const markedCount = todayBatches.filter((b) => b.isMarked).length;

  return (
    <div>
      <PageHeader
        title="Mark Attendance"
        description={`${dayName}, ${formatDate(today)}`}
      >
        <Badge variant={markedCount === todayBatches.length ? "success" : "secondary"}>
          {markedCount} / {todayBatches.length} marked
        </Badge>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {todayBatches.map((batch, index) => (
          <div
            key={batch.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <BatchCard
              batch={batch}
              isMarked={batch.isMarked}
              onClick={() => handleBatchClick(batch)}
            />
          </div>
        ))}
      </div>

      {batches.length > todayBatches.length && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            Other Batches (Not scheduled today)
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {batches
              .filter((b) => b.days !== dayType)
              .map((batch) => (
                <Card key={batch.id} className="opacity-50">
                  <CardContent className="pt-6">
                    <h3 className="font-medium">{batch.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {batch.days === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"} | {batch.timing}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

