"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Batch, BulkStudentInput } from "@/lib/types";
import { createStudentsBulk } from "@/lib/actions/students";
import { getBatches } from "@/lib/actions/batches";
import { Loader2, Plus, Trash2, Upload, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BulkUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBatchId?: string;
  onSuccess?: () => void;
}

interface ManualEntry {
  id: string;
  name: string;
}

export function BulkUploadForm({
  open,
  onOpenChange,
  defaultBatchId,
  onSuccess,
}: BulkUploadFormProps) {
  const [batchId, setBatchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeTab, setActiveTab] = useState("manual");
  
  // Manual entry state
  const [entries, setEntries] = useState<ManualEntry[]>([
    { id: crypto.randomUUID(), name: "" },
  ]);
  
  // CSV/Paste state
  const [pastedNames, setPastedNames] = useState("");
  
  // Results state
  const [results, setResults] = useState<{
    created: number;
    failed: string[];
  } | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    async function loadBatches() {
      const { data } = await getBatches();
      if (data) {
        setBatches(data);
      }
    }
    if (open) {
      loadBatches();
      // Reset form
      setEntries([{ id: crypto.randomUUID(), name: "" }]);
      setPastedNames("");
      setResults(null);
      setBatchId(defaultBatchId || "");
    }
  }, [open, defaultBatchId]);

  const addEntry = () => {
    setEntries([...entries, { id: crypto.randomUUID(), name: "" }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const updateEntry = (id: string, name: string) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, name } : e)));
  };

  const parseNames = (): string[] => {
    if (activeTab === "manual") {
      return entries
        .map((e) => e.name.trim())
        .filter((name) => name.length > 0);
    } else {
      // Parse from pasted text (one name per line, or comma-separated)
      return pastedNames
        .split(/[\n,]/)
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setResults(null);

    const names = parseNames();
    if (names.length === 0) {
      toast({
        variant: "destructive",
        title: "No students to add",
        description: "Please enter at least one student name.",
      });
      setIsLoading(false);
      return;
    }

    const students: BulkStudentInput[] = names.map((name) => ({
      name,
      batch_id: batchId && batchId !== "none" ? batchId : null,
    }));

    try {
      const result = await createStudentsBulk(students);

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
        return;
      }

      if (result.data) {
        setResults(result.data);
        
        if (result.data.created > 0) {
          toast({
            title: "Students added",
            description: `Successfully added ${result.data.created} student(s).`,
          });
        }
        
        if (result.data.failed.length === 0) {
          // All succeeded - close dialog after brief delay
          setTimeout(() => {
            onOpenChange(false);
            onSuccess?.();
          }, 1500);
        }
      }
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

  const namesCount = parseNames().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Students</DialogTitle>
          <DialogDescription>
            Add multiple students at once. Roll numbers will be auto-generated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Batch Selection */}
          <div className="space-y-2">
            <Label htmlFor="bulk-batch">Assign to Batch (Optional)</Label>
            <Select value={batchId} onValueChange={setBatchId} disabled={isLoading}>
              <SelectTrigger id="bulk-batch">
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

          {/* Tabs for different input methods */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" disabled={isLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="paste" disabled={isLoading}>
                <FileText className="w-4 h-4 mr-2" />
                Paste Names
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add student names one by one. Click the + button to add more rows.
              </p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <Input
                      placeholder="Student name"
                      value={entry.name}
                      onChange={(e) => updateEntry(entry.id, e.target.value)}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(entry.id)}
                      disabled={entries.length === 1 || isLoading}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEntry}
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another
              </Button>
            </TabsContent>

            <TabsContent value="paste" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste student names (one per line, or comma-separated).
              </p>
              
              <Textarea
                placeholder="John Doe&#10;Jane Smith&#10;Alex Johnson&#10;...or paste comma-separated: John Doe, Jane Smith, Alex Johnson"
                value={pastedNames}
                onChange={(e) => setPastedNames(e.target.value)}
                disabled={isLoading}
                className="min-h-[200px] font-mono text-sm"
              />
              
              {pastedNames && (
                <p className="text-sm text-muted-foreground">
                  Detected {parseNames().length} student name(s)
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Results display */}
          {results && (
            <div className="space-y-3">
              {results.created > 0 && (
                <Alert className="border-green-500 bg-green-50">
                  <AlertTitle className="text-green-800">
                    ✓ {results.created} student(s) added successfully
                  </AlertTitle>
                </Alert>
              )}
              
              {results.failed.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some students failed to add</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 text-sm list-disc list-inside max-h-[100px] overflow-y-auto">
                      {results.failed.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {namesCount > 0 && !results && (
              <span>Ready to add {namesCount} student(s)</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {results ? "Close" : "Cancel"}
            </Button>
            {!results && (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || namesCount === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Add {namesCount} Student(s)
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

