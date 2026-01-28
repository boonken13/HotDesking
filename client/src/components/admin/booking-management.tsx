import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Search, X, Sun, Moon, Download } from "lucide-react";
import type { Booking, Seat } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingManagementProps {
  bookings: Booking[];
  seats: Seat[];
  onCancelBooking: (bookingId: string) => void;
  isCancelling?: boolean;
  isLoading?: boolean;
}

export function BookingManagement({
  bookings,
  seats,
  onCancelBooking,
  isCancelling = false,
  isLoading = false,
}: BookingManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const seatMap = new Map(seats.map(s => [s.id, s]));

  // Filter bookings
  const filteredBookings = bookings
    .filter(b => !b.cancelledAt)
    .filter(b => {
      const matchesSearch =
        b.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seatMap.get(b.seatId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = !filterDate || b.date === format(filterDate, "yyyy-MM-dd");
      
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const stats = {
    total: bookings.filter(b => !b.cancelledAt).length,
    today: bookings.filter(b => !b.cancelledAt && b.date === format(new Date(), "yyyy-MM-dd")).length,
    amSlots: bookings.filter(b => !b.cancelledAt && b.slot === "AM").length,
    pmSlots: bookings.filter(b => !b.cancelledAt && b.slot === "PM").length,
  };

  const handleExport = () => {
    const csvData = filteredBookings.map(b => ({
      Date: b.date,
      Slot: b.slot,
      Seat: seatMap.get(b.seatId)?.name || b.seatId,
      User: b.userName || b.userEmail || "Unknown",
      Email: b.userEmail || "",
      BookedAt: b.createdAt ? format(new Date(b.createdAt), "yyyy-MM-dd HH:mm") : "",
    }));

    const headers = ["Date", "Slot", "Seat", "User", "Email", "BookedAt"];
    const csv = [
      headers.join(","),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row] || ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
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
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>All Bookings</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Bookings</p>
          </div>
          <div className="p-4 rounded-lg bg-primary/10 text-center">
            <p className="text-2xl font-bold text-primary">{stats.today}</p>
            <p className="text-sm text-muted-foreground">Today</p>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.amSlots}</p>
            <p className="text-sm text-muted-foreground">AM Bookings</p>
          </div>
          <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-center">
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.pmSlots}</p>
            <p className="text-sm text-muted-foreground">PM Bookings</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or seat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-bookings"
            />
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start" data-testid="button-filter-date">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "MMM d, yyyy") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={(date) => {
                  setFilterDate(date);
                  setCalendarOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {filterDate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterDate(undefined)}
              data-testid="button-clear-date-filter"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Bookings Table */}
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Booked At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => {
                  const seat = seatMap.get(booking.seatId);
                  return (
                    <TableRow key={booking.id} data-testid={`booking-row-${booking.id}`}>
                      <TableCell>{format(parseISO(booking.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 ${
                            booking.slot === "AM"
                              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300"
                              : "bg-violet-50 dark:bg-violet-900/20 border-violet-300"
                          }`}
                        >
                          {booking.slot === "AM" ? (
                            <Sun className="h-3 w-3" />
                          ) : (
                            <Moon className="h-3 w-3" />
                          )}
                          {booking.slot}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{seat?.name || booking.seatId}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.userName || "Unknown"}</p>
                          {booking.userEmail && (
                            <p className="text-xs text-muted-foreground">{booking.userEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.createdAt
                          ? format(new Date(booking.createdAt), "MMM d, HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onCancelBooking(booking.id)}
                          disabled={isCancelling}
                          data-testid={`button-cancel-booking-${booking.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
