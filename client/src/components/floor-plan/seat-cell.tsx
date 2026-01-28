import { cn } from "@/lib/utils";
import type { Seat, Booking, TimeSlot } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Monitor, User, Lock, Clock } from "lucide-react";

interface SeatCellProps {
  seat: Seat;
  bookings: Booking[];
  selectedDate: string;
  selectedSlots: TimeSlot[];
  isSelected: boolean;
  onSelect: (seatId: string) => void;
  viewMode: "book" | "view";
  currentUserId?: string;
}

type SeatStatus = "available" | "booked-am" | "booked-pm" | "fully-booked" | "blocked" | "long-term" | "selected";

export function SeatCell({
  seat,
  bookings,
  selectedDate,
  selectedSlots,
  isSelected,
  onSelect,
  viewMode,
  currentUserId,
}: SeatCellProps) {
  const dateBookings = bookings.filter(b => b.date === selectedDate && !b.cancelledAt);
  const amBooking = dateBookings.find(b => b.slot === "AM");
  const pmBooking = dateBookings.find(b => b.slot === "PM");

  const getStatus = (): SeatStatus => {
    if (isSelected) return "selected";
    if (seat.isBlocked) return "blocked";
    if (seat.isLongTermReserved) return "long-term";
    if (amBooking && pmBooking) return "fully-booked";
    if (amBooking) return "booked-am";
    if (pmBooking) return "booked-pm";
    return "available";
  };

  const status = getStatus();

  const canBook = () => {
    if (viewMode !== "book") return false;
    if (seat.isBlocked || seat.isLongTermReserved) return false;
    
    for (const slot of selectedSlots) {
      if (slot === "AM" && amBooking) return false;
      if (slot === "PM" && pmBooking) return false;
    }
    return selectedSlots.length > 0;
  };

  const getStatusColor = () => {
    switch (status) {
      case "selected":
        return "bg-primary text-primary-foreground border-primary";
      case "available":
        return "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200";
      case "booked-am":
        return "bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200";
      case "booked-pm":
        return "bg-violet-100 dark:bg-violet-900/40 border-violet-400 dark:border-violet-600 text-violet-800 dark:text-violet-200";
      case "fully-booked":
        return "bg-rose-100 dark:bg-rose-900/40 border-rose-400 dark:border-rose-600 text-rose-800 dark:text-rose-200";
      case "blocked":
        return "bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 text-slate-500 dark:text-slate-400";
      case "long-term":
        return "bg-orange-100 dark:bg-orange-900/40 border-orange-400 dark:border-orange-600 text-orange-800 dark:text-orange-200";
    }
  };

  const getTooltipContent = () => {
    const lines = [`${seat.name} - ${seat.type === "solo" ? "Solo Desk" : "Team Cluster"}`];
    if (seat.hasMonitor) lines.push("Has Monitor");
    if (seat.isBlocked) lines.push("Blocked - Not Available");
    if (seat.isLongTermReserved) {
      lines.push(`Long-term Reserved${seat.longTermReservedBy ? ` by ${seat.longTermReservedBy}` : ""}`);
    }
    if (amBooking) lines.push(`AM: ${amBooking.userName || amBooking.userEmail || "Booked"}`);
    if (pmBooking) lines.push(`PM: ${pmBooking.userName || pmBooking.userEmail || "Booked"}`);
    if (status === "available") lines.push("Available");
    return lines;
  };

  const handleClick = () => {
    if (canBook()) {
      onSelect(seat.id);
    }
  };

  const isClickable = canBook();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          disabled={!isClickable}
          data-testid={`seat-${seat.name}`}
          className={cn(
            "relative flex items-center justify-center rounded-md border-2 transition-all duration-200",
            "min-w-[48px] min-h-[48px] text-sm font-medium",
            getStatusColor(),
            isClickable && "cursor-pointer hover:scale-105 hover:shadow-md",
            !isClickable && "cursor-default",
            isSelected && "ring-2 ring-offset-2 ring-primary scale-105 shadow-lg"
          )}
        >
          <span className="font-semibold">{seat.name}</span>
          
          {/* Status indicators */}
          <div className="absolute -top-1 -right-1 flex gap-0.5">
            {seat.hasMonitor && (
              <span className="bg-blue-500 text-white rounded-full p-0.5">
                <Monitor className="h-2.5 w-2.5" />
              </span>
            )}
            {seat.isBlocked && (
              <span className="bg-slate-500 text-white rounded-full p-0.5">
                <Lock className="h-2.5 w-2.5" />
              </span>
            )}
            {seat.isLongTermReserved && (
              <span className="bg-orange-500 text-white rounded-full p-0.5">
                <Clock className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          {/* Booking indicator */}
          {(amBooking || pmBooking) && !seat.isBlocked && !seat.isLongTermReserved && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              {amBooking && (
                <span className="bg-amber-500 text-white text-[8px] px-1 rounded-sm font-bold">AM</span>
              )}
              {pmBooking && (
                <span className="bg-violet-500 text-white text-[8px] px-1 rounded-sm font-bold">PM</span>
              )}
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-sm space-y-1">
          {getTooltipContent().map((line, i) => (
            <p key={i} className={i === 0 ? "font-semibold" : "text-muted-foreground"}>
              {line}
            </p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
