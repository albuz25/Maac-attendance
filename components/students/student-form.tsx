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
import { Student, CreateStudentInput, Batch } from "@/lib/types";
import { createStudent, updateStudent } from "@/lib/actions/students";
import { getBatches } from "@/lib/actions/batches";
import { Loader2 } from "lucide-react";

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  defaultBatchId?: string;
  onSuccess?: () => void;
}

export function StudentForm({
  open,
  onOpenChange,
  student,
  defaultBatchId,
  onSuccess,
}: StudentFormProps) {
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [batchId, setBatchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const { toast } = useToast();

  const isEditing = !!student;

  useEffect(() => {
    if (student) {
      setName(student.name);
      setRollNumber(student.roll_number);
      setBatchId(student.batch_id || "");
    } else {
      setName("");
      setRollNumber("");
      setBatchId(defaultBatchId || "");
    }
  }, [student, defaultBatchId, open]);

  useEffect(() => {
    async function loadBatches() {
      const { data } = await getBatches();
      if (data) {
        setBatches(data);
      }
    }
    if (open) {
      loadBatches();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const input: CreateStudentInput = {
      name,
      roll_number: rollNumber,
      batch_id: batchId && batchId !== "none" ? batchId : null,
    };

    // Optimistic: Close dialog immediately for better UX
    onOpenChange(false);
    
    toast({
      title: isEditing ? "Updating student..." : "Adding student...",
      description: "Please wait...",
    });

    try {
      const result = isEditing
        ? await updateStudent(student.id, input)
        : await createStudent(input);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: isEditing ? "Student updated" : "Student added",
        description: `${name} has been ${isEditing ? "updated" : "added"} successfully.`,
      });

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
            <DialogTitle>{isEditing ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the student details below."
                : "Fill in the details to add a new student."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Student Name</Label>
              <Input
                id="name"
                placeholder="Enter student name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollNumber">Roll Number</Label>
              <Input
                id="rollNumber"
                placeholder="e.g., GN-2024-001"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch">Batch (Optional)</Label>
              <Select value={batchId} onValueChange={setBatchId} disabled={isLoading}>
                <SelectTrigger id="batch">
                  <SelectValue placeholder="Select batch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Batch Assigned</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} ({batch.days})
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
                  {isEditing ? "Updating..." : "Adding..."}
                </>
              ) : isEditing ? (
                "Update Student"
              ) : (
                "Add Student"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

