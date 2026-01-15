"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Batch } from "@/lib/types";
import { Users, Clock, Calendar, ChevronRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchCardProps {
  batch: Batch & { student_count?: number };
  isMarked?: boolean;
  onClick: () => void;
  className?: string;
}

export function BatchCard({ batch, isMarked, onClick, className }: BatchCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isMarked && "border-success/50 bg-success/5",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold">{batch.name}</CardTitle>
          {isMarked && (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Marked
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {batch.timing}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {batch.days === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm">
            <Users className="w-4 h-4" />
            {batch.student_count || 0} students
          </span>
          <Button variant="ghost" size="sm" className="gap-1">
            {isMarked ? "View" : "Mark Attendance"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

