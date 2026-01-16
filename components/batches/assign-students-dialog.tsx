"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Student } from "@/lib/types";
import { searchStudents, assignStudentsToBatch } from "@/lib/actions/students";
import {
  Search,
  Loader2,
  UserPlus,
  X,
  Check,
  Users,
} from "lucide-react";

interface AssignStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  batchName: string;
  existingStudentIds: string[];
  onSuccess?: () => void;
}

export function AssignStudentsDialog({
  open,
  onOpenChange,
  batchId,
  batchName,
  existingStudentIds,
  onSuccess,
}: AssignStudentsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await searchStudents(searchQuery);
      if (data) {
        // Filter out already assigned students and already selected ones
        const filtered = data.filter(
          (s) =>
            !existingStudentIds.includes(s.id) &&
            !selectedStudents.find((sel) => sel.id === s.id)
        );
        setSearchResults(filtered);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, existingStudentIds, selectedStudents]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedStudents([]);
    }
  }, [open]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudents((prev) => [...prev, student]);
    setSearchResults((prev) => prev.filter((s) => s.id !== student.id));
    setSearchQuery("");
  };

  const handleRemoveSelected = (studentId: string) => {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleAssign = async () => {
    if (selectedStudents.length === 0) return;

    setIsAssigning(true);
    
    toast({
      title: "Assigning students...",
      description: `Adding ${selectedStudents.length} student(s) to ${batchName}`,
    });

    const studentIds = selectedStudents.map((s) => s.id);
    const { error, data } = await assignStudentsToBatch(studentIds, batchId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
      setIsAssigning(false);
      return;
    }

    toast({
      title: "Students assigned",
      description: `${data?.assigned || selectedStudents.length} student(s) added to ${batchName}`,
    });

    onOpenChange(false);
    onSuccess?.();
    setIsAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Students to {batchName}</DialogTitle>
          <DialogDescription>
            Search for students by name or roll number and add them to this batch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label>Search Students</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type student name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg max-h-[200px] overflow-y-auto">
              {searchResults.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                  onClick={() => handleSelectStudent(student)}
                >
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {student.roll_number}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unassigned students found matching "{searchQuery}"
            </p>
          )}

          {/* Selected Students */}
          {selectedStudents.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Selected ({selectedStudents.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <Badge
                    key={student.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {student.name}
                    <button
                      onClick={() => handleRemoveSelected(student.id)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Hint */}
          {selectedStudents.length === 0 && !searchQuery && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Users className="h-4 w-4" />
              <span>Start typing to search for students to add to this batch</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning || selectedStudents.length === 0}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign {selectedStudents.length} Student(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

