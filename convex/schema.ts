import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  activities: defineTable({
    name: v.string(),
    type: v.string(),
    startTime: v.number(), // Stored as timestamp
    endTime: v.number(),   // Stored as timestamp
  }),
  
  dailySchedules: defineTable({
    date: v.number(), // Date stored as timestamp (midnight of the day)
    confirmed: v.boolean(), // Whether the schedule is confirmed
    scheduledActivities: v.array(
      v.object({
        activityId: v.optional(v.id("activities")), // Reference to an activity (optional)
        name: v.string(),
        type: v.string(),
        startTime: v.number(), // Timestamp
        endTime: v.number(),   // Timestamp
      })
    ),
  }),
});