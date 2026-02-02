import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Trash2, CheckCircle2, Clock, XCircle, Loader2, Mail } from "lucide-react";
import type { Invite } from "@shared/models/auth";

export function InviteManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);

  const { data: invites = [], isLoading } = useQuery<Invite[]>({
    queryKey: ["/api/invites"],
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: { email?: string; expiresInDays: number }) => {
      const res = await apiRequest("POST", "/api/invites", data);
      return res.json();
    },
    onSuccess: (invite: Invite) => {
      toast({ 
        title: "Invite created", 
        description: "The invite code has been generated." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      setDialogOpen(false);
      setEmail("");
      setExpiresInDays(7);
      
      // Copy to clipboard
      navigator.clipboard.writeText(invite.code);
      toast({
        title: "Copied to clipboard",
        description: "The invite code has been copied.",
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create invite", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invites/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Invite revoked" });
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to revoke invite", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Registration link copied to clipboard." });
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.usedBy) {
      return { label: "Used", variant: "secondary" as const, icon: CheckCircle2 };
    }
    if (!invite.isActive) {
      return { label: "Revoked", variant: "destructive" as const, icon: XCircle };
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return { label: "Expired", variant: "outline" as const, icon: Clock };
    }
    return { label: "Active", variant: "default" as const, icon: Clock };
  };

  const handleCreate = () => {
    createInviteMutation.mutate({
      email: email || undefined,
      expiresInDays,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Invite Codes</CardTitle>
            <CardDescription>
              Generate invite codes for new employees to register
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-invite">
                <Plus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invite Code</DialogTitle>
                <DialogDescription>
                  Generate a new invite code for employee registration.
                  Optionally restrict it to a specific email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email (optional)</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="employee@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                  <p className="text-xs text-muted-foreground">
                    If specified, only this email can use this invite code.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires-days">Expires in (days)</Label>
                  <Input
                    id="expires-days"
                    type="number"
                    min={1}
                    max={365}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                    data-testid="input-invite-expires"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={createInviteMutation.isPending}
                  data-testid="button-confirm-create-invite"
                >
                  {createInviteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Invite"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invite codes yet. Create one to invite employees.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const status = getInviteStatus(invite);
                const StatusIcon = status.icon;
                return (
                  <TableRow key={invite.id}>
                    <TableCell className="font-mono text-sm">
                      {invite.code.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {invite.email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{invite.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Any email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invite.createdAt ? format(new Date(invite.createdAt), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invite.expiresAt ? format(new Date(invite.expiresAt), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!invite.usedBy && invite.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInviteLink(invite.code)}
                            title="Copy registration link"
                            data-testid={`button-copy-invite-${invite.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {!invite.usedBy && invite.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => revokeInviteMutation.mutate(invite.id)}
                            disabled={revokeInviteMutation.isPending}
                            title="Revoke invite"
                            data-testid={`button-revoke-invite-${invite.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
