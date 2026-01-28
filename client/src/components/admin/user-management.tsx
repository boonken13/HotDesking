import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, ShieldOff, UserX, UserCheck, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface UserWithRole {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt?: string;
  role: "employee" | "admin";
  isActive: boolean;
}

export function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<"employee" | "admin">("employee");

  const { data: users = [], isLoading } = useQuery<UserWithRole[]>({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "employee" | "admin" }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Role updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/status`, { isActive });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.isActive ? "User activated" : "User deactivated",
        description: variables.isActive 
          ? "The user can now access the system." 
          : "The user can no longer access the system."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeactivateDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsRemoveDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove user", description: error.message, variant: "destructive" });
    },
  });

  const openRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const openDeactivateDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsDeactivateDialogOpen(true);
  };

  const openRemoveDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsRemoveDialogOpen(true);
  };

  const handleRoleUpdate = () => {
    if (!selectedUser) return;
    updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
  };

  const handleStatusToggle = () => {
    if (!selectedUser) return;
    updateStatusMutation.mutate({ userId: selectedUser.id, isActive: !selectedUser.isActive });
  };

  const handleRemove = () => {
    if (!selectedUser) return;
    removeUserMutation.mutate(selectedUser.id);
  };

  const getUserDisplayName = (user: UserWithRole) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email || "Unknown User";
  };

  const getInitials = (user: UserWithRole) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const isCurrentUser = (user: UserWithRole) => {
    return currentUser?.id === user.id;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Loading users...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImageUrl} />
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{getUserDisplayName(user)}</span>
                          {isCurrentUser(user) && (
                            <span className="text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={user.role === "admin" ? "bg-blue-600" : ""}
                      >
                        {user.role === "admin" ? (
                          <><Shield className="h-3 w-3 mr-1" /> Admin</>
                        ) : (
                          "Employee"
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "outline" : "destructive"}>
                        {user.isActive ? (
                          <><UserCheck className="h-3 w-3 mr-1" /> Active</>
                        ) : (
                          <><UserX className="h-3 w-3 mr-1" /> Inactive</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.createdAt 
                        ? format(new Date(user.createdAt), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openRoleDialog(user)}
                          disabled={isCurrentUser(user)}
                          data-testid={`button-change-role-${user.id}`}
                        >
                          {user.role === "admin" ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeactivateDialog(user)}
                          disabled={isCurrentUser(user)}
                          data-testid={`button-toggle-status-${user.id}`}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => openRemoveDialog(user)}
                          disabled={isCurrentUser(user)}
                          data-testid={`button-remove-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Change the role for <strong>{selectedUser && getUserDisplayName(selectedUser)}</strong>
            </p>
            <Select value={newRole} onValueChange={(v: "employee" | "admin") => setNewRole(v)}>
              <SelectTrigger data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRoleUpdate}
              disabled={updateRoleMutation.isPending}
              data-testid="button-confirm-role-change"
            >
              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isActive ? "Deactivate User" : "Activate User"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to {selectedUser?.isActive ? "deactivate" : "activate"}{" "}
            <strong>{selectedUser && getUserDisplayName(selectedUser)}</strong>?
            {selectedUser?.isActive && (
              <span className="block mt-2">
                This user will no longer be able to log in or make bookings.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={selectedUser?.isActive ? "destructive" : "default"}
              onClick={handleStatusToggle}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-status-change"
            >
              {updateStatusMutation.isPending 
                ? "Updating..." 
                : selectedUser?.isActive ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to remove <strong>{selectedUser && getUserDisplayName(selectedUser)}</strong>?
            <span className="block mt-2 text-destructive">
              This will remove their role from the system. Their bookings will be preserved.
            </span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={handleRemove}
              disabled={removeUserMutation.isPending}
              data-testid="button-confirm-remove-user"
            >
              {removeUserMutation.isPending ? "Removing..." : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
