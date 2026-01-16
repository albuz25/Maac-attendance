"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/components/ui/use-toast";
import { Batch, CreateBatchInput, BatchDays } from "@/lib/types";
import { createBatch, updateBatch, getFacultyList } from "@/lib/actions/batches";
import { mutate } from "swr";
import { Loader2 } from "lucide-react";

interface BatchFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch | null;
  onSuccess?: () => void;
}

export function BatchForm({ open, onOpenChange, batch, onSuccess }: BatchFormProps) {
  const [name, setName] = useState("");
  const [days, setDays] = useState<BatchDays>("MWF");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");
  const [facultyId, setFacultyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [faculty, setFaculty] = useState<any[]>([]);
  const { toast } = useToast();

  const isEditing = !!batch;

  useEffect(() => {
    if (batch) {
      setName(batch.name);
      setDays(batch.days);
      // Parse existing times or use defaults
      setStartTime(batch.start_time || "10:00");
      setEndTime(batch.end_time || "11:30");
      setFacultyId(batch.faculty_id || "");
    } else {
      setName("");
      setDays("MWF");
      setStartTime("10:00");
      setEndTime("11:30");
      setFacultyId("");
    }
  }, [batch, open]);

  useEffect(() => {
    async function loadFaculty() {
      const { data } = await getFacultyList();
      if (data) {
        setFaculty(data);
      }
    }
    if (open) {
      loadFaculty();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const input: CreateBatchInput = {
      name,
      days,
      start_time: startTime,
      end_time: endTime,
      faculty_id: facultyId || null,
    };

    const batchName = name;

    try {
      const result = isEditing
        ? await updateBatch(batch!.id, input)
        : await createBatch(input);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        setIsLoading(false);
        return;
      }

      // Close dialog
      onOpenChange(false);

      toast({
        title: isEditing ? "Batch updated" : "Batch created",
        description: `${batchName} has been ${isEditing ? "updated" : "created"} successfully.`,
      });

      // Revalidate batches data immediately
      await mutate("batches");
      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Batch" : "Create New Batch"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the batch details below."
                : "Fill in the details to create a new batch."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name</Label>
              <Input
                id="name"
                placeholder="e.g., Morning Batch A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Schedule</Label>
              <Select value={days} onValueChange={(v) => setDays(v as BatchDays)} disabled={isLoading}>
                <SelectTrigger id="days">
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MWF">Mon / Wed / Fri (MWF)</SelectItem>
                  <SelectItem value="TTS">Tue / Thu / Sat (TTS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faculty">Assign Faculty</Label>
              <Select value={facultyId || "none"} onValueChange={(v) => setFacultyId(v === "none" ? "" : v)} disabled={isLoading}>
                <SelectTrigger id="faculty">
                  <SelectValue placeholder="Select faculty (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No faculty assigned</SelectItem>
                  {faculty.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Batch"
              ) : (
                "Create Batch"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

