import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import * as chrono from 'chrono-node'; // Import chrono for natural language date parsing

// Helper function to convert date strings to timestamps
export function convertToTimestamp(dateString: string): { timestamp: number; readableDate: string; } | null {
  try {
    // Create a custom chrono configuration with enhanced parsing capabilities
    const custom = chrono.casual.clone();
    
    // Set a reference date (today) for relative expressions
    const refDate = new Date();
    
    // Try to parse with the custom configuration and reference date
    let parsedDate = custom.parseDate(dateString, refDate, { forwardDate: true });
    
    // Fallback options if the regular parsing fails
    if (!parsedDate) {
        // Try parsing with just the Date constructor
        parsedDate = new Date(dateString);
        
        // If that fails (returns Invalid Date), try some manual parsing for common phrases
        if (isNaN(parsedDate.getTime())) {
            if (dateString.toLowerCase().includes('today')) {
                const today = new Date();
                
                // Extract time if present (e.g., "today at 10pm")
                const timeMatch = dateString.match(/(\d+)(?:\s*)(am|pm)/i);
                if (timeMatch) {
                    const hour = parseInt(timeMatch[1]);
                    const isPM = timeMatch[2].toLowerCase() === 'pm';
                    
                    today.setHours(isPM && hour < 12 ? hour + 12 : hour);
                    today.setMinutes(0);
                    today.setSeconds(0);
                    parsedDate = today;
                }
            }
        }
    }
    
    // If still couldn't parse, return null
    if (!parsedDate || isNaN(parsedDate.getTime())) {
        return null;
    }
    
    // IMPORTANT: Fix for the 2-hour time zone difference
    // 1. Extract the intended local time values
    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth();
    const date = parsedDate.getDate();
    const hours = parsedDate.getHours();
    const minutes = parsedDate.getMinutes();
    
    // 2. Create a timestamp that will display correctly by compensating for the 2-hour difference
    // Subtract 2 hours from the intended time to counteract the 2-hour ahead display issue
    const adjustedHours = hours - 2;
    
    // 3. Create a new date with the adjusted hours
    const adjustedDate = new Date();
    adjustedDate.setFullYear(year);
    adjustedDate.setMonth(month);
    adjustedDate.setDate(date);
    adjustedDate.setHours(adjustedHours);
    adjustedDate.setMinutes(minutes);
    adjustedDate.setSeconds(0);
    adjustedDate.setMilliseconds(0);
    
    const timestamp = adjustedDate.getTime();
    const readableDate = new Date(timestamp).toLocaleString();
    
    console.log(`Parsed "${dateString}" to timestamp ${timestamp} (${readableDate})`);
    console.log(`Original time: ${hours}:${minutes}, Adjusted time: ${adjustedHours}:${minutes}`);
    
    return { timestamp, readableDate };
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
}

// Create a new activity
export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    startTime: v.union(v.number(), v.string()), // Accept timestamp or date string
    endTime: v.union(v.number(), v.string()),   // Accept timestamp or date string
  },
  handler: async (ctx, args) => {
    // Convert string dates to timestamps if needed
    let startTimeMs: number;
    let endTimeMs: number;
    
    if (typeof args.startTime === "string") {
      const converted = convertToTimestamp(args.startTime);
      if (!converted) {
        throw new Error(`Could not parse start time: "${args.startTime}"`);
      }
      startTimeMs = converted.timestamp;
    } else {
      startTimeMs = args.startTime;
    }
    
    if (typeof args.endTime === "string") {
      const converted = convertToTimestamp(args.endTime);
      if (!converted) {
        throw new Error(`Could not parse end time: "${args.endTime}"`);
      }
      endTimeMs = converted.timestamp;
    } else {
      endTimeMs = args.endTime;
    }
    
    const activityId = await ctx.db.insert("activities", {
      name: args.name,
      type: args.type,
      startTime: startTimeMs,
      endTime: endTimeMs,
    });
    return activityId;
  },
});

// Get all activities
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("activities").collect();
  },
});

// Get a single activity by ID
export const getById = query({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get activities by type
export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("type"), args.type))
      .collect();
  },
});

