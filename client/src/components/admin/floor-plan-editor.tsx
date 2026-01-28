import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Seat } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, GripVertical, Save, X } from "lucide-react";

interface FloorPlanEditorProps {
  seats: Seat[];
  isLoading?: boolean;
}

interface SeatFormData {
  id: string;
  name: string;
  type: "solo" | "team_cluster";
  hasMonitor: boolean;
  positionX: number;
  positionY: number;
  clusterGroup: string;
}

export function FloorPlanEditor({ seats, isLoading }: FloorPlanEditorProps) {
  const { toast } = useToast();
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SeatFormData>({
    id: "",
    name: "",
    type: "team_cluster",
    hasMonitor: true,
    positionX: 0,
    positionY: 0,
    clusterGroup: "",
  });

  const createSeatMutation = useMutation({
    mutationFn: async (data: SeatFormData) => {
      const res = await apiRequest("POST", "/api/seats", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Seat created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create seat", description: error.message, variant: "destructive" });
    },
  });

  const updateSeatMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SeatFormData> }) => {
      const res = await apiRequest("PATCH", `/api/seats/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Seat updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
      setIsEditDialogOpen(false);
      setSelectedSeat(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update seat", description: error.message, variant: "destructive" });
    },
  });

  const deleteSeatMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/seats/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Seat deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
      setIsDeleteDialogOpen(false);
      setSelectedSeat(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete seat", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      type: "team_cluster",
      hasMonitor: true,
      positionX: 0,
      positionY: 0,
      clusterGroup: "",
    });
  };

  const openAddDialog = () => {
    resetForm();
    const nextNumber = seats.length + 1;
    const suggestedId = `seat-${nextNumber}`;
    const suggestedName = `T${nextNumber}`;
    setFormData(prev => ({ ...prev, id: suggestedId, name: suggestedName }));
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (seat: Seat) => {
    setSelectedSeat(seat);
    setFormData({
      id: seat.id,
      name: seat.name,
      type: seat.type as "solo" | "team_cluster",
      hasMonitor: seat.hasMonitor,
      positionX: seat.positionX,
      positionY: seat.positionY,
      clusterGroup: seat.clusterGroup || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (seat: Seat) => {
    setSelectedSeat(seat);
    setIsDeleteDialogOpen(true);
  };

  const handleCreate = () => {
    createSeatMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedSeat) return;
    const { id, ...data } = formData;
    updateSeatMutation.mutate({ id: selectedSeat.id, data });
  };

  const handleDelete = () => {
    if (!selectedSeat) return;
    deleteSeatMutation.mutate(selectedSeat.id);
  };

  const seatsByType = useMemo(() => {
    const solo = seats.filter(s => s.type === "solo").sort((a, b) => a.name.localeCompare(b.name));
    const team = seats.filter(s => s.type === "team_cluster").sort((a, b) => a.name.localeCompare(b.name));
    return { solo, team };
  }, [seats]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Loading seats...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Floor Plan Configuration</CardTitle>
          <Button onClick={openAddDialog} size="sm" data-testid="button-add-seat">
            <Plus className="h-4 w-4 mr-1" /> Add Seat
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                Solo Desks 
                <Badge variant="secondary">{seatsByType.solo.length}</Badge>
              </h3>
              <div className="flex flex-wrap gap-2">
                {seatsByType.solo.map(seat => (
                  <SeatCard 
                    key={seat.id} 
                    seat={seat} 
                    onEdit={() => openEditDialog(seat)} 
                    onDelete={() => openDeleteDialog(seat)} 
                  />
                ))}
                {seatsByType.solo.length === 0 && (
                  <p className="text-sm text-muted-foreground">No solo desks configured</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                Team Cluster Desks 
                <Badge variant="secondary">{seatsByType.team.length}</Badge>
              </h3>
              <div className="flex flex-wrap gap-2">
                {seatsByType.team.map(seat => (
                  <SeatCard 
                    key={seat.id} 
                    seat={seat} 
                    onEdit={() => openEditDialog(seat)} 
                    onDelete={() => openDeleteDialog(seat)} 
                  />
                ))}
                {seatsByType.team.length === 0 && (
                  <p className="text-sm text-muted-foreground">No team cluster desks configured</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Seat</DialogTitle>
          </DialogHeader>
          <SeatForm formData={formData} setFormData={setFormData} isNew />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate} 
              disabled={createSeatMutation.isPending}
              data-testid="button-confirm-add-seat"
            >
              {createSeatMutation.isPending ? "Creating..." : "Create Seat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Seat: {selectedSeat?.name}</DialogTitle>
          </DialogHeader>
          <SeatForm formData={formData} setFormData={setFormData} isNew={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateSeatMutation.isPending}
              data-testid="button-confirm-edit-seat"
            >
              {updateSeatMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Seat</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete seat <strong>{selectedSeat?.name}</strong>? 
            This will also delete all associated bookings.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={deleteSeatMutation.isPending}
              data-testid="button-confirm-delete-seat"
            >
              {deleteSeatMutation.isPending ? "Deleting..." : "Delete Seat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SeatCard({ seat, onEdit, onDelete }: { seat: Seat; onEdit: () => void; onDelete: () => void }) {
  return (
    <div 
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md border
        ${seat.isBlocked ? "bg-slate-100 dark:bg-slate-800 border-slate-300" : "bg-card border-border"}
        ${seat.isLongTermReserved ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200" : ""}
      `}
      data-testid={`seat-card-${seat.id}`}
    >
      <span className={`font-medium text-sm ${seat.type === "solo" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
        {seat.name}
      </span>
      {seat.hasMonitor && (
        <Badge variant="outline" className="text-xs px-1">M</Badge>
      )}
      {seat.isBlocked && (
        <Badge variant="secondary" className="text-xs px-1">Blocked</Badge>
      )}
      {seat.isLongTermReserved && (
        <Badge variant="outline" className="text-xs px-1 bg-orange-100 dark:bg-orange-900/40">Reserved</Badge>
      )}
      <div className="flex gap-1 ml-auto">
        <Button size="icon" variant="ghost" onClick={onEdit} className="h-6 w-6" data-testid={`button-edit-seat-${seat.id}`}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} className="h-6 w-6 text-destructive" data-testid={`button-delete-seat-${seat.id}`}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function SeatForm({ 
  formData, 
  setFormData, 
  isNew 
}: { 
  formData: SeatFormData; 
  setFormData: React.Dispatch<React.SetStateAction<SeatFormData>>; 
  isNew: boolean;
}) {
  return (
    <div className="space-y-4 py-4">
      {isNew && (
        <div className="space-y-2">
          <Label htmlFor="seat-id">Seat ID</Label>
          <Input
            id="seat-id"
            value={formData.id}
            onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
            placeholder="e.g., seat-1"
            data-testid="input-seat-id"
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="seat-name">Display Name</Label>
        <Input
          id="seat-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., T1 or S1"
          maxLength={10}
          data-testid="input-seat-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="seat-type">Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value: "solo" | "team_cluster") => {
            setFormData(prev => ({ 
              ...prev, 
              type: value,
              hasMonitor: value === "team_cluster"
            }));
          }}
        >
          <SelectTrigger id="seat-type" data-testid="select-seat-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solo">Solo Desk</SelectItem>
            <SelectItem value="team_cluster">Team Cluster</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="has-monitor">Has Monitor</Label>
        <Switch
          id="has-monitor"
          checked={formData.hasMonitor}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasMonitor: checked }))}
          data-testid="switch-has-monitor"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position-x">Position X</Label>
          <Input
            id="position-x"
            type="number"
            value={formData.positionX}
            onChange={(e) => setFormData(prev => ({ ...prev, positionX: parseInt(e.target.value) || 0 }))}
            data-testid="input-position-x"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position-y">Position Y</Label>
          <Input
            id="position-y"
            type="number"
            value={formData.positionY}
            onChange={(e) => setFormData(prev => ({ ...prev, positionY: parseInt(e.target.value) || 0 }))}
            data-testid="input-position-y"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cluster-group">Cluster Group (optional)</Label>
        <Input
          id="cluster-group"
          value={formData.clusterGroup}
          onChange={(e) => setFormData(prev => ({ ...prev, clusterGroup: e.target.value }))}
          placeholder="e.g., cluster-1"
          data-testid="input-cluster-group"
        />
      </div>
    </div>
  );
}
