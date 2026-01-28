import { useMemo } from "react";
import type { Seat, Booking, TimeSlot } from "@shared/schema";
import { SeatCell } from "./seat-cell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Clock, Lock, CheckCircle } from "lucide-react";

interface FloorPlanProps {
  seats: Seat[];
  bookings: Booking[];
  selectedDate: string;
  selectedSlots: TimeSlot[];
  selectedSeats: string[];
  onSelectSeat: (seatId: string) => void;
  viewMode: "book" | "view";
  currentUserId?: string;
  isLoading?: boolean;
}

interface ClusterConfig {
  id: string;
  label: string;
  seats: string[];
  gridCols: number;
  gridRows: number;
}

const FLOOR_LAYOUT: ClusterConfig[] = [
  // Top row - Team Clusters
  { id: "cluster-1", label: "", seats: ["T56", "T55", "T54", "T53", "T49", "T50", "T51", "T52"], gridCols: 4, gridRows: 2 },
  { id: "cluster-2", label: "", seats: ["T60", "T61", "T59", "T62", "T58", "T63", "T57", "T64"], gridCols: 2, gridRows: 4 },
  { id: "cluster-3", label: "", seats: ["T68", "T69", "T67", "T70", "T66", "T71", "T65", "T72"], gridCols: 2, gridRows: 4 },
  { id: "cluster-4", label: "", seats: ["T76", "T77", "T75", "T78", "T74", "T79", "T73", "T80"], gridCols: 2, gridRows: 4 },
  
  // Second row - Team Clusters
  { id: "cluster-5", label: "", seats: ["T48", "T47", "T46", "T45", "T41", "T42", "T43", "T44"], gridCols: 4, gridRows: 2 },
  
  // Bottom section - Solo and Team Clusters
  { id: "solo", label: "Solo Desks", seats: ["S4", "S3", "S2", "S1"], gridCols: 1, gridRows: 4 },
  { id: "cluster-6", label: "", seats: ["T8", "T9", "T7", "T10", "T6", "T11", "T5", "T12"], gridCols: 2, gridRows: 4 },
  { id: "cluster-7", label: "", seats: ["T16", "T17", "T15", "T18", "T14", "T19", "T13", "T20"], gridCols: 2, gridRows: 4 },
  { id: "cluster-8", label: "", seats: ["T40", "T39", "T38", "T37", "T36", "T31", "T32", "T33", "T34", "T35"], gridCols: 5, gridRows: 2 },
  { id: "cluster-9", label: "", seats: ["T30", "T29", "T28", "T27", "T26", "T21", "T22", "T23", "T24", "T25"], gridCols: 5, gridRows: 2 },
];

export function FloorPlan({
  seats,
  bookings,
  selectedDate,
  selectedSlots,
  selectedSeats,
  onSelectSeat,
  viewMode,
  currentUserId,
  isLoading,
}: FloorPlanProps) {
  const seatMap = useMemo(() => {
    const map = new Map<string, Seat>();
    seats.forEach(seat => map.set(seat.name, seat));
    return map;
  }, [seats]);

  const bookingsBySeat = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(booking => {
      const existing = map.get(booking.seatId) || [];
      existing.push(booking);
      map.set(booking.seatId, existing);
    });
    return map;
  }, [bookings]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading floor plan...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderCluster = (cluster: ClusterConfig) => {
    return (
      <div key={cluster.id} className="flex flex-col gap-1">
        {cluster.label && (
          <span className="text-xs font-medium text-muted-foreground mb-1">{cluster.label}</span>
        )}
        <div
          className="grid gap-1 p-2 rounded-lg bg-muted/30 border border-border/50"
          style={{
            gridTemplateColumns: `repeat(${cluster.gridCols}, minmax(48px, 1fr))`,
          }}
        >
          {cluster.seats.map(seatName => {
            const seat = seatMap.get(seatName);
            if (!seat) return (
              <div key={seatName} className="min-w-[48px] min-h-[48px] rounded-md bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                {seatName}
              </div>
            );
            return (
              <SeatCell
                key={seat.id}
                seat={seat}
                bookings={bookingsBySeat.get(seat.id) || []}
                selectedDate={selectedDate}
                selectedSlots={selectedSlots}
                isSelected={selectedSeats.includes(seat.id)}
                onSelect={onSelectSeat}
                viewMode={viewMode}
                currentUserId={currentUserId}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">Office Floor Plan</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-emerald-400">
              <CheckCircle className="h-3 w-3" /> Available
            </Badge>
            <Badge variant="outline" className="gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-400">
              AM Booked
            </Badge>
            <Badge variant="outline" className="gap-1 bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-400">
              PM Booked
            </Badge>
            <Badge variant="outline" className="gap-1 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border-rose-400">
              Fully Booked
            </Badge>
            <Badge variant="outline" className="gap-1 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-400">
              <Clock className="h-3 w-3" /> Long-term
            </Badge>
            <Badge variant="outline" className="gap-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-400">
              <Lock className="h-3 w-3" /> Blocked
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[900px] space-y-6 p-4">
          {/* Top section */}
          <div className="flex gap-4 justify-center flex-wrap">
            {renderCluster(FLOOR_LAYOUT[0])}
            <div className="w-8" />
            {renderCluster(FLOOR_LAYOUT[1])}
            <div className="w-4" />
            {renderCluster(FLOOR_LAYOUT[2])}
            <div className="w-4" />
            {renderCluster(FLOOR_LAYOUT[3])}
          </div>
          
          {/* Second row */}
          <div className="flex gap-4 justify-start pl-0">
            {renderCluster(FLOOR_LAYOUT[4])}
          </div>

          {/* Bottom section */}
          <div className="flex gap-4 items-start flex-wrap">
            {renderCluster(FLOOR_LAYOUT[5])}
            <div className="w-4" />
            {renderCluster(FLOOR_LAYOUT[6])}
            <div className="w-4" />
            {renderCluster(FLOOR_LAYOUT[7])}
            <div className="w-8" />
            <div className="flex flex-col gap-2">
              {renderCluster(FLOOR_LAYOUT[8])}
              {renderCluster(FLOOR_LAYOUT[9])}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-600 dark:text-green-400">S</span>
            <span>= Solo Desks (No Monitors)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-600 dark:text-blue-400">T</span>
            <span>= Team Cluster Desks (Has Monitors)</span>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>= Has Monitor</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
