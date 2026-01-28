import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Lock, Unlock, Monitor, Clock, Search, Plus } from "lucide-react";
import type { Seat, SeatType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface SeatManagementProps {
  seats: Seat[];
  onUpdateSeat: (seatId: string, updates: Partial<Seat>) => void;
  onBlockSeat: (seatId: string, blocked: boolean) => void;
  onSetLongTermReservation: (seatId: string, reserved: boolean, reservedBy?: string) => void;
  isUpdating?: boolean;
  isLoading?: boolean;
}

export function SeatManagement({
  seats,
  onUpdateSeat,
  onBlockSeat,
  onSetLongTermReservation,
  isUpdating = false,
  isLoading = false,
}: SeatManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | SeatType>("all");
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
  const [editFormData, setEditFormData] = useState<{
    hasMonitor: boolean;
    isBlocked: boolean;
    isLongTermReserved: boolean;
    longTermReservedBy: string;
  }>({
    hasMonitor: false,
    isBlocked: false,
    isLongTermReserved: false,
    longTermReservedBy: "",
  });

  const filteredSeats = seats.filter(seat => {
    const matchesSearch = seat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || seat.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleEditSeat = (seat: Seat) => {
    setEditingSeat(seat);
    setEditFormData({
      hasMonitor: seat.hasMonitor,
      isBlocked: seat.isBlocked,
      isLongTermReserved: seat.isLongTermReserved,
      longTermReservedBy: seat.longTermReservedBy || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingSeat) return;

    if (editFormData.isLongTermReserved !== editingSeat.isLongTermReserved) {
      onSetLongTermReservation(
        editingSeat.id,
        editFormData.isLongTermReserved,
        editFormData.longTermReservedBy || undefined
      );
    }

    if (editFormData.isBlocked !== editingSeat.isBlocked) {
      onBlockSeat(editingSeat.id, editFormData.isBlocked);
    }

    if (editFormData.hasMonitor !== editingSeat.hasMonitor) {
      onUpdateSeat(editingSeat.id, { hasMonitor: editFormData.hasMonitor });
    }

    setEditingSeat(null);
  };

  const stats = {
    total: seats.length,
    available: seats.filter(s => !s.isBlocked && !s.isLongTermReserved).length,
    blocked: seats.filter(s => s.isBlocked).length,
    longTerm: seats.filter(s => s.isLongTermReserved).length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seat Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seat Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Seats</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.available}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{stats.blocked}</p>
            <p className="text-sm text-muted-foreground">Blocked</p>
          </div>
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.longTerm}</p>
            <p className="text-sm text-muted-foreground">Long-term</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search seats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-seats"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="solo">Solo Desks</SelectItem>
              <SelectItem value="team_cluster">Team Cluster</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Seat Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seat</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Features</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeats.map((seat) => (
                <TableRow key={seat.id} data-testid={`seat-row-${seat.name}`}>
                  <TableCell className="font-medium">{seat.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {seat.type === "solo" ? "Solo" : "Team Cluster"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {seat.isBlocked && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" /> Blocked
                        </Badge>
                      )}
                      {seat.isLongTermReserved && (
                        <Badge className="gap-1 bg-orange-500">
                          <Clock className="h-3 w-3" /> Long-term
                        </Badge>
                      )}
                      {!seat.isBlocked && !seat.isLongTermReserved && (
                        <Badge variant="outline" className="text-emerald-600">
                          Available
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {seat.hasMonitor && (
                      <Badge variant="outline" className="gap-1">
                        <Monitor className="h-3 w-3" /> Monitor
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onBlockSeat(seat.id, !seat.isBlocked)}
                        disabled={isUpdating}
                        data-testid={`button-toggle-block-${seat.name}`}
                      >
                        {seat.isBlocked ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSeat(seat)}
                            data-testid={`button-edit-${seat.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Seat {editingSeat?.name}</DialogTitle>
                            <DialogDescription>
                              Update seat properties and reservation status
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="hasMonitor">Has Monitor</Label>
                              <Switch
                                id="hasMonitor"
                                checked={editFormData.hasMonitor}
                                onCheckedChange={(checked) =>
                                  setEditFormData({ ...editFormData, hasMonitor: checked })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="isBlocked">Blocked</Label>
                              <Switch
                                id="isBlocked"
                                checked={editFormData.isBlocked}
                                onCheckedChange={(checked) =>
                                  setEditFormData({ ...editFormData, isBlocked: checked })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label htmlFor="isLongTerm">Long-term Reserved</Label>
                              <Switch
                                id="isLongTerm"
                                checked={editFormData.isLongTermReserved}
                                onCheckedChange={(checked) =>
                                  setEditFormData({ ...editFormData, isLongTermReserved: checked })
                                }
                              />
                            </div>
                            {editFormData.isLongTermReserved && (
                              <div className="space-y-2">
                                <Label htmlFor="reservedBy">Reserved By</Label>
                                <Input
                                  id="reservedBy"
                                  value={editFormData.longTermReservedBy}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      longTermReservedBy: e.target.value,
                                    })
                                  }
                                  placeholder="Enter name or team"
                                />
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button onClick={handleSaveEdit} disabled={isUpdating}>
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
