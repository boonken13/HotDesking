import { db } from "./db";
import { seats, userRoles } from "@shared/schema";
import { sql } from "drizzle-orm";

// Define all seats based on the floor plan
const SOLO_DESKS = ["S1", "S2", "S3", "S4"];

const TEAM_CLUSTER_DESKS = [
  // Top row clusters
  "T56", "T55", "T54", "T53", "T49", "T50", "T51", "T52",
  "T48", "T47", "T46", "T45", "T41", "T42", "T43", "T44",
  "T60", "T61", "T59", "T62", "T58", "T63", "T57", "T64",
  "T68", "T69", "T67", "T70", "T66", "T71", "T65", "T72",
  "T76", "T77", "T75", "T78", "T74", "T79", "T73", "T80",
  // Bottom clusters
  "T8", "T9", "T7", "T10", "T6", "T11", "T5", "T12",
  "T16", "T17", "T15", "T18", "T14", "T19", "T13", "T20",
  "T40", "T39", "T38", "T37", "T36", "T31", "T32", "T33", "T34", "T35",
  "T30", "T29", "T28", "T27", "T26", "T21", "T22", "T23", "T24", "T25",
];

// Long-term reserved desks (yellow ones from the floor plan)
const LONG_TERM_RESERVED = [
  "S1", "S2", "S3", "S4",  // All solo desks
  "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",  // First team cluster
  "T13", "T14", "T15", "T16", "T17", "T18", "T19", "T20",  // Second team cluster
  "T43", "T44", "T45", "T46",  // Part of top cluster
];

async function seed() {
  console.log("Seeding database...");

  try {
    // Check if seats already exist
    const existingSeats = await db.select().from(seats);
    
    if (existingSeats.length > 0) {
      console.log(`Found ${existingSeats.length} existing seats. Skipping seat creation.`);
      return;
    }

    // Create all seats
    const allSeats = [
      // Solo desks (no monitors)
      ...SOLO_DESKS.map((name, idx) => ({
        id: `seat-${name.toLowerCase()}`,
        name,
        type: "solo" as const,
        hasMonitor: false,
        isBlocked: false,
        isLongTermReserved: LONG_TERM_RESERVED.includes(name),
        longTermReservedBy: LONG_TERM_RESERVED.includes(name) ? "Reserved Employee" : null,
        positionX: 0,
        positionY: idx,
        clusterGroup: "solo",
      })),
      // Team cluster desks (have monitors)
      ...TEAM_CLUSTER_DESKS.map((name) => ({
        id: `seat-${name.toLowerCase()}`,
        name,
        type: "team_cluster" as const,
        hasMonitor: true,
        isBlocked: false,
        isLongTermReserved: LONG_TERM_RESERVED.includes(name),
        longTermReservedBy: LONG_TERM_RESERVED.includes(name) ? "Reserved Employee" : null,
        positionX: 0,
        positionY: 0,
        clusterGroup: `cluster-${Math.floor(parseInt(name.slice(1)) / 8)}`,
      })),
    ];

    await db.insert(seats).values(allSeats);
    console.log(`Created ${allSeats.length} seats`);
    console.log(`Long-term reserved: ${LONG_TERM_RESERVED.length} seats`);

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Seeding error:", error);
    throw error;
  }
}

export { seed };