// Get activities within a time range
export const getByTimeRange = query({
  args: { 
    startTime: v.union(v.number(), v.string()), // Accept timestamp or date string
    endTime: v.union(v.number(), v.string())    // Accept timestamp or date string
  },
  handler: async (ctx, args) => {
    // Convert string dates to timestamps if needed
    let startTimeMs: number;
    let endTimeMs: number;
    
    if (typeof args.startTime === "string") {
      const converted = convertToTimestamp(args.startTime);
      if (!converted) {
        throw new Error(`Could not parse start time: "${args.startTime}"`);
      }
      startTimeMs = converted.timestamp;
    } else {
      startTimeMs = args.startTime;
    }
    
    if (typeof args.endTime === "string") {
      const converted = convertToTimestamp(args.endTime);
      if (!converted) {
        throw new Error(`Could not parse end time: "${args.endTime}"`);
      }
      endTimeMs = converted.timestamp;
    } else {
      endTimeMs = args.endTime;
    }
    
    return await ctx.db
      .query("activities")
      .filter((q) => 
        q.and(
          q.gte(q.field("startTime"), startTimeMs),
          q.lte(q.field("endTime"), endTimeMs)
        )
      )
      .collect();
  },
});

// Get activities for a specific date
export const getByDate = query({
  args: { 
    date: v.union(v.number(), v.string()) // Accept timestamp or date string
  },
  handler: async (ctx, args) => {
    // Convert date to Date object
    let selectedDate: Date;
    
    if (typeof args.date === "string") {
      const parsed = chrono.parseDate(args.date);
      if (!parsed) {
        throw new Error(`Could not parse date: "${args.date}"`);
      }
      selectedDate = parsed;
    } else {
      selectedDate = new Date(args.date);
    }
    
    // Set to start of day (midnight)
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Set to end of day (23:59:59.999)
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get timestamp values for querying
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    console.log(`Filtering activities for date: ${selectedDate.toDateString()}`);
    console.log(`Start timestamp: ${startTimestamp}, End timestamp: ${endTimestamp}`);
    
    // Filter activities that occur on this date
    // An activity is on this date if:
    // 1. It starts on this date, OR
    // 2. It ends on this date, OR
    // 3. It spans across this date (starts before and ends after)
    return await ctx.db
      .query("activities")
      .filter((q) => 
        q.or(
          // Starts on the selected date
          q.and(
            q.gte(q.field("startTime"), startTimestamp),
            q.lte(q.field("startTime"), endTimestamp)
          ),
          // Ends on the selected date
          q.and(
            q.gte(q.field("endTime"), startTimestamp),
            q.lte(q.field("endTime"), endTimestamp)
          ),
          // Spans across the selected date
          q.and(
            q.lt(q.field("startTime"), startTimestamp),
            q.gt(q.field("endTime"), endTimestamp)
          )
        )
      )
      .collect();
  },
});

