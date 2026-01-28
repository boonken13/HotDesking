import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Sun, Moon, MapPin } from "lucide-react";
import type { Booking, Seat } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyBookingsProps {
  bookings: Booking[];
  seats: Seat[];
  selectedDate: Date;
  isLoading?: boolean;
}

export function DailyBookings({
  bookings,
  seats,
  selectedDate,
  isLoading = false,
}: DailyBookingsProps) {
  const seatMap = new Map(seats.map(s => [s.id, s]));
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  // Filter bookings for selected date
  const dateBookings = bookings.filter(
    b => b.date === dateStr && !b.cancelledAt
  );

  // Group by user
  const bookingsByUser = new Map<string, { user: string; email: string; bookings: Array<{ seat: Seat | undefined; slot: string }> }>();
  
  dateBookings.forEach(booking => {
    const key = booking.userId;
    const existing = bookingsByUser.get(key) || {
      user: booking.userName || booking.userEmail || "Unknown User",
      email: booking.userEmail || "",
      bookings: [],
    };
    existing.bookings.push({
      seat: seatMap.get(booking.seatId),
      slot: booking.slot,
    });
    bookingsByUser.set(key, existing);
  });

  const userBookings = Array.from(bookingsByUser.entries());

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Who's in the Office</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium">Who's in the Office</CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {userBookings.length} people
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent>
        {userBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No bookings for this date</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {userBookings.map(([userId, data]) => (
                <div
                  key={userId}
                  className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                  data-testid={`daily-booking-${userId}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {data.user.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{data.user}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.bookings.map((booking, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={`gap-1 ${
                            booking.slot === "AM"
                              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
                              : "bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700"
                          }`}
                        >
                          {booking.slot === "AM" ? (
                            <Sun className="h-3 w-3" />
                          ) : (
                            <Moon className="h-3 w-3" />
                          )}
                          {booking.seat?.name || "Unknown"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
