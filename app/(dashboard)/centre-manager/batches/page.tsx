"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-state";
import { BatchForm } from "@/components/batches/batch-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { deleteBatch } from "@/lib/actions/batches";
import { useBatches, mutate } from "@/lib/hooks/use-data";
import { Batch } from "@/lib/types";
import {
  Plus,
  Search,
  BookOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Clock,
} from "lucide-react";

export default function BatchesPage() {
  const router = useRouter();
  const { data: batches = [], isLoading, error } = useBatches();
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const { toast } = useToast();

  const refreshData = () => {
    mutate("batches");
  };

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load batches",
      });
    }
  }, [error, toast]);

  const filteredBatches = useMemo(() => {
    return batches.filter(
      (batch) =>
        batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.faculty?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, batches]);

  const handleEdit = (batch: Batch) => {
    setSelectedBatch(batch);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!batchToDelete) return;

    const { error } = await deleteBatch(batchToDelete.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      toast({
        title: "Batch deleted",
        description: `${batchToDelete.name} has been deleted.`,
      });
      refreshData();
    }
    setDeleteDialogOpen(false);
    setBatchToDelete(null);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setSelectedBatch(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Batches"
          description="Manage batches and their schedules"
        />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Manage batches and their schedules"
      >
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Batch
        </Button>
      </PageHeader>

      {batches.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No batches yet"
          description="Create your first batch to start managing students and schedules."
        >
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Batch
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="border rounded-lg bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow 
                    key={batch.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/centre-manager/batches/${batch.id}`)}
                  >
                    <TableCell className="font-medium">{batch.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Calendar className="w-3 h-3" />
                        {batch.days === "MWF" ? "Mon/Wed/Fri" : "Tue/Thu/Sat"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {batch.timing}
                      </span>
                    </TableCell>
                    <TableCell>
                      {batch.faculty?.full_name || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {batch.student_count || 0}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(batch)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setBatchToDelete(batch);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <BatchForm
        open={formOpen}
        onOpenChange={handleFormClose}
        batch={selectedBatch}
        onSuccess={refreshData}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{batchToDelete?.name}"? This will also
              delete all students and attendance records associated with this batch.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

