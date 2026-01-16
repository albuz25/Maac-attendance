"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BatchData {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  timing: string;
  days: string;
  faculty_id: string | null;
  faculty_name: string | null;
  student_count: number;
  present_count: number;
  absent_count: number;
}

interface DaysheetProps {
  batches: BatchData[];
  facultyList: { id: string; name: string }[];
  selectedDate: string;
  dayType: "MWF" | "TTS" | null;
}

// Color palette for time slots (alternating row colors)
const rowColors = [
  "bg-blue-50",
  "bg-green-50",
  "bg-yellow-50",
  "bg-pink-50",
  "bg-purple-50",
  "bg-orange-50",
  "bg-cyan-50",
  "bg-gray-50",
];

export function Daysheet({ batches, facultyList, selectedDate, dayType }: DaysheetProps) {
  // Group batches by time slot
  const timeSlots = useMemo(() => {
    const slots = new Map<string, BatchData[]>();
    
    batches
      .filter(b => b.days === dayType)
      .forEach((batch) => {
        const timeKey = `${batch.start_time}-${batch.end_time}`;
        if (!slots.has(timeKey)) {
          slots.set(timeKey, []);
        }
        slots.get(timeKey)!.push(batch);
      });

    // Sort by start time
    return Array.from(slots.entries()).sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });
  }, [batches, dayType]);

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  if (!dayType) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No classes scheduled on Sundays
        </CardContent>
      </Card>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No batches scheduled for this day
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>
            Day Sheet - {dayType === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"}
          </span>
          <Badge variant="secondary">
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="p-3 text-left font-semibold border-r border-slate-200 min-w-[100px]">
                  Timing
                </th>
                {facultyList.map((faculty) => (
                  <th
                    key={faculty.id}
                    className="p-3 text-center font-semibold border-r border-slate-200 min-w-[150px]"
                  >
                    <span className="text-blue-600">{faculty.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(([timeKey, slotBatches], index) => {
                const [startTime, endTime] = timeKey.split("-");
                const rowColor = rowColors[index % rowColors.length];

                return (
                  <tr key={timeKey} className={cn("border-b", rowColor)}>
                    <td className="p-2 border-r border-slate-200 font-medium">
                      {formatTimeRange(startTime, endTime)}
                    </td>
                    {facultyList.map((faculty) => {
                      const batch = slotBatches.find(
                        (b) => b.faculty_id === faculty.id
                      );

                      if (!batch) {
                        return (
                          <td
                            key={faculty.id}
                            className="p-2 border-r border-slate-200 text-center text-muted-foreground"
                          >
                            —
                          </td>
                        );
                      }

                      return (
                        <td
                          key={faculty.id}
                          className="p-2 border-r border-slate-200"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800 truncate">
                              {batch.name}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <div className="text-slate-600">
                                Students: <span className="font-medium">{batch.student_count}</span>
                              </div>
                              <div className="text-green-600">
                                Present: <span className="font-medium">{batch.present_count}</span>
                              </div>
                              <div className="text-red-600">
                                Absent: <span className="font-medium">{batch.absent_count}</span>
                              </div>
                              {batch.student_count > 0 && (
                                <div className="text-slate-500">
                                  {Math.round((batch.present_count / batch.student_count) * 100)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

