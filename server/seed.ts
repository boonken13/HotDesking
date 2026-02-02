import { db } from "./db";
import { seats, clusters, userRoles } from "@shared/schema";
import { users, invites } from "@shared/models/auth";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Long-term reserved desks (yellow ones from the floor plan)
const LONG_TERM_RESERVED = [
  "S1", "S2", "S3", "S4",  // All solo desks
  "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",  // First team cluster
  "T13", "T14", "T15", "T16", "T17", "T18", "T19", "T20",  // Second team cluster
  "T43", "T44", "T45", "T46",  // Part of top cluster
];

// Default floor layout clusters with positions
const DEFAULT_CLUSTERS = [
  { id: "cluster-1", label: "", positionX: 0, positionY: 0, rotation: 0, gridCols: 4, gridRows: 2, 
    seats: ["T56", "T55", "T54", "T53", "T49", "T50", "T51", "T52"] },
  { id: "cluster-2", label: "", positionX: 250, positionY: 0, rotation: 0, gridCols: 2, gridRows: 4,
    seats: ["T60", "T61", "T59", "T62", "T58", "T63", "T57", "T64"] },
  { id: "cluster-3", label: "", positionX: 370, positionY: 0, rotation: 0, gridCols: 2, gridRows: 4,
    seats: ["T68", "T69", "T67", "T70", "T66", "T71", "T65", "T72"] },
  { id: "cluster-4", label: "", positionX: 490, positionY: 0, rotation: 0, gridCols: 2, gridRows: 4,
    seats: ["T76", "T77", "T75", "T78", "T74", "T79", "T73", "T80"] },
  { id: "cluster-5", label: "", positionX: 0, positionY: 150, rotation: 0, gridCols: 4, gridRows: 2,
    seats: ["T48", "T47", "T46", "T45", "T41", "T42", "T43", "T44"] },
  { id: "solo", label: "Solo Desks", positionX: 0, positionY: 280, rotation: 0, gridCols: 1, gridRows: 4,
    seats: ["S4", "S3", "S2", "S1"] },
  { id: "cluster-6", label: "", positionX: 100, positionY: 280, rotation: 0, gridCols: 2, gridRows: 4,
    seats: ["T8", "T9", "T7", "T10", "T6", "T11", "T5", "T12"] },
  { id: "cluster-7", label: "", positionX: 220, positionY: 280, rotation: 0, gridCols: 2, gridRows: 4,
    seats: ["T16", "T17", "T15", "T18", "T14", "T19", "T13", "T20"] },
  { id: "cluster-8", label: "", positionX: 380, positionY: 280, rotation: 0, gridCols: 5, gridRows: 2,
    seats: ["T40", "T39", "T38", "T37", "T36", "T31", "T32", "T33", "T34", "T35"] },
  { id: "cluster-9", label: "", positionX: 380, positionY: 400, rotation: 0, gridCols: 5, gridRows: 2,
    seats: ["T30", "T29", "T28", "T27", "T26", "T21", "T22", "T23", "T24", "T25"] },
];

async function seed() {
  console.log("Seeding database...");

  try {
    // Check if clusters already exist
    const existingClusters = await db.select().from(clusters);
    
    if (existingClusters.length === 0) {
      // Create all clusters
      const clusterData = DEFAULT_CLUSTERS.map(c => ({
        id: c.id,
        label: c.label || null,
        positionX: c.positionX,
        positionY: c.positionY,
        rotation: c.rotation,
        gridCols: c.gridCols,
        gridRows: c.gridRows,
      }));
      
      await db.insert(clusters).values(clusterData);
      console.log(`Created ${clusterData.length} clusters`);
    } else {
      console.log(`Found ${existingClusters.length} existing clusters. Skipping cluster creation.`);
    }

    // Check if seats already exist
    const existingSeats = await db.select().from(seats);
    
    if (existingSeats.length > 0) {
      console.log(`Found ${existingSeats.length} existing seats. Skipping seat creation.`);
      return;
    }

    // Create all seats from cluster definitions
    const allSeats: Array<{
      id: string;
      name: string;
      type: "solo" | "team_cluster";
      hasMonitor: boolean;
      isBlocked: boolean;
      isLongTermReserved: boolean;
      longTermReservedBy: string | null;
      positionX: number;
      positionY: number;
      clusterGroup: string;
    }> = [];

    for (const cluster of DEFAULT_CLUSTERS) {
      cluster.seats.forEach((seatName, idx) => {
        const isSolo = seatName.startsWith("S");
        const row = Math.floor(idx / cluster.gridCols);
        const col = idx % cluster.gridCols;
        
        allSeats.push({
          id: `seat-${seatName.toLowerCase()}`,
          name: seatName,
          type: isSolo ? "solo" : "team_cluster",
          hasMonitor: !isSolo,
          isBlocked: false,
          isLongTermReserved: LONG_TERM_RESERVED.includes(seatName),
          longTermReservedBy: LONG_TERM_RESERVED.includes(seatName) ? "Reserved Employee" : null,
          positionX: col,
          positionY: row,
          clusterGroup: cluster.id,
        });
      });
    }

    await db.insert(seats).values(allSeats);
    console.log(`Created ${allSeats.length} seats`);
    console.log(`Long-term reserved: ${LONG_TERM_RESERVED.length} seats`);

    // Create default admin user if no users exist
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      const [adminUser] = await db.insert(users).values({
        email: "admin@company.com",
        password: adminPassword,
        firstName: "Admin",
        lastName: "User",
      }).returning();
      
      await db.insert(userRoles).values({
        userId: adminUser.id,
        role: "admin",
      });
      
      console.log("Created default admin user: admin@company.com / admin123");
      
      // Create initial invite code for other employees
      const inviteCode = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry
      
      await db.insert(invites).values({
        code: inviteCode,
        createdBy: adminUser.id,
        expiresAt,
      });
      
      console.log(`Created initial invite code: ${inviteCode}`);
    } else {
      console.log(`Found ${existingUsers.length} existing users. Skipping admin creation.`);
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Seeding error:", error);
    throw error;
  }
}

export { seed };
