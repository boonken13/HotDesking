import { 
  users, seats, bookings, userRoles, clusters,
  type User, type Seat, type InsertSeat, type Booking, type InsertBooking, 
  type UserRole, type InsertUserRole, type Cluster, type InsertCluster
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // User role operations
  getUserRole(userId: string): Promise<UserRole | undefined>;
  getAllUserRoles(): Promise<UserRole[]>;
  setUserRole(data: InsertUserRole): Promise<UserRole>;
  updateUserRole(userId: string, updates: { role?: "employee" | "admin"; isActive?: boolean }): Promise<UserRole | undefined>;
  deleteUserRole(userId: string): Promise<boolean>;
  
  // Cluster operations
  getAllClusters(): Promise<Cluster[]>;
  getCluster(id: string): Promise<Cluster | undefined>;
  createCluster(cluster: InsertCluster): Promise<Cluster>;
  updateCluster(id: string, updates: Partial<InsertCluster>): Promise<Cluster | undefined>;
  deleteCluster(id: string): Promise<boolean>;
  
  // Seat operations
  getAllSeats(): Promise<Seat[]>;
  getSeat(id: string): Promise<Seat | undefined>;
  getSeatByName(name: string): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  updateSeat(id: string, updates: Partial<InsertSeat>): Promise<Seat | undefined>;
  deleteSeat(id: string): Promise<boolean>;
  
  // Booking operations
  getAllBookings(): Promise<Booking[]>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getBookingsByDate(date: string): Promise<Booking[]>;
  getBookingsBySeatAndDate(seatId: string, date: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  cancelBooking(id: string): Promise<Booking | undefined>;
  
  // Bulk operations
  createBulkBookings(bookings: InsertBooking[]): Promise<Booking[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // User role operations
  async getUserRole(userId: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    return role;
  }

  async setUserRole(data: InsertUserRole): Promise<UserRole> {
    const [role] = await db
      .insert(userRoles)
      .values(data)
      .onConflictDoUpdate({
        target: userRoles.userId,
        set: { role: data.role },
      })
      .returning();
    return role;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt);
  }

  async getAllUserRoles(): Promise<UserRole[]> {
    return db.select().from(userRoles).orderBy(userRoles.createdAt);
  }

  async updateUserRole(userId: string, updates: { role?: "employee" | "admin"; isActive?: boolean }): Promise<UserRole | undefined> {
    const [updated] = await db
      .update(userRoles)
      .set(updates)
      .where(eq(userRoles.userId, userId))
      .returning();
    return updated;
  }

  async deleteUserRole(userId: string): Promise<boolean> {
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    return true;
  }

  // Cluster operations
  async getAllClusters(): Promise<Cluster[]> {
    return db.select().from(clusters).orderBy(clusters.id);
  }

  async getCluster(id: string): Promise<Cluster | undefined> {
    const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id));
    return cluster;
  }

  async createCluster(cluster: InsertCluster): Promise<Cluster> {
    const [created] = await db.insert(clusters).values(cluster).returning();
    return created;
  }

  async updateCluster(id: string, updates: Partial<InsertCluster>): Promise<Cluster | undefined> {
    const [updated] = await db
      .update(clusters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clusters.id, id))
      .returning();
    return updated;
  }

  async deleteCluster(id: string): Promise<boolean> {
    await db.delete(clusters).where(eq(clusters.id, id));
    return true;
  }

  // Seat operations
  async getAllSeats(): Promise<Seat[]> {
    return db.select().from(seats).orderBy(seats.name);
  }

  async getSeat(id: string): Promise<Seat | undefined> {
    const [seat] = await db.select().from(seats).where(eq(seats.id, id));
    return seat;
  }

  async getSeatByName(name: string): Promise<Seat | undefined> {
    const [seat] = await db.select().from(seats).where(eq(seats.name, name));
    return seat;
  }

  async createSeat(seat: InsertSeat): Promise<Seat> {
    const [created] = await db.insert(seats).values(seat).returning();
    return created;
  }

  async updateSeat(id: string, updates: Partial<InsertSeat>): Promise<Seat | undefined> {
    const [updated] = await db
      .update(seats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seats.id, id))
      .returning();
    return updated;
  }

  async deleteSeat(id: string): Promise<boolean> {
    const result = await db.delete(seats).where(eq(seats.id, id));
    return true;
  }

  // Booking operations
  async getAllBookings(): Promise<Booking[]> {
    return db.select().from(bookings).orderBy(bookings.date);
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(bookings.date);
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(and(eq(bookings.date, date), isNull(bookings.cancelledAt)));
  }

  async getBookingsBySeatAndDate(seatId: string, date: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.seatId, seatId),
          eq(bookings.date, date),
          isNull(bookings.cancelledAt)
        )
      );
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async cancelBooking(id: string): Promise<Booking | undefined> {
    const [cancelled] = await db
      .update(bookings)
      .set({ cancelledAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return cancelled;
  }

  // Bulk operations
  async createBulkBookings(bookingsData: InsertBooking[]): Promise<Booking[]> {
    if (bookingsData.length === 0) return [];
    return db.insert(bookings).values(bookingsData).returning();
  }
}

export const storage = new DatabaseStorage();
