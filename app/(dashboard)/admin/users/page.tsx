"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { getUsers, updateUser, deleteUser } from "@/lib/actions/users";
import { getCenters } from "@/lib/actions/centers";
import { User, UserRole, Center } from "@/lib/types";
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  UserCog,
  GraduationCap,
  Shield,
  Loader2,
  Mail,
  Building2,
  Calendar,
} from "lucide-react";

const roleConfig: Record<UserRole, { label: string; color: string; icon: any }> = {
  ADMIN: { label: "Admin", color: "bg-red-100 text-red-800", icon: Shield },
  CENTRE_MANAGER: { label: "Centre Manager", color: "bg-blue-100 text-blue-800", icon: UserCog },
  FACULTY: { label: "Faculty", color: "bg-green-100 text-green-800", icon: GraduationCap },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("FACULTY");
  const [editCenterId, setEditCenterId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    const [usersResult, centersResult] = await Promise.all([
      getUsers(),
      getCenters(),
    ]);

    if (usersResult.error) {
      toast({
        variant: "destructive",
        title: "Error loading users",
        description: usersResult.error,
      });
    } else if (usersResult.data) {
      setUsers(usersResult.data);
      setFilteredUsers(usersResult.data);
    }

    if (centersResult.data) {
      setCenters(centersResult.data);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Filter by role tab
    if (selectedTab !== "all") {
      filtered = filtered.filter((u) => u.role === selectedTab);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, selectedTab, users]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.full_name || "");
    setEditRole(user.role);
    setEditCenterId(user.center_id || "none");
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);

    const result = await updateUser(editingUser.id, {
      full_name: editName.trim(),
      role: editRole,
      center_id: editCenterId === "none" ? null : editCenterId,
    });

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    } else {
      toast({
        title: "User updated",
        description: `${editName} has been updated successfully.`,
      });
      setEditDialogOpen(false);
      loadData();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    const { error } = await deleteUser(userToDelete.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      toast({
        title: "User deleted",
        description: `${userToDelete.full_name || userToDelete.email} has been removed.`,
      });
      loadData();
    }
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  // Stats
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    managers: users.filter((u) => u.role === "CENTRE_MANAGER").length,
    faculty: users.filter((u) => u.role === "FACULTY").length,
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Users"
          description="Manage system users and their roles"
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
        title="Users"
        description="Manage system users and their roles"
      />

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All system users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">System administrators</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Centre Managers</CardTitle>
            <UserCog className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.managers}</div>
            <p className="text-xs text-muted-foreground">Managing centers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faculty</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.faculty}</div>
            <p className="text-xs text-muted-foreground">Teaching staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Users</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="ADMIN">
                Admins ({stats.admins})
              </TabsTrigger>
              <TabsTrigger value="CENTRE_MANAGER">
                Managers ({stats.managers})
              </TabsTrigger>
              <TabsTrigger value="FACULTY">
                Faculty ({stats.faculty})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No users found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "No users in this category"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const config = roleConfig[user.role];
                      const Icon = config.icon;
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.full_name || "Unnamed User"}
                              </span>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.center ? (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {(user.center as any).name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                {user.role === "FACULTY" ? "All Centers" : "Not assigned"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>

          {filteredUsers.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">How to Add New Users</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>To add new users to the system:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to <strong>Supabase Dashboard → Authentication → Users</strong></li>
            <li>Click <strong>"Add User"</strong> and enter their email and password</li>
            <li>The user will automatically appear here with default role</li>
            <li>Edit the user here to assign their role and center</li>
          </ol>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details, role, and center assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Full Name</Label>
                <Input
                  id="editName"
                  placeholder="Enter full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editRole}
                  onValueChange={(v) => setEditRole(v as UserRole)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="editRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        Admin
                      </span>
                    </SelectItem>
                    <SelectItem value="CENTRE_MANAGER">
                      <span className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-blue-500" />
                        Centre Manager
                      </span>
                    </SelectItem>
                    <SelectItem value="FACULTY">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-green-500" />
                        Faculty
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCenter">Center Assignment</Label>
                <Select
                  value={editCenterId}
                  onValueChange={setEditCenterId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="editCenter">
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">
                        {editRole === "FACULTY" ? "All Centers (Faculty)" : "No Center Assigned"}
                      </span>
                    </SelectItem>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editRole === "FACULTY" && (
                  <p className="text-xs text-muted-foreground">
                    Faculty can be assigned to all centers (leave unassigned) or a specific center.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
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
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{userToDelete?.full_name || userToDelete?.email}"?
              This will remove their access to the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

