import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { 
  insertBookingSchema, 
  bulkBookingSchema, 
  updateSeatSchema, 
  blockSeatSchema, 
  longTermReservationSchema,
  createSeatSchema,
  updateUserRoleSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Get user role
  app.get("/api/user/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let userRole = await storage.getUserRole(userId);
      
      // If no role exists, create default employee role
      if (!userRole) {
        userRole = await storage.setUserRole({ userId, role: "employee" });
      }
      
      res.json({ role: userRole.role });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch user role" });
    }
  });

  // ==================== SEATS API ====================

  // Get all seats
  app.get("/api/seats", async (req, res) => {
    try {
      const seats = await storage.getAllSeats();
      res.json(seats);
    } catch (error) {
      console.error("Error fetching seats:", error);
      res.status(500).json({ message: "Failed to fetch seats" });
    }
  });

  // Get single seat
  app.get("/api/seats/:id", async (req, res) => {
    try {
      const seat = await storage.getSeat(req.params.id);
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      res.json(seat);
    } catch (error) {
      console.error("Error fetching seat:", error);
      res.status(500).json({ message: "Failed to fetch seat" });
    }
  });

  // Update seat (admin only)
  app.patch("/api/seats/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate request body
      const validatedData = updateSeatSchema.parse(req.body);

      const seat = await storage.updateSeat(req.params.id, validatedData);
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      res.json(seat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid seat data", errors: error.errors });
      }
      console.error("Error updating seat:", error);
      res.status(500).json({ message: "Failed to update seat" });
    }
  });

  // Block/unblock seat (admin only)
  app.patch("/api/seats/:id/block", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate request body
      const { isBlocked } = blockSeatSchema.parse(req.body);
      
      const seat = await storage.updateSeat(req.params.id, { isBlocked });
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      res.json(seat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error blocking seat:", error);
      res.status(500).json({ message: "Failed to block seat" });
    }
  });

  // Create seat (admin only)
  app.post("/api/seats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const seatData = createSeatSchema.parse(req.body);
      
      // Check if seat with same id or name exists
      const existingSeat = await storage.getSeat(seatData.id);
      if (existingSeat) {
        return res.status(409).json({ message: "Seat with this ID already exists" });
      }
      
      const existingByName = await storage.getSeatByName(seatData.name);
      if (existingByName) {
        return res.status(409).json({ message: "Seat with this name already exists" });
      }

      const seat = await storage.createSeat(seatData);
      res.status(201).json(seat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid seat data", errors: error.errors });
      }
      console.error("Error creating seat:", error);
      res.status(500).json({ message: "Failed to create seat" });
    }
  });

  // Delete seat (admin only)
  app.delete("/api/seats/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const seat = await storage.getSeat(req.params.id);
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }

      await storage.deleteSeat(req.params.id);
      res.json({ message: "Seat deleted successfully" });
    } catch (error) {
      console.error("Error deleting seat:", error);
      res.status(500).json({ message: "Failed to delete seat" });
    }
  });

  // Set long-term reservation (admin only)
  app.patch("/api/seats/:id/long-term", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate request body
      const { isLongTermReserved, longTermReservedBy } = longTermReservationSchema.parse(req.body);
      
      const seat = await storage.updateSeat(req.params.id, { 
        isLongTermReserved, 
        longTermReservedBy: isLongTermReserved ? longTermReservedBy : null 
      });
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      res.json(seat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error setting long-term reservation:", error);
      res.status(500).json({ message: "Failed to set long-term reservation" });
    }
  });

  // ==================== BOOKINGS API ====================

  // Get all bookings
  app.get("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get user's own bookings
  app.get("/api/bookings/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookingsByUser(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get bookings by date
  app.get("/api/bookings/date/:date", isAuthenticated, async (req, res) => {
    try {
      const date = req.params.date as string;
      const bookings = await storage.getBookingsByDate(date);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings by date:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Create single booking
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userClaims = req.user.claims;

      const bookingData = insertBookingSchema.parse({
        ...req.body,
        userId,
        userName: userClaims.first_name 
          ? `${userClaims.first_name}${userClaims.last_name ? ` ${userClaims.last_name}` : ""}`
          : null,
        userEmail: userClaims.email || null,
      });

      // Check if seat is available
      const existingBookings = await storage.getBookingsBySeatAndDate(bookingData.seatId, bookingData.date);
      const slotTaken = existingBookings.some(b => b.slot === bookingData.slot);
      
      if (slotTaken) {
        return res.status(409).json({ message: "Slot already booked" });
      }

      // Check if seat is blocked or long-term reserved
      const seat = await storage.getSeat(bookingData.seatId);
      if (!seat) {
        return res.status(404).json({ message: "Seat not found" });
      }
      if (seat.isBlocked) {
        return res.status(409).json({ message: "Seat is blocked" });
      }
      if (seat.isLongTermReserved) {
        return res.status(409).json({ message: "Seat is reserved for long-term use" });
      }

      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Bulk booking
  app.post("/api/bookings/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userClaims = req.user.claims;

      const { seatIds, dates, slots } = bulkBookingSchema.parse(req.body);

      const userName = userClaims.first_name 
        ? `${userClaims.first_name}${userClaims.last_name ? ` ${userClaims.last_name}` : ""}`
        : null;
      const userEmail = userClaims.email || null;

      // Generate all booking combinations
      const bookingsToCreate: Array<{
        seatId: string;
        userId: string;
        userName: string | null;
        userEmail: string | null;
        date: string;
        slot: "AM" | "PM";
      }> = [];

      const conflicts: string[] = [];

      for (const seatId of seatIds) {
        // Check if seat is available
        const seat = await storage.getSeat(seatId);
        if (!seat) {
          conflicts.push(`Seat ${seatId} not found`);
          continue;
        }
        if (seat.isBlocked) {
          conflicts.push(`Seat ${seat.name} is blocked`);
          continue;
        }
        if (seat.isLongTermReserved) {
          conflicts.push(`Seat ${seat.name} is reserved for long-term use`);
          continue;
        }

        for (const date of dates) {
          const existingBookings = await storage.getBookingsBySeatAndDate(seatId, date);
          
          for (const slot of slots) {
            const slotTaken = existingBookings.some(b => b.slot === slot);
            if (slotTaken) {
              conflicts.push(`${seat.name} on ${date} ${slot} already booked`);
              continue;
            }

            bookingsToCreate.push({
              seatId,
              userId,
              userName,
              userEmail,
              date,
              slot,
            });
          }
        }
      }

      if (bookingsToCreate.length === 0) {
        return res.status(409).json({ 
          message: "No bookings could be created", 
          conflicts 
        });
      }

      const createdBookings = await storage.createBulkBookings(bookingsToCreate);
      
      res.status(201).json({ 
        bookings: createdBookings,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        created: createdBookings.length,
        failed: conflicts.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      console.error("Error creating bulk bookings:", error);
      res.status(500).json({ message: "Failed to create bookings" });
    }
  });

  // Cancel booking
  app.delete("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check if user owns the booking or is admin
      const userRole = await storage.getUserRole(userId);
      if (booking.userId !== userId && userRole?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to cancel this booking" });
      }

      const cancelled = await storage.cancelBooking(req.params.id);
      res.json(cancelled);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // ==================== USER MANAGEMENT API ====================

  // Get all users with roles (admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userRole = await storage.getUserRole(userId);
      
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      const roles = await storage.getAllUserRoles();
      
      // Combine users with their roles
      const usersWithRoles = users.map(user => {
        const role = roles.find(r => r.userId === user.id);
        return {
          ...user,
          role: role?.role || "employee",
          isActive: role?.isActive ?? true,
        };
      });

      res.json(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/users/:userId/role", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminRole = await storage.getUserRole(adminId);
      
      if (adminRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.userId;
      
      // Prevent admin from demoting themselves
      if (targetUserId === adminId && req.body.role === "employee") {
        return res.status(400).json({ message: "Cannot demote yourself" });
      }

      const updates = updateUserRoleSchema.parse(req.body);
      
      // Check if user role exists, if not create it
      let userRole = await storage.getUserRole(targetUserId);
      if (!userRole) {
        userRole = await storage.setUserRole({ userId: targetUserId, role: updates.role || "employee" });
      } else {
        userRole = await storage.updateUserRole(targetUserId, updates);
      }

      res.json(userRole);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Deactivate/activate user (admin only)
  app.patch("/api/users/:userId/status", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminRole = await storage.getUserRole(adminId);
      
      if (adminRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.userId;
      
      // Prevent admin from deactivating themselves
      if (targetUserId === adminId) {
        return res.status(400).json({ message: "Cannot deactivate yourself" });
      }

      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      
      // Check if user role exists, if not create it
      let userRole = await storage.getUserRole(targetUserId);
      if (!userRole) {
        userRole = await storage.setUserRole({ userId: targetUserId, role: "employee" });
      }
      
      userRole = await storage.updateUserRole(targetUserId, { isActive });
      res.json(userRole);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Delete user role (admin only)
  app.delete("/api/users/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const adminRole = await storage.getUserRole(adminId);
      
      if (adminRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.userId;
      
      // Prevent admin from deleting themselves
      if (targetUserId === adminId) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }

      await storage.deleteUserRole(targetUserId);
      res.json({ message: "User removed successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  return httpServer;
}
