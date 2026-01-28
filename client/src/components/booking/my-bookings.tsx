import { format, parseISO, isPast, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MapPin, X, Sun, Moon } from "lucide-react";
import type { Booking, Seat } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface MyBookingsProps {
  bookings: Booking[];
  seats: Seat[];
  onCancelBooking: (bookingId: string) => void;
  isCancelling?: boolean;
  isLoading?: boolean;
}

export function MyBookings({
  bookings,
  seats,
  onCancelBooking,
  isCancelling = false,
  isLoading = false,
}: MyBookingsProps) {
  const seatMap = new Map(seats.map(s => [s.id, s]));
  
  // Filter out cancelled bookings and sort by date
  const activeBookings = bookings
    .filter(b => !b.cancelledAt)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.slot === "AM" ? -1 : 1;
    });

  const upcomingBookings = activeBookings.filter(b => {
    const bookingDate = parseISO(b.date);
    return !isPast(bookingDate) || isToday(bookingDate);
  });

  const pastBookings = activeBookings.filter(b => {
    const bookingDate = parseISO(b.date);
    return isPast(bookingDate) && !isToday(bookingDate);
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">My Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const renderBookingItem = (booking: Booking, canCancel: boolean) => {
    const seat = seatMap.get(booking.seatId);
    const bookingDate = parseISO(booking.date);
    const isUpcoming = !isPast(bookingDate) || isToday(bookingDate);

    return (
      <div
        key={booking.id}
        className="flex items-center gap-3 p-3 rounded-lg border hover-elevate transition-colors"
        data-testid={`booking-item-${booking.id}`}
      >
        <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${
          booking.slot === "AM" 
            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
            : "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
        }`}>
          {booking.slot === "AM" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{seat?.name || booking.seatId}</span>
            <Badge variant="outline" className="text-xs">
              {booking.slot}
            </Badge>
            {isToday(bookingDate) && (
              <Badge className="text-xs bg-primary">Today</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(bookingDate, "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {seat?.type === "solo" ? "Solo" : "Team"}
            </span>
          </div>
        </div>

        {canCancel && isUpcoming && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onCancelBooking(booking.id)}
            disabled={isCancelling}
            data-testid={`button-cancel-${booking.id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">My Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        {activeBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No bookings yet</p>
            <p className="text-sm text-muted-foreground">
              Select a seat from the floor plan to make your first booking
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {upcomingBookings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Upcoming</h4>
                  <div className="space-y-2">
                    {upcomingBookings.map(booking => renderBookingItem(booking, true))}
                  </div>
                </div>
              )}

              {pastBookings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Past</h4>
                  <div className="space-y-2 opacity-60">
                    {pastBookings.slice(0, 5).map(booking => renderBookingItem(booking, false))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
