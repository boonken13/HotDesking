import type { Express } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../db";
import { users, invites, registerSchema, loginSchema, createInviteSchema } from "@shared/models/auth";
import { userRoles } from "@shared/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { generateToken, isAuthenticated } from "./jwt";
import { z } from "zod";

async function getUserRole(userId: string) {
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
  return role;
}

async function setUserRole(userId: string, role: "employee" | "admin") {
  const [userRole] = await db
    .insert(userRoles)
    .values({ userId, role })
    .onConflictDoUpdate({
      target: userRoles.userId,
      set: { role },
    })
    .returning();
  return userRole;
}

export function registerAuthRoutes(app: Express) {
  // Register with invite code
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      // Check if email already exists
      const [existingUser] = await db.select().from(users).where(eq(users.email, data.email));
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Validate invite code
      const [invite] = await db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.code, data.inviteCode),
            eq(invites.isActive, true),
            isNull(invites.usedBy)
          )
        );

      if (!invite) {
        return res.status(400).json({ message: "Invalid or expired invite code" });
      }

      // Check if invite is expired
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invite code has expired" });
      }

      // Check if invite is restricted to specific email
      if (invite.email && invite.email !== data.email) {
        return res.status(400).json({ message: "This invite code is for a different email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
        })
        .returning();

      // Mark invite as used
      await db
        .update(invites)
        .set({ usedBy: newUser.id, usedAt: new Date(), isActive: false })
        .where(eq(invites.id, invite.id));

      // Create default employee role
      await setUserRole(newUser.id, "employee");

      // Generate token
      const token = generateToken({ userId: newUser.id, email: newUser.email! });

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, data.email));
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate token
      const token = generateToken({ userId: user.id, email: user.email! });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.user.userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout (client-side token removal, but we can invalidate here if needed)
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // ==================== INVITE MANAGEMENT (Admin only) ====================

  // Generate invite code
  app.post("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = await getUserRole(req.user.userId);
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const data = createInviteSchema.parse(req.body);
      const code = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

      const [invite] = await db
        .insert(invites)
        .values({
          code,
          email: data.email || null,
          createdBy: req.user.userId,
          expiresAt,
        })
        .returning();

      res.status(201).json(invite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Create invite error:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  // List invites
  app.get("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = await getUserRole(req.user.userId);
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allInvites = await db.select().from(invites).orderBy(invites.createdAt);
      res.json(allInvites);
    } catch (error) {
      console.error("List invites error:", error);
      res.status(500).json({ message: "Failed to list invites" });
    }
  });

  // Revoke invite
  app.delete("/api/invites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = await getUserRole(req.user.userId);
      if (userRole?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      await db.update(invites).set({ isActive: false }).where(eq(invites.id, req.params.id));
      res.json({ message: "Invite revoked" });
    } catch (error) {
      console.error("Revoke invite error:", error);
      res.status(500).json({ message: "Failed to revoke invite" });
    }
  });

  // Validate invite code (public - for registration form)
  app.get("/api/invites/validate/:code", async (req, res) => {
    try {
      const [invite] = await db
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.code, req.params.code),
            eq(invites.isActive, true),
            isNull(invites.usedBy)
          )
        );

      if (!invite) {
        return res.status(404).json({ valid: false, message: "Invalid invite code" });
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ valid: false, message: "Invite code has expired" });
      }

      res.json({ 
        valid: true, 
        email: invite.email,
        message: invite.email ? `This invite is for ${invite.email}` : "Invite code is valid" 
      });
    } catch (error) {
      console.error("Validate invite error:", error);
      res.status(500).json({ valid: false, message: "Validation failed" });
    }
  });
}
