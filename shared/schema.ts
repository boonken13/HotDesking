import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, date, timestamp, pgEnum, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import auth models for relations
import { users } from "./models/auth";

// Re-export auth models
export * from "./models/auth";

// Enums
export const seatTypeEnum = pgEnum("seat_type", ["solo", "team_cluster"]);
export const timeSlotEnum = pgEnum("time_slot", ["AM", "PM"]);
export const userRoleEnum = pgEnum("user_role", ["employee", "admin"]);

// User Roles Table (extends auth users)
export const userRoles = pgTable("user_roles", {
  userId: varchar("user_id").primaryKey(),
  role: userRoleEnum("role").notNull().default("employee"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

// Seats Table
export const seats = pgTable("seats", {
  id: varchar("id").primaryKey(),
  name: varchar("name", { length: 10 }).notNull().unique(),
  type: seatTypeEnum("type").notNull(),
  hasMonitor: boolean("has_monitor").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  isLongTermReserved: boolean("is_long_term_reserved").notNull().default(false),
  longTermReservedBy: varchar("long_term_reserved_by"),
  longTermReservedUntil: date("long_term_reserved_until"),
  metadata: jsonb("metadata").$type<Record<string, string>>(),
  positionX: integer("position_x").notNull().default(0),
  positionY: integer("position_y").notNull().default(0),
  clusterGroup: varchar("cluster_group"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seatsRelations = relations(seats, ({ many }) => ({
  bookings: many(bookings),
}));

// Bookings Table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seatId: varchar("seat_id").notNull().references(() => seats.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name"),
  userEmail: varchar("user_email"),
  date: date("date").notNull(),
  slot: timeSlotEnum("slot").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  seat: one(seats, {
    fields: [bookings.seatId],
    references: [seats.id],
  }),
}));

// Insert Schemas
export const insertSeatSchema = createInsertSchema(seats).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  cancelledAt: true,
});

export const bulkBookingSchema = z.object({
  seatIds: z.array(z.string()).min(1),
  dates: z.array(z.string()).min(1),
  slots: z.array(z.enum(["AM", "PM"])).min(1),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  createdAt: true,
});

// Partial update schemas for admin operations
export const updateSeatSchema = z.object({
  hasMonitor: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  isLongTermReserved: z.boolean().optional(),
  longTermReservedBy: z.string().nullable().optional(),
  longTermReservedUntil: z.string().nullable().optional(),
  metadata: z.record(z.string()).optional(),
});

export const blockSeatSchema = z.object({
  isBlocked: z.boolean(),
});

export const longTermReservationSchema = z.object({
  isLongTermReserved: z.boolean(),
  longTermReservedBy: z.string().nullable().optional(),
});

// Types
export type Seat = typeof seats.$inferSelect;
export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BulkBooking = z.infer<typeof bulkBookingSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type TimeSlot = "AM" | "PM";
export type SeatType = "solo" | "team_cluster";
export type Role = "employee" | "admin";
