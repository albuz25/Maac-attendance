"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  getCentersWithStats,
  createCenter,
  updateCenter,
  deleteCenter,
} from "@/lib/actions/centers";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  Loader2,
  MapPin,
} from "lucide-react";

interface CenterWithStats {
  id: string;
  name: string;
  created_at: string;
  batch_count: number;
  student_count: number;
  manager_count: number;
}

export default function CentersPage() {
  const router = useRouter();
  const [centers, setCenters] = useState<CenterWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CenterWithStats | null>(null);
  const [centerName, setCenterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<CenterWithStats | null>(null);
  const { toast } = useToast();

  const loadCenters = async () => {
    setIsLoading(true);
    const { data, error } = await getCentersWithStats();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else if (data) {
      setCenters(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCenters();
  }, []);

  const handleOpenForm = (center?: CenterWithStats) => {
    if (center) {
      setEditingCenter(center);
      setCenterName(center.name);
    } else {
      setEditingCenter(null);
      setCenterName("");
    }
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCenter(null);
    setCenterName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerName.trim()) return;

    setIsSubmitting(true);

    const result = editingCenter
      ? await updateCenter(editingCenter.id, centerName.trim())
      : await createCenter(centerName.trim());

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
      toast({
        title: editingCenter ? "Center updated" : "Center created",
        description: `${centerName} has been ${editingCenter ? "updated" : "created"} successfully.`,
      });
      handleCloseForm();
      loadCenters();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!centerToDelete) return;

    const { error } = await deleteCenter(centerToDelete.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      toast({
        title: "Center deleted",
        description: `${centerToDelete.name} has been deleted.`,
      });
      loadCenters();
    }
    setDeleteDialogOpen(false);
    setCenterToDelete(null);
  };

  // Calculate totals
  const totalBatches = centers.reduce((sum, c) => sum + c.batch_count, 0);
  const totalStudents = centers.reduce((sum, c) => sum + c.student_count, 0);
  const totalManagers = centers.reduce((sum, c) => sum + c.manager_count, 0);

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Centers"
          description="Manage all MAAC centers"
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
        title="Centers"
        description="Manage all MAAC centers"
      >
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Center
        </Button>
      </PageHeader>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Centers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centers.length}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBatches}</div>
            <p className="text-xs text-muted-foreground">Across all centers</p>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Centre Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalManagers}</div>
            <p className="text-xs text-muted-foreground">Managing centers</p>
          </CardContent>
        </Card>
      </div>

      {/* Centers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Centers</CardTitle>
        </CardHeader>
        <CardContent>
          {centers.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No centers yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first center to get started
              </p>
              <Button onClick={() => handleOpenForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Center
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Center Name</TableHead>
                  <TableHead className="text-center">Batches</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Managers</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centers.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{center.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                        {center.batch_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        {center.student_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {center.manager_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(center.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenForm(center)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setCenterToDelete(center);
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCenter ? "Edit Center" : "Add New Center"}
              </DialogTitle>
              <DialogDescription>
                {editingCenter
                  ? "Update the center name below."
                  : "Enter the name of the new center."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="centerName">Center Name</Label>
              <Input
                id="centerName"
                placeholder="e.g., Greater Noida"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                className="mt-2"
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !centerName.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCenter ? "Updating..." : "Creating..."}
                  </>
                ) : editingCenter ? (
                  "Update Center"
                ) : (
                  "Create Center"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Center</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{centerToDelete?.name}"? This action
              cannot be undone.
              {centerToDelete && (centerToDelete.batch_count > 0 || centerToDelete.student_count > 0) && (
                <span className="block mt-2 text-destructive">
                  Warning: This center has {centerToDelete.batch_count} batches and{" "}
                  {centerToDelete.student_count} students.
                </span>
              )}
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

