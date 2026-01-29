import { useState, useRef, useCallback, useMemo, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  RotateCw,
  Trash2,
  GripVertical,
  Monitor,
  Move,
  Grid3X3,
  Square,
  Save,
  Undo2,
  AlertTriangle,
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

interface LocalCluster extends Cluster {
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
}

interface LocalSeat extends Seat {
  isNew?: boolean;
  isDeleted?: boolean;
}

export function VisualFloorEditor() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showCreateCluster, setShowCreateCluster] = useState(false);
  const [showAddSeat, setShowAddSeat] = useState(false);
  const [showCapacityWarning, setShowCapacityWarning] = useState(false);

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

  // Local state for clusters and seats (changes are only saved on Save button)
  const [localClusters, setLocalClusters] = useState<LocalCluster[]>([]);
  const [localSeats, setLocalSeats] = useState<LocalSeat[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: serverClusters = [], isLoading: clustersLoading } = useQuery<Cluster[]>({
    queryKey: ["/api/clusters"],
  });

  const { data: serverSeats = [], isLoading: seatsLoading } = useQuery<Seat[]>({
    queryKey: ["/api/seats"],
  });

  // Initialize local state from server data - only on fresh load
  useEffect(() => {
    if (!hasUnsavedChanges && serverClusters.length >= 0 && serverSeats.length >= 0) {
      const newClusters = serverClusters.map(c => ({ ...c }));
      const newSeats = serverSeats.map(s => ({ ...s }));
      
      // Only update if data actually changed to prevent loops
      setLocalClusters(prev => {
        if (JSON.stringify(prev.map(({isNew, isDeleted, isModified, ...rest}) => rest)) === 
            JSON.stringify(newClusters)) {
          return prev;
        }
        return newClusters;
      });
      setLocalSeats(prev => {
        if (JSON.stringify(prev.map(({isNew, isDeleted, ...rest}) => rest)) === 
            JSON.stringify(newSeats)) {
          return prev;
        }
        return newSeats;
      });
    }
  }, [serverClusters, serverSeats, hasUnsavedChanges]);

  // Compute active clusters and seats (excluding deleted ones)
  const clusters = useMemo(() => 
    localClusters.filter(c => !c.isDeleted),
    [localClusters]
  );

  const seats = useMemo(() => 
    localSeats.filter(s => !s.isDeleted),
    [localSeats]
  );

  const seatsByCluster = useMemo(() => {
    const map = new Map<string, LocalSeat[]>();
    seats.forEach((seat) => {
      const clusterId = seat.clusterGroup || "unassigned";
      const existing = map.get(clusterId) || [];
      existing.push(seat);
      map.set(clusterId, existing);
    });
    return map;
  }, [seats]);

  const snapToGrid = (value: number) =>
    Math.round(value / GRID_SIZE) * GRID_SIZE;

  // Validate grid dimensions - at least one must be ≤2 for accessibility
  const validateGridDimensions = (cols: number, rows: number): boolean => {
    return cols <= 2 || rows <= 2;
  };

  // Find next available position in cluster grid
  const findNextAvailablePosition = (clusterId: string, gridCols: number, gridRows: number): { x: number; y: number } | null => {
    const clusterSeats = seatsByCluster.get(clusterId) || [];
    const occupied = new Set(clusterSeats.map(s => `${s.positionX},${s.positionY}`));
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        if (!occupied.has(`${col},${row}`)) {
          return { x: col, y: row };
        }
      }
    }
    return null; // Cluster is full
  };

  // Check if cluster has capacity for more seats
  const hasClusterCapacity = (clusterId: string): boolean => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) return false;
    const clusterSeats = seatsByCluster.get(clusterId) || [];
    return clusterSeats.length < cluster.gridCols * cluster.gridRows;
  };

  // Update local cluster
  const updateLocalCluster = (id: string, updates: Partial<LocalCluster>) => {
    setLocalClusters(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates, isModified: true } : c)
    );
    setHasUnsavedChanges(true);
  };

  // Create local cluster
  const createLocalCluster = (cluster: LocalCluster) => {
    setLocalClusters(prev => [...prev, { ...cluster, isNew: true }]);
    setHasUnsavedChanges(true);
  };

  // Delete local cluster
  const deleteLocalCluster = (id: string) => {
    setLocalClusters(prev => 
      prev.map(c => c.id === id ? { ...c, isDeleted: true } : c)
    );
    // Also mark all seats in this cluster as deleted
    setLocalSeats(prev =>
      prev.map(s => s.clusterGroup === id ? { ...s, isDeleted: true } : s)
    );
    setSelectedCluster(null);
    setHasUnsavedChanges(true);
  };

  // Create local seat
  const createLocalSeat = (seat: LocalSeat) => {
    setLocalSeats(prev => [...prev, { ...seat, isNew: true }]);
    setHasUnsavedChanges(true);
  };

  // Delete local seat
  const deleteLocalSeat = (id: string) => {
    setLocalSeats(prev =>
      prev.map(s => s.id === id ? { ...s, isDeleted: true } : s)
    );
    setHasUnsavedChanges(true);
  };

  // Reset to server state
  const handleReset = () => {
    setLocalClusters(serverClusters.map(c => ({ ...c })));
    setLocalSeats(serverSeats.map(s => ({ ...s })));
    setHasUnsavedChanges(false);
    setSelectedCluster(null);
    toast({ title: "Changes discarded" });
  };

  // Save all changes to server
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Process deleted clusters
      const deletedClusters = localClusters.filter(c => c.isDeleted && !c.isNew);
      for (const cluster of deletedClusters) {
        await apiRequest("DELETE", `/api/clusters/${cluster.id}`);
      }

      // Process deleted seats
      const deletedSeats = localSeats.filter(s => s.isDeleted && !s.isNew);
      for (const seat of deletedSeats) {
        await apiRequest("DELETE", `/api/seats/${seat.id}`);
      }

      // Process new clusters
      const newClusters = localClusters.filter(c => c.isNew && !c.isDeleted);
      for (const cluster of newClusters) {
        await apiRequest("POST", "/api/clusters", {
          id: cluster.id,
          label: cluster.label || undefined,
          positionX: cluster.positionX,
          positionY: cluster.positionY,
          gridCols: cluster.gridCols,
          gridRows: cluster.gridRows,
          rotation: cluster.rotation,
        });
      }

      // Process modified clusters
      const modifiedClusters = localClusters.filter(c => c.isModified && !c.isNew && !c.isDeleted);
      for (const cluster of modifiedClusters) {
        await apiRequest("PATCH", `/api/clusters/${cluster.id}`, {
          label: cluster.label,
          positionX: cluster.positionX,
          positionY: cluster.positionY,
          gridCols: cluster.gridCols,
          gridRows: cluster.gridRows,
          rotation: cluster.rotation,
        });
      }

      // Process new seats
      const newSeats = localSeats.filter(s => s.isNew && !s.isDeleted);
      for (const seat of newSeats) {
        await apiRequest("POST", "/api/seats", {
          id: seat.id,
          name: seat.name,
          type: seat.type,
          hasMonitor: seat.hasMonitor,
          clusterGroup: seat.clusterGroup,
          positionX: seat.positionX,
          positionY: seat.positionY,
        });
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/clusters"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/seats"] });

      setHasUnsavedChanges(false);
      toast({ title: "Layout saved", description: "All changes have been saved." });
    } catch (error) {
      toast({ 
        title: "Save failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, clusterId: string, cluster: LocalCluster) => {
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
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.scrollLeft || 0;
      const scrollTop = canvasRef.current.scrollTop || 0;

      const newX = Math.max(
        0,
        snapToGrid(e.clientX - rect.left + scrollLeft - dragState.offsetX),
      );
      const newY = Math.max(
        0,
        snapToGrid(e.clientY - rect.top + scrollTop - dragState.offsetY),
      );

      if (newX !== dragState.currentX || newY !== dragState.currentY) {
        setDragState((prev) =>
          prev ? { ...prev, currentX: newX, currentY: newY } : null,
        );
      }
    },
    [dragState],
  );

  const handleMouseUp = useCallback(() => {
    if (
      dragState &&
      (dragState.currentX !== dragState.startX ||
        dragState.currentY !== dragState.startY)
    ) {
      updateLocalCluster(dragState.clusterId, {
        positionX: dragState.currentX,
        positionY: dragState.currentY,
      });
    }
    setDragState(null);
  }, [dragState]);

  const handleRotate = (clusterId: string, currentRotation: number) => {
    const newRotation = (currentRotation + 90) % 360;
    updateLocalCluster(clusterId, { rotation: newRotation });
  };

  const handleCreateCluster = () => {
    if (!validateGridDimensions(newCluster.gridCols, newCluster.gridRows)) {
      toast({
        title: "Invalid grid size",
        description: "At least one dimension (columns or rows) must be 2 or less to ensure all seats are accessible.",
        variant: "destructive",
      });
      return;
    }

    const id = `cluster-${Date.now()}`;
    createLocalCluster({
      id,
      label: newCluster.label || null,
      positionX: 100,
      positionY: 100,
      gridCols: newCluster.gridCols,
      gridRows: newCluster.gridRows,
      rotation: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setShowCreateCluster(false);
    setNewCluster({ label: "", gridCols: 2, gridRows: 2 });
    toast({ title: "Cluster created" });
  };

  const handleAddSeat = () => {
    if (!selectedCluster || !newSeat.name) return;

    const cluster = clusters.find((c) => c.id === selectedCluster);
    if (!cluster) return;

    if (!hasClusterCapacity(selectedCluster)) {
      setShowCapacityWarning(true);
      return;
    }

    const position = findNextAvailablePosition(selectedCluster, cluster.gridCols, cluster.gridRows);
    if (!position) {
      setShowCapacityWarning(true);
      return;
    }

    createLocalSeat({
      id: `seat-${newSeat.name.toLowerCase()}`,
      name: newSeat.name,
      type: newSeat.type,
      hasMonitor: newSeat.hasMonitor,
      clusterGroup: selectedCluster,
      positionX: position.x,
      positionY: position.y,
      isBlocked: false,
      isLongTermReserved: false,
      longTermReservedBy: null,
      longTermReservedUntil: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setShowAddSeat(false);
    setNewSeat({ name: "", type: "team_cluster", hasMonitor: true });
    toast({ title: "Seat added" });
  };

  const handleGridChange = (clusterId: string, cols: number, rows: number) => {
    if (!validateGridDimensions(cols, rows)) {
      toast({
        title: "Invalid grid size",
        description: "At least one dimension must be 2 or less.",
        variant: "destructive",
      });
      return;
    }

    const clusterSeats = seatsByCluster.get(clusterId) || [];
    const newCapacity = cols * rows;
    
    if (clusterSeats.length > newCapacity) {
      toast({
        title: "Cannot resize",
        description: `This cluster has ${clusterSeats.length} seats but the new size only fits ${newCapacity}. Remove some seats first.`,
        variant: "destructive",
      });
      return;
    }

    updateLocalCluster(clusterId, { gridCols: cols, gridRows: rows });
  };

  const renderCluster = (cluster: LocalCluster) => {
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
        } ${isDragging ? "opacity-90 z-50 shadow-lg" : ""} ${
          cluster.isNew ? "ring-1 ring-green-500" : ""
        }`}
        style={{
          left: posX,
          top: posY,
          width,
          minHeight: height,
          transform: `rotate(${cluster.rotation}deg)`,
          transformOrigin: "center center",
        }}
        onMouseDown={(e) => handleMouseDown(e, cluster.id, cluster)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedCluster(cluster.id);
        }}
        data-testid={`cluster-${cluster.id}`}
      >
        <div className="bg-muted/50 rounded-lg border border-border p-2 h-full relative">
          <div className="absolute -top-3 left-2 flex items-center gap-1">
            {cluster.label && (
              <Badge variant="secondary" className="text-xs">
                {cluster.label}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {cluster.gridCols}x{cluster.gridRows}
            </Badge>
            {cluster.isNew && (
              <Badge variant="default" className="text-xs bg-green-600">
                New
              </Badge>
            )}
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
            {Array.from({ length: cluster.gridCols * cluster.gridRows }).map(
              (_, idx) => {
                const row = Math.floor(idx / cluster.gridCols);
                const col = idx % cluster.gridCols;
                const seat = clusterSeats.find(
                  (s) => s.positionX === col && s.positionY === row,
                );

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center rounded-md text-xs font-medium ${
                      seat
                        ? seat.isLongTermReserved
                          ? "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border border-orange-300"
                          : seat.isBlocked
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-400"
                            : seat.isNew
                              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-400"
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
              },
            )}
          </div>
        </div>
      </div>
    );
  };

  const selectedClusterData = clusters.find((c) => c.id === selectedCluster);
  const selectedClusterSeats = selectedCluster
    ? seatsByCluster.get(selectedCluster) || []
    : [];

  if (clustersLoading || seatsLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-muted-foreground">
              Loading floor plan editor...
            </div>
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
                disabled={!hasClusterCapacity(selectedCluster)}
                data-testid="button-add-seat-to-cluster"
              >
                <Square className="h-4 w-4 mr-2" />
                Add Seat
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  handleRotate(
                    selectedCluster,
                    selectedClusterData?.rotation || 0,
                  )
                }
                data-testid="button-rotate-cluster"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Rotate
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteLocalCluster(selectedCluster)}
                data-testid="button-delete-cluster"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <>
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Unsaved changes
              </Badge>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
                data-testid="button-reset-layout"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            data-testid="button-save-layout"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Layout"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Move className="h-3 w-3" />
          Drag clusters to reposition
        </Badge>
        <Badge variant="outline" className="text-xs">
          Grid max: One dimension must be ≤2 for accessibility
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Floor Plan Canvas</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div
              ref={canvasRef}
              className="relative bg-muted/20 rounded-lg border border-dashed border-border overflow-auto"
              style={{
                height: "500px",
                maxHeight: "500px",
                minHeight: "500px",
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

        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedClusterData ? (
              <>
                <div className="space-y-2">
                  <Label>Cluster ID</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedClusterData.id}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={selectedClusterData.label || ""}
                    onChange={(e) =>
                      updateLocalCluster(selectedClusterData.id, {
                        label: e.target.value || null,
                      })
                    }
                    placeholder="Cluster label"
                    data-testid="input-cluster-label"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Columns (max 2 if rows &gt;2)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={selectedClusterData.gridCols}
                      onChange={(e) => {
                        const newCols = parseInt(e.target.value) || 2;
                        handleGridChange(selectedClusterData.id, newCols, selectedClusterData.gridRows);
                      }}
                      data-testid="input-cluster-cols"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rows (max 2 if cols &gt;2)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={selectedClusterData.gridRows}
                      onChange={(e) => {
                        const newRows = parseInt(e.target.value) || 2;
                        handleGridChange(selectedClusterData.id, selectedClusterData.gridCols, newRows);
                      }}
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
                      onChange={(e) =>
                        updateLocalCluster(selectedClusterData.id, {
                          rotation: parseInt(e.target.value) || 0,
                        })
                      }
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
                      onChange={(e) =>
                        updateLocalCluster(selectedClusterData.id, {
                          positionX: parseInt(e.target.value) || 0,
                        })
                      }
                      data-testid="input-cluster-x"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={selectedClusterData.positionY}
                      onChange={(e) =>
                        updateLocalCluster(selectedClusterData.id, {
                          positionY: parseInt(e.target.value) || 0,
                        })
                      }
                      data-testid="input-cluster-y"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <Label>
                      Seats ({selectedClusterSeats.length}/{selectedClusterData.gridCols * selectedClusterData.gridRows})
                    </Label>
                    {selectedClusterSeats.length >= selectedClusterData.gridCols * selectedClusterData.gridRows && (
                      <Badge variant="outline" className="text-amber-600">Full</Badge>
                    )}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedClusterSeats.length > 0 ? (
                      selectedClusterSeats.map((seat) => (
                        <div
                          key={seat.id}
                          className={`flex items-center justify-between p-2 rounded-md ${
                            seat.isNew ? "bg-green-100 dark:bg-green-900/40" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {seat.name}
                            </span>
                            {seat.hasMonitor && <Monitor className="h-3 w-3" />}
                            {seat.isNew && (
                              <Badge variant="default" className="text-xs bg-green-600">New</Badge>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteLocalSeat(seat.id)}
                            data-testid={`button-delete-seat-${seat.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No seats in this cluster
                      </p>
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
              Add a new desk cluster to the floor plan. At least one dimension (columns or rows) must be 2 or less to ensure all seats are accessible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={newCluster.label}
                onChange={(e) =>
                  setNewCluster((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="e.g., Solo Desks, Team Area"
                data-testid="input-new-cluster-label"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Columns (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newCluster.gridCols}
                  onChange={(e) =>
                    setNewCluster((prev) => ({
                      ...prev,
                      gridCols: Math.min(10, Math.max(1, parseInt(e.target.value) || 2)),
                    }))
                  }
                  data-testid="input-new-cluster-cols"
                />
              </div>
              <div className="space-y-2">
                <Label>Rows (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newCluster.gridRows}
                  onChange={(e) =>
                    setNewCluster((prev) => ({
                      ...prev,
                      gridRows: Math.min(10, Math.max(1, parseInt(e.target.value) || 2)),
                    }))
                  }
                  data-testid="input-new-cluster-rows"
                />
              </div>
            </div>
            {!validateGridDimensions(newCluster.gridCols, newCluster.gridRows) && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                At least one dimension must be 2 or less for accessibility.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateCluster(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCluster}
              disabled={!validateGridDimensions(newCluster.gridCols, newCluster.gridRows)}
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
              Add a new seat to the selected cluster. The seat will be placed in the next available position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seat Name</Label>
              <Input
                value={newSeat.name}
                onChange={(e) =>
                  setNewSeat((prev) => ({
                    ...prev,
                    name: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g., T81, S5"
                data-testid="input-new-seat-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newSeat.type}
                onValueChange={(value: "solo" | "team_cluster") =>
                  setNewSeat((prev) => ({
                    ...prev,
                    type: value,
                    hasMonitor: value === "team_cluster",
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
              disabled={!newSeat.name}
              data-testid="button-confirm-add-seat-to-cluster"
            >
              Add Seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCapacityWarning} onOpenChange={setShowCapacityWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cluster is Full</AlertDialogTitle>
            <AlertDialogDescription>
              This cluster has reached its maximum capacity. To add more seats, first increase the cluster grid size (columns or rows), keeping in mind that at least one dimension must remain 2 or less for accessibility.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCapacityWarning(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
