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
import { Batch, BulkStudentInput, CsvStudentInput } from "@/lib/types";
import { createStudentsBulk, createStudentsFromCsv } from "@/lib/actions/students";
import { getBatches } from "@/lib/actions/batches";
import { mutate } from "swr";
import { Loader2, Plus, Trash2, Upload, FileText, AlertCircle, FileSpreadsheet } from "lucide-react";
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
  
  // CSV file state
  const [csvData, setCsvData] = useState<CsvStudentInput[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvError, setCsvError] = useState("");
  
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
      setCsvData([]);
      setCsvFileName("");
      setCsvError("");
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
    } else if (activeTab === "paste") {
      // Parse from pasted text (one name per line, or comma-separated)
      return pastedNames
        .split(/[\n,]/)
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
    }
    return [];
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError("");
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        
        // Skip header row if it looks like a header
        let startIndex = 0;
        const firstLine = lines[0]?.toLowerCase() || "";
        if (firstLine.includes("roll") || firstLine.includes("name") || firstLine.includes("no")) {
          startIndex = 1;
        }

        const parsedData: CsvStudentInput[] = [];
        const errors: string[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          // Handle both comma and tab delimited
          const parts = line.includes(",") ? line.split(",") : line.split("\t");
          
          if (parts.length >= 2) {
            const rollNumber = parts[0].trim().replace(/^["']|["']$/g, "");
            const name = parts[1].trim().replace(/^["']|["']$/g, "");
            
            if (rollNumber && name) {
              parsedData.push({
                roll_number: rollNumber,
                name: name,
                batch_id: batchId && batchId !== "none" ? batchId : null,
              });
            } else if (rollNumber || name) {
              errors.push(`Row ${i + 1}: Missing ${!rollNumber ? "roll number" : "name"}`);
            }
          } else if (line.trim()) {
            errors.push(`Row ${i + 1}: Invalid format (expected: RollNo, Name)`);
          }
        }

        if (parsedData.length === 0) {
          setCsvError("No valid data found in CSV. Expected format: Roll Number, Name");
        } else {
          setCsvData(parsedData);
          if (errors.length > 0) {
            setCsvError(`Warning: ${errors.length} row(s) skipped due to invalid format`);
          }
        }
      } catch (err) {
        setCsvError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setResults(null);

    let studentCount = 0;

    if (activeTab === "csv") {
      if (csvData.length === 0) {
        toast({
          variant: "destructive",
          title: "No students to add",
          description: "Please upload a valid CSV file.",
        });
        setIsLoading(false);
        return;
      }
      studentCount = csvData.length;
    } else {
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
      studentCount = names.length;
    }

    try {
      let result;

      if (activeTab === "csv") {
        const studentsWithBatch = csvData.map((s) => ({
          ...s,
          batch_id: batchId && batchId !== "none" ? batchId : null,
        }));
        result = await createStudentsFromCsv(studentsWithBatch);
      } else {
        const names = parseNames();
        const students: BulkStudentInput[] = names.map((name) => ({
          name,
          batch_id: batchId && batchId !== "none" ? batchId : null,
        }));
        result = await createStudentsBulk(students);
      }

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

      if (result.data) {
        if (result.data.created > 0) {
          toast({
            title: "Students added",
            description: `Successfully added ${result.data.created} student(s).`,
          });
        }
        
        if (result.data.failed.length > 0) {
          toast({
            variant: "destructive",
            title: "Some students failed",
            description: `${result.data.failed.length} student(s) failed to add.`,
          });
        }
      }

      // Revalidate data immediately
      await mutate(["students", undefined]);
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

  const namesCount = activeTab === "csv" ? csvData.length : parseNames().length;

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
            <TabsList className="!grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="manual" disabled={isLoading} className="flex items-center gap-2 py-2">
                <Plus className="w-4 h-4" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="paste" disabled={isLoading} className="flex items-center gap-2 py-2">
                <FileText className="w-4 h-4" />
                Paste
              </TabsTrigger>
              <TabsTrigger value="csv" disabled={isLoading} className="flex items-center gap-2 py-2">
                <FileSpreadsheet className="w-4 h-4" />
                CSV
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
                Paste student names (one per line, or comma-separated). Roll numbers will be auto-generated.
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

            <TabsContent value="csv" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with columns: <strong>Roll Number</strong>, <strong>Name</strong>
              </p>
              
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {csvFileName || "Click to upload CSV file"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    CSV format: Roll Number, Name
                  </span>
                </label>
              </div>

              {csvError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{csvError}</AlertDescription>
                </Alert>
              )}

              {csvData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600">
                    ✓ {csvData.length} student(s) ready to import
                  </p>
                  <div className="max-h-[150px] overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">Roll No.</th>
                          <th className="text-left p-2 font-medium">Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 10).map((student, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-mono">{student.roll_number}</td>
                            <td className="p-2">{student.name}</td>
                          </tr>
                        ))}
                        {csvData.length > 10 && (
                          <tr className="border-t">
                            <td colSpan={2} className="p-2 text-center text-muted-foreground">
                              ... and {csvData.length - 10} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-1">CSV Format Example:</p>
                <code className="block whitespace-pre">
                  Roll No., Name{"\n"}
                  GN-2026-001, John Doe{"\n"}
                  GN-2026-002, Jane Smith
                </code>
              </div>
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

