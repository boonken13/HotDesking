import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Seat, Cluster } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  RotateCw, 
  Trash2, 
  GripVertical, 
  Monitor,
  Move,
  Grid3X3,
  Square
} from "lucide-react";

const GRID_SIZE = 20;
const CELL_SIZE = 52;

interface DragState {
  clusterId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
}

export function VisualFloorEditor() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showCreateCluster, setShowCreateCluster] = useState(false);
  const [showAddSeat, setShowAddSeat] = useState(false);
  
  const [newCluster, setNewCluster] = useState({
    label: "",
    gridCols: 2,
    gridRows: 2,
  });
  
  const [newSeat, setNewSeat] = useState({
    name: "",
    type: "team_cluster" as "solo" | "team_cluster",
    hasMonitor: true,
  });

  const { data: clusters = [], isLoading: clustersLoading } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: seats = [], isLoading: seatsLoading } = useQuery<Seat[]>({
    queryKey: ["/api/seats"],
  });

  const updateClusterMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Cluster>) => {
      return apiRequest("PATCH", `/api/clusters/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
    },
  });

  const createClusterMutation = useMutation({
    mutationFn: async (data: { id: string; label?: string; positionX: number; positionY: number; gridCols: number; gridRows: number }) => {
      return apiRequest("POST", "/api/clusters", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      setShowCreateCluster(false);
      setNewCluster({ label: "", gridCols: 2, gridRows: 2 });
      toast({ title: "Cluster created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error creating cluster", description: err.message, variant: "destructive" });
    },
  });

  const deleteClusterMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/clusters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
      setSelectedCluster(null);
      toast({ title: "Cluster deleted" });
    },
  });

  const createSeatMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; type: "solo" | "team_cluster"; hasMonitor: boolean; clusterGroup: string; positionX: number; positionY: number }) => {
      return apiRequest("POST", "/api/seats", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
      setShowAddSeat(false);
      setNewSeat({ name: "", type: "team_cluster", hasMonitor: true });
      toast({ title: "Seat added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error adding seat", description: err.message, variant: "destructive" });
    },
  });

  const deleteSeatMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/seats/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
      toast({ title: "Seat deleted" });
    },
  });

  const seatsByCluster = useMemo(() => {
    const map = new Map<string, Seat[]>();
    seats.forEach(seat => {
      const clusterId = seat.clusterGroup || "unassigned";
      const existing = map.get(clusterId) || [];
      existing.push(seat);
      map.set(clusterId, existing);
    });
    return map;
  }, [seats]);

  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  const handleMouseDown = useCallback((e: React.MouseEvent, clusterId: string, cluster: Cluster) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const scrollLeft = canvasRef.current?.scrollLeft || 0;
    const scrollTop = canvasRef.current?.scrollTop || 0;
    
    setDragState({
      clusterId,
      startX: cluster.positionX,
      startY: cluster.positionY,
      offsetX: e.clientX - rect.left + scrollLeft - cluster.positionX,
      offsetY: e.clientY - rect.top + scrollTop - cluster.positionY,
      currentX: cluster.positionX,
      currentY: cluster.positionY,
    });
    setSelectedCluster(clusterId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft || 0;
    const scrollTop = canvasRef.current.scrollTop || 0;
    
    const newX = Math.max(0, snapToGrid(e.clientX - rect.left + scrollLeft - dragState.offsetX));
    const newY = Math.max(0, snapToGrid(e.clientY - rect.top + scrollTop - dragState.offsetY));
    
    if (newX !== dragState.currentX || newY !== dragState.currentY) {
      setDragState(prev => prev ? { ...prev, currentX: newX, currentY: newY } : null);
    }
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (dragState && (dragState.currentX !== dragState.startX || dragState.currentY !== dragState.startY)) {
      updateClusterMutation.mutate({ 
        id: dragState.clusterId, 
        positionX: dragState.currentX, 
        positionY: dragState.currentY 
      });
    }
    setDragState(null);
  }, [dragState, updateClusterMutation]);

  const handleRotate = (clusterId: string, currentRotation: number) => {
    const newRotation = (currentRotation + 90) % 360;
    updateClusterMutation.mutate({ id: clusterId, rotation: newRotation });
  };

  const handleCreateCluster = () => {
    const id = `cluster-${Date.now()}`;
    createClusterMutation.mutate({
      id,
      label: newCluster.label || undefined,
      positionX: 100,
      positionY: 100,
      gridCols: newCluster.gridCols,
      gridRows: newCluster.gridRows,
    });
  };

  const handleAddSeat = () => {
    if (!selectedCluster || !newSeat.name) return;
    
    const clusterSeats = seatsByCluster.get(selectedCluster) || [];
    const cluster = clusters.find(c => c.id === selectedCluster);
    const nextPosition = clusterSeats.length;
    const posX = nextPosition % (cluster?.gridCols || 2);
    const posY = Math.floor(nextPosition / (cluster?.gridCols || 2));
    
    createSeatMutation.mutate({
      id: `seat-${newSeat.name.toLowerCase()}`,
      name: newSeat.name,
      type: newSeat.type,
      hasMonitor: newSeat.hasMonitor,
      clusterGroup: selectedCluster,
      positionX: posX,
      positionY: posY,
    });
  };

  const renderCluster = (cluster: Cluster) => {
    const clusterSeats = seatsByCluster.get(cluster.id) || [];
    const isSelected = selectedCluster === cluster.id;
    const isDragging = dragState?.clusterId === cluster.id;
    
    const posX = isDragging ? dragState.currentX : cluster.positionX;
    const posY = isDragging ? dragState.currentY : cluster.positionY;
    
    const width = cluster.gridCols * CELL_SIZE + 16;
    const height = cluster.gridRows * CELL_SIZE + 16;
    
    return (
      <div
        key={cluster.id}
        className={`absolute cursor-move ${
          isSelected ? "ring-2 ring-primary ring-offset-2" : ""
        } ${isDragging ? "opacity-90 z-50 shadow-lg" : ""}`}
        style={{
          left: posX,
          top: posY,
          width,
          minHeight: height,
          transform: `rotate(${cluster.rotation}deg)`,
          transformOrigin: "center center",
        }}
        onMouseDown={(e) => handleMouseDown(e, cluster.id, cluster)}
        onClick={(e) => { e.stopPropagation(); setSelectedCluster(cluster.id); }}
        data-testid={`cluster-${cluster.id}`}
      >
        <div className="bg-muted/50 rounded-lg border border-border p-2 h-full relative">
          <div className="absolute -top-3 left-2 flex items-center gap-1">
            {cluster.label && (
              <Badge variant="secondary" className="text-xs">{cluster.label}</Badge>
            )}
            <Badge variant="outline" className="text-xs">{cluster.gridCols}x{cluster.gridRows}</Badge>
          </div>
          
          <div className="absolute -top-3 right-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div
            className="grid gap-1 pt-2"
            style={{
              gridTemplateColumns: `repeat(${cluster.gridCols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: cluster.gridCols * cluster.gridRows }).map((_, idx) => {
              const row = Math.floor(idx / cluster.gridCols);
              const col = idx % cluster.gridCols;
              const seat = clusterSeats.find(s => s.positionX === col && s.positionY === row);
              
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-center rounded-md text-xs font-medium ${
                    seat
                      ? seat.isLongTermReserved
                        ? "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border border-orange-300"
                        : seat.isBlocked
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-400"
                        : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-400"
                      : "bg-muted/30 border border-dashed border-muted-foreground/30"
                  }`}
                  style={{ 
                    width: CELL_SIZE - 4, 
                    height: CELL_SIZE - 4,
                    transform: `rotate(${-cluster.rotation}deg)`,
                  }}
                >
                  {seat ? (
                    <div className="flex items-center gap-1">
                      <span>{seat.name}</span>
                      {seat.hasMonitor && <Monitor className="h-3 w-3" />}
                    </div>
                  ) : (
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const selectedClusterData = clusters.find(c => c.id === selectedCluster);
  const selectedClusterSeats = selectedCluster ? seatsByCluster.get(selectedCluster) || [] : [];

  if (clustersLoading || seatsLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">Loading floor plan editor...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setShowCreateCluster(true)}
            data-testid="button-add-cluster"
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Add Cluster
          </Button>
          {selectedCluster && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowAddSeat(true)}
                data-testid="button-add-seat-to-cluster"
              >
                <Square className="h-4 w-4 mr-2" />
                Add Seat
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRotate(selectedCluster, selectedClusterData?.rotation || 0)}
                data-testid="button-rotate-cluster"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteClusterMutation.mutate(selectedCluster)}
                data-testid="button-delete-cluster"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
        <Badge variant="secondary" className="gap-1">
          <Move className="h-3 w-3" />
          Drag clusters to reposition
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Floor Plan Canvas</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div
              ref={canvasRef}
              className="relative bg-muted/20 rounded-lg border border-dashed border-border overflow-auto"
              style={{
                height: "calc(100vh - 320px)",
                minHeight: 500,
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={() => setSelectedCluster(null)}
              data-testid="floor-plan-canvas"
            >
              <div 
                className="relative"
                style={{
                  width: 1600,
                  height: 1200,
                  backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
                  backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                }}
              >
                {clusters.map(renderCluster)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedClusterData ? (
              <>
                <div className="space-y-2">
                  <Label>Cluster ID</Label>
                  <p className="text-sm text-muted-foreground">{selectedClusterData.id}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={selectedClusterData.label || ""}
                    onChange={(e) => updateClusterMutation.mutate({ 
                      id: selectedClusterData.id, 
                      label: e.target.value || null 
                    })}
                    placeholder="Cluster label"
                    data-testid="input-cluster-label"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Columns</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={selectedClusterData.gridCols}
                      onChange={(e) => updateClusterMutation.mutate({ 
                        id: selectedClusterData.id, 
                        gridCols: parseInt(e.target.value) || 2 
                      })}
                      data-testid="input-cluster-cols"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={selectedClusterData.gridRows}
                      onChange={(e) => updateClusterMutation.mutate({ 
                        id: selectedClusterData.id, 
                        gridRows: parseInt(e.target.value) || 2 
                      })}
                      data-testid="input-cluster-rows"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Rotation</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      step={15}
                      value={selectedClusterData.rotation}
                      onChange={(e) => updateClusterMutation.mutate({ 
                        id: selectedClusterData.id, 
                        rotation: parseInt(e.target.value) || 0 
                      })}
                      data-testid="input-cluster-rotation"
                    />
                    <span className="text-sm text-muted-foreground">deg</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={selectedClusterData.positionX}
                      onChange={(e) => updateClusterMutation.mutate({ 
                        id: selectedClusterData.id, 
                        positionX: parseInt(e.target.value) || 0 
                      })}
                      data-testid="input-cluster-x"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={selectedClusterData.positionY}
                      onChange={(e) => updateClusterMutation.mutate({ 
                        id: selectedClusterData.id, 
                        positionY: parseInt(e.target.value) || 0 
                      })}
                      data-testid="input-cluster-y"
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Label className="mb-2 block">Seats ({selectedClusterSeats.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedClusterSeats.length > 0 ? (
                      selectedClusterSeats.map(seat => (
                        <div 
                          key={seat.id} 
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{seat.name}</span>
                            {seat.hasMonitor && <Monitor className="h-3 w-3" />}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteSeatMutation.mutate(seat.id)}
                            data-testid={`button-delete-seat-${seat.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No seats in this cluster</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Click on a cluster to select it and edit its properties.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateCluster} onOpenChange={setShowCreateCluster}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Cluster</DialogTitle>
            <DialogDescription>
              Add a new desk cluster to the floor plan. Drag it to position after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={newCluster.label}
                onChange={(e) => setNewCluster(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Solo Desks, Team Area"
                data-testid="input-new-cluster-label"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Columns</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newCluster.gridCols}
                  onChange={(e) => setNewCluster(prev => ({ ...prev, gridCols: parseInt(e.target.value) || 2 }))}
                  data-testid="input-new-cluster-cols"
                />
              </div>
              <div className="space-y-2">
                <Label>Rows</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newCluster.gridRows}
                  onChange={(e) => setNewCluster(prev => ({ ...prev, gridRows: parseInt(e.target.value) || 2 }))}
                  data-testid="input-new-cluster-rows"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCluster(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCluster}
              disabled={createClusterMutation.isPending}
              data-testid="button-confirm-create-cluster"
            >
              Create Cluster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSeat} onOpenChange={setShowAddSeat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Seat to Cluster</DialogTitle>
            <DialogDescription>
              Add a new seat to the selected cluster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seat Name</Label>
              <Input
                value={newSeat.name}
                onChange={(e) => setNewSeat(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                placeholder="e.g., T81, S5"
                data-testid="input-new-seat-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newSeat.type}
                onValueChange={(value: "solo" | "team_cluster") => 
                  setNewSeat(prev => ({ 
                    ...prev, 
                    type: value, 
                    hasMonitor: value === "team_cluster" 
                  }))
                }
              >
                <SelectTrigger data-testid="select-new-seat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo Desk</SelectItem>
                  <SelectItem value="team_cluster">Team Cluster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSeat(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSeat}
              disabled={!newSeat.name || createSeatMutation.isPending}
              data-testid="button-confirm-add-seat-to-cluster"
            >
              Add Seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
