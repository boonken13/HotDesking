import { useState } from "react";
import { format, startOfToday } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { FloorPlan } from "@/components/floor-plan/floor-plan";
import { DateSlotPicker } from "@/components/booking/date-slot-picker";
import { SeatManagement } from "@/components/admin/seat-management";
import { BookingManagement } from "@/components/admin/booking-management";
import { FloorPlanEditor } from "@/components/admin/floor-plan-editor";
import { VisualFloorEditor } from "@/components/admin/visual-floor-editor";
import { UserManagement } from "@/components/admin/user-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Seat, Booking, TimeSlot } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/auth-utils";

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const today = startOfToday();
  
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch seats
  const { data: seats = [], isLoading: seatsLoading } = useQuery<Seat[]>({
    queryKey: ["/api/seats"],
  });

  // Fetch all bookings
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Update seat mutation
  const updateSeatMutation = useMutation({
    mutationFn: async ({ seatId, updates }: { seatId: string; updates: Partial<Seat> }) => {
      return apiRequest("PATCH", `/api/seats/${seatId}`, updates);
    },
    onSuccess: () => {
      toast({ title: "Seat updated", description: "Seat settings have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  // Block/unblock seat mutation
  const blockSeatMutation = useMutation({
    mutationFn: async ({ seatId, blocked }: { seatId: string; blocked: boolean }) => {
      return apiRequest("PATCH", `/api/seats/${seatId}/block`, { isBlocked: blocked });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.blocked ? "Seat blocked" : "Seat unblocked",
        description: variables.blocked
          ? "The seat is now unavailable for booking."
          : "The seat is now available for booking.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    },
  });

  // Long-term reservation mutation
  const longTermMutation = useMutation({
    mutationFn: async ({ seatId, reserved, reservedBy }: { seatId: string; reserved: boolean; reservedBy?: string }) => {
      return apiRequest("PATCH", `/api/seats/${seatId}/long-term`, {
        isLongTermReserved: reserved,
        longTermReservedBy: reservedBy,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.reserved ? "Long-term reservation set" : "Long-term reservation removed",
        description: variables.reserved
          ? "The seat is now reserved for long-term use."
          : "The seat is now available for regular booking.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    },
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("DELETE", `/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      toast({ title: "Booking cancelled", description: "The reservation has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  const handleUpdateSeat = (seatId: string, updates: Partial<Seat>) => {
    updateSeatMutation.mutate({ seatId, updates });
  };

  const handleBlockSeat = (seatId: string, blocked: boolean) => {
    blockSeatMutation.mutate({ seatId, blocked });
  };

  const handleSetLongTerm = (seatId: string, reserved: boolean, reservedBy?: string) => {
    longTermMutation.mutate({ seatId, reserved, reservedBy });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user ?? null} userRole="admin" onLogout={logout} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <p className="text-muted-foreground">
            Manage seats, view bookings, and configure the office floor plan
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="overview" data-testid="tab-overview">Floor Plan</TabsTrigger>
            <TabsTrigger value="editor" data-testid="tab-editor">Layout Editor</TabsTrigger>
            <TabsTrigger value="config" data-testid="tab-config">Seats</TabsTrigger>
            <TabsTrigger value="seat-props" data-testid="tab-seat-props">Properties</TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              <FloorPlan
                seats={seats}
                bookings={allBookings}
                selectedDate={format(selectedDate, "yyyy-MM-dd")}
                selectedSlots={["AM", "PM"]}
                selectedSeats={[]}
                onSelectSeat={() => {}}
                viewMode="view"
                isLoading={seatsLoading || bookingsLoading}
              />
              <DateSlotPicker
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                selectedSlots={[]}
                onSlotsChange={() => {}}
              />
            </div>
          </TabsContent>

          <TabsContent value="editor">
            <VisualFloorEditor />
          </TabsContent>

          <TabsContent value="config">
            <FloorPlanEditor
              seats={seats}
              isLoading={seatsLoading}
            />
          </TabsContent>

          <TabsContent value="seat-props">
            <SeatManagement
              seats={seats}
              onUpdateSeat={handleUpdateSeat}
              onBlockSeat={handleBlockSeat}
              onSetLongTermReservation={handleSetLongTerm}
              isUpdating={updateSeatMutation.isPending || blockSeatMutation.isPending || longTermMutation.isPending}
              isLoading={seatsLoading}
            />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingManagement
              bookings={allBookings}
              seats={seats}
              onCancelBooking={(id) => cancelBookingMutation.mutate(id)}
              isCancelling={cancelBookingMutation.isPending}
              isLoading={bookingsLoading || seatsLoading}
            />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