// Update an activity
export const update = mutation({
  args: {
    id: v.id("activities"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    startTime: v.optional(v.union(v.number(), v.string())), // Accept timestamp or date string
    endTime: v.optional(v.union(v.number(), v.string())),   // Accept timestamp or date string
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    
    // Convert any string dates to timestamps
    const updates: Record<string, any> = {};
    
    // Add non-date fields
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.type !== undefined) updates.type = fields.type;
    
    // Handle start time
    if (fields.startTime !== undefined) {
      if (typeof fields.startTime === "string") {
        const converted = convertToTimestamp(fields.startTime);
        if (!converted) {
          throw new Error(`Could not parse start time: "${fields.startTime}"`);
        }
        updates.startTime = converted.timestamp;
      } else {
        updates.startTime = fields.startTime;
      }
    }
    
    // Handle end time
    if (fields.endTime !== undefined) {
      if (typeof fields.endTime === "string") {
        const converted = convertToTimestamp(fields.endTime);
        if (!converted) {
          throw new Error(`Could not parse end time: "${fields.endTime}"`);
        }
        updates.endTime = converted.timestamp;
      } else {
        updates.endTime = fields.endTime;
      }
    }
    
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Delete an activity
export const remove = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ==================== Daily Schedules Functions ====================

// Helper to get midnight timestamp for a specific date
function getMidnightTimestamp(date: Date): number {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime();
}

// Save a confirmed daily schedule
export const saveDailySchedule = mutation({
  args: {
    date: v.union(v.number(), v.string()), // Accept timestamp or date string
    scheduledActivities: v.array(
      v.object({
        activityId: v.optional(v.id("activities")),
        name: v.string(),
        type: v.string(),
        startTime: v.union(v.number(), v.string()), // Accept timestamp or date string
        endTime: v.union(v.number(), v.string()),   // Accept timestamp or date string
      })
    ),
  },
  handler: async (ctx, args) => {
    // Convert date to midnight timestamp if it's a string
    let dateTimestamp: number;
    
    if (typeof args.date === "string") {
      const parsed = chrono.parseDate(args.date);
      if (!parsed) {
        throw new Error(`Could not parse date: "${args.date}"`);
      }
      dateTimestamp = getMidnightTimestamp(parsed);
    } else {
      // If it's already a timestamp, ensure it's set to midnight
      dateTimestamp = getMidnightTimestamp(new Date(args.date));
    }
    
    // Process each scheduled activity to ensure timestamps
    const processedActivities = await Promise.all(
      args.scheduledActivities.map(async (activity) => {
        let startTimeMs: number;
        let endTimeMs: number;
        
        // Process start time
        if (typeof activity.startTime === "string") {
          const converted = convertToTimestamp(activity.startTime);
          if (!converted) {
            throw new Error(`Could not parse start time: "${activity.startTime}"`);
          }
          startTimeMs = converted.timestamp;
        } else {
          startTimeMs = activity.startTime;
        }
        
        // Process end time
        if (typeof activity.endTime === "string") {
          const converted = convertToTimestamp(activity.endTime);
          if (!converted) {
            throw new Error(`Could not parse end time: "${activity.endTime}"`);
          }
          endTimeMs = converted.timestamp;
        } else {
          endTimeMs = activity.endTime;
        }
        
        return {
          activityId: activity.activityId,
          name: activity.name,
          type: activity.type,
          startTime: startTimeMs,
          endTime: endTimeMs,
        };
      })
    );
    
    // Check if a schedule for this date already exists
    const existingSchedules = await ctx.db
      .query("dailySchedules")
      .filter((q) => q.eq(q.field("date"), dateTimestamp))
      .collect();
    
    if (existingSchedules.length > 0) {
      // Update existing schedule
      await ctx.db.patch(existingSchedules[0]._id, {
        scheduledActivities: processedActivities,
        confirmed: true
      });
      return existingSchedules[0]._id;
    } else {
      // Create new schedule
      return await ctx.db.insert("dailySchedules", {
        date: dateTimestamp,
        confirmed: true,
        scheduledActivities: processedActivities
      });
    }
  },
});

// Get a daily schedule by date
export const getDailySchedule = query({
  args: { 
    date: v.union(v.number(), v.string()) // Accept timestamp or date string
  },
  handler: async (ctx, args) => {
    // Convert date to midnight timestamp if it's a string
    let dateTimestamp: number;
    
    if (typeof args.date === "string") {
      const parsed = chrono.parseDate(args.date);
      if (!parsed) {
        throw new Error(`Could not parse date: "${args.date}"`);
      }
      dateTimestamp = getMidnightTimestamp(parsed);
    } else {
      // If it's already a timestamp, ensure it's set to midnight
      dateTimestamp = getMidnightTimestamp(new Date(args.date));
    }
    
    // Query the database for the schedule on this date
    const schedules = await ctx.db
      .query("dailySchedules")
      .filter((q) => q.eq(q.field("date"), dateTimestamp))
      .collect();
    
    return schedules.length > 0 ? schedules[0] : null;
  },
});

// Get all confirmed daily schedules
export const getAllDailySchedules = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("dailySchedules")
      .filter((q) => q.eq(q.field("confirmed"), true))
      .collect();
  },
});

// Delete a daily schedule
export const deleteDailySchedule = mutation({
  args: { id: v.id("dailySchedules") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});