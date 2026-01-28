import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, X, Check } from "lucide-react";
import type { Seat, TimeSlot } from "@shared/schema";

interface BookingSummaryProps {
  selectedSeats: Seat[];
  selectedDate: Date;
  selectedSlots: TimeSlot[];
  bulkDates?: Date[];
  onRemoveSeat: (seatId: string) => void;
  onConfirmBooking: () => void;
  onClearAll: () => void;
  isBooking?: boolean;
}

export function BookingSummary({
  selectedSeats,
  selectedDate,
  selectedSlots,
  bulkDates = [],
  onRemoveSeat,
  onConfirmBooking,
  onClearAll,
  isBooking = false,
}: BookingSummaryProps) {
  const dates = bulkDates.length > 0 ? bulkDates : [selectedDate];
  const totalBookings = selectedSeats.length * dates.length * selectedSlots.length;

  if (selectedSeats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              Select seats from the floor plan to start booking
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium">Booking Summary</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClearAll} data-testid="button-clear-selection">
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Seats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Selected Seats ({selectedSeats.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSeats.map(seat => (
              <Badge
                key={seat.id}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer"
                onClick={() => onRemoveSeat(seat.id)}
              >
                {seat.name}
                <span className="ml-1 rounded-full hover:bg-muted p-0.5">
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Selected Dates */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Date(s)</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {dates.map(date => (
              <Badge key={format(date, "yyyy-MM-dd")} variant="outline">
                {format(date, "MMM d")}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Selected Slots */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Time Slot(s)</span>
          </div>
          <div className="flex gap-2">
            {selectedSlots.map(slot => (
              <Badge
                key={slot}
                variant="outline"
                className={
                  slot === "AM"
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-400"
                    : "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-400"
                }
              >
                {slot === "AM" ? "Morning (AM)" : "Afternoon (PM)"}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="rounded-lg bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Bookings</span>
            <span className="text-lg font-bold text-primary">{totalBookings}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedSeats.length} seat(s) × {dates.length} date(s) × {selectedSlots.length} slot(s)
          </p>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          className="w-full gap-2"
          onClick={onConfirmBooking}
          disabled={isBooking || selectedSlots.length === 0}
          data-testid="button-confirm-booking"
        >
          {isBooking ? (
            <>Processing...</>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Confirm Booking
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
