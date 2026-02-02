import { useState, useMemo } from "react";
import { format, startOfToday, eachDayOfInterval, isWeekend } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { DateSlotPicker } from "@/components/booking/date-slot-picker";
import { BookingSummary } from "@/components/booking/booking-summary";
import { MyBookings } from "@/components/booking/my-bookings";
import { DailyBookings } from "@/components/booking/daily-bookings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Seat, Booking, TimeSlot, Role } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";

interface DashboardProps {
  userRole: Role;
}

export default function Dashboard({ userRole }: DashboardProps) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const today = startOfToday();

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bulkDates, setBulkDates] = useState<Date[]>([]);
  const [activeTab, setActiveTab] = useState("book");
  const [dateRangeMode, setDateRangeMode] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Fetch seats
  const { data: seats = [], isLoading: seatsLoading } = useQuery<Seat[]>({
    queryKey: ["/api/seats"],
  });

  // Fetch all bookings
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery<
    Booking[]
  >({
    queryKey: ["/api/bookings"],
  });

  // Fetch user's bookings
  const { data: myBookings = [], isLoading: myBookingsLoading } = useQuery<
    Booking[]
  >({
    queryKey: ["/api/bookings/my"],
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: {
      seatIds: string[];
      dates: string[];
      slots: TimeSlot[];
    }) => {
      return apiRequest("POST", "/api/bookings/bulk", data);
    },
    onSuccess: () => {
      toast({
        title: "Booking confirmed",
        description: "Your desk reservation has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
      setSelectedSeats([]);
      setSelectedSlots([]);
      setBulkDates([]);
      setStartDate(null);
      setEndDate(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Booking failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("DELETE", `/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      toast({
        title: "Booking cancelled",
        description: "Your reservation has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to cancel",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectSeat = (seatId: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId],
    );
  };

  const handleConfirmBooking = () => {
    let dates: string[];

    if (dateRangeMode && startDate && endDate) {
      // Generate all weekdays between start and end date
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      dates = allDays
        .filter((d) => !isWeekend(d))
        .map((d) => format(d, "yyyy-MM-dd"));
    } else if (bulkDates.length > 0) {
      dates = bulkDates.map((d) => format(d, "yyyy-MM-dd"));
    } else {
      dates = [format(selectedDate, "yyyy-MM-dd")];
    }

    createBookingMutation.mutate({
      seatIds: selectedSeats,
      dates,
      slots: selectedSlots,
    });
  };

  const selectedSeatObjects = useMemo(
    () => seats.filter((s) => selectedSeats.includes(s.id)),
    [seats, selectedSeats],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header user={user ?? null} userRole={userRole} onLogout={logout} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Book a Desk</h1>
          <p className="text-muted-foreground">
            Select a date, time slot, and click on available desks to book
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="book" data-testid="tab-book">
              Book
            </TabsTrigger>
            <TabsTrigger value="my-bookings" data-testid="tab-my-bookings">
              My Bookings
            </TabsTrigger>
            <TabsTrigger value="whos-in" data-testid="tab-whos-in">
              Who's In
            </TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="space-y-6">
            {/* Controls Row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="date-range-mode"
                  checked={dateRangeMode}
                  onCheckedChange={(checked) => {
                    setDateRangeMode(checked);
                    if (!checked) {
                      setStartDate(null);
                      setEndDate(null);
                    }
                  }}
                  data-testid="switch-date-range-mode"
                />
                <Label htmlFor="date-range-mode" className="text-sm">
                  Date Range Booking
                </Label>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              <div className="space-y-6">
                <FloorPlan
                  seats={seats}
                  bookings={allBookings}
                  selectedDate={format(startDate || selectedDate, "yyyy-MM-dd")}
                  selectedSlots={selectedSlots}
                  selectedSeats={selectedSeats}
                  onSelectSeat={handleSelectSeat}
                  viewMode="book"
                  currentUserId={user?.id}
                  isLoading={seatsLoading || bookingsLoading}
                />
              </div>

              <div className="space-y-4">
                <DateSlotPicker
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  selectedSlots={selectedSlots}
                  onSlotsChange={setSelectedSlots}
                  bulkDates={bulkDates}
                  onBulkDatesChange={setBulkDates}
                  bulkMode={false}
                  dateRangeMode={dateRangeMode}
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
                <BookingSummary
                  selectedSeats={selectedSeatObjects}
                  selectedDate={startDate || selectedDate}
                  selectedSlots={selectedSlots}
                  bulkDates={
                    dateRangeMode && startDate && endDate
                      ? eachDayOfInterval({
                          start: startDate,
                          end: endDate,
                        }).filter((d) => !isWeekend(d))
                      : []
                  }
                  onRemoveSeat={(seatId) =>
                    setSelectedSeats((prev) =>
                      prev.filter((id) => id !== seatId),
                    )
                  }
                  onConfirmBooking={handleConfirmBooking}
                  onClearAll={() => {
                    setSelectedSeats([]);
                    setSelectedSlots([]);
                    setBulkDates([]);
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  isBooking={createBookingMutation.isPending}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="my-bookings">
            <div className="max-w-2xl">
              <MyBookings
                bookings={myBookings}
                seats={seats}
                onCancelBooking={(id) => cancelBookingMutation.mutate(id)}
                isCancelling={cancelBookingMutation.isPending}
                isLoading={myBookingsLoading || seatsLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="whos-in">
            <div className="grid lg:grid-cols-[320px_1fr] gap-6">
              <DateSlotPicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                selectedSlots={[]}
                onSlotsChange={() => {}}
              />
              <DailyBookings
                bookings={allBookings}
                seats={seats}
                selectedDate={selectedDate}
                isLoading={bookingsLoading || seatsLoading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
