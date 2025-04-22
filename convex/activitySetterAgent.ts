'use node'

import { api } from "./_generated/api";
import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolExecutor } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { Id } from "./_generated/dataModel";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { AgentExecutor } from "langchain/agents";
import { createOpenAIToolsAgent } from "langchain/agents";
import * as chrono from 'chrono-node'; // Import chrono-node for natural language date parsing

// Logger configuration
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Default to ERROR level in production, DEBUG in development
const DEFAULT_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'ERROR' : 'DEBUG';

// Logger function
function logger(level: LogLevel, message: string, metadata?: any) {
  const currentLevel = (process.env.LOG_LEVEL as LogLevel) || DEFAULT_LOG_LEVEL;
  
  if (LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]) {
    const timestamp = new Date().toISOString();
    const metadataStr = metadata ? `\n${JSON.stringify(metadata, null, 2)}` : '';
    
    // In a real app, you might want to use a proper logging service
    (console as any)[level.toLowerCase()](`[${timestamp}] [${level}] ${message}${metadataStr}`);
    
    // You could add additional logging destinations here:
    // - Send to a logging service
    // - Write to a file
    // - Send to monitoring system
  }
}

// Create a Convex client
const createConvexClient = () => {
  // In a real application, you'd get this from environment variables
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "https://gaudy-robin-585.convex.cloud";
  logger('INFO', 'Creating Convex client', { convexUrl });
  return new ConvexHttpClient(convexUrl);
};

// Tool for creating a calendar activity
const createActivityTool = (client: ConvexHttpClient) => {
  return new DynamicStructuredTool({
    name: "create_activity",
    description: "Create a new activity in the calendar",
    schema: z.object({
      name: z.string().describe("The name of the activity"),
      type: z.string().describe("The type of the activity (e.g., 'meeting', 'workout', 'reminder')"),
      startTime: z.union([
        z.number().describe("Start time as timestamp in milliseconds"), 
        z.string().describe("Start time as a date string (e.g., 'tomorrow at 3pm', 'April 23, 2025 at 10am')")
      ]),
      endTime: z.union([
        z.number().describe("End time as timestamp in milliseconds"),
        z.string().describe("End time as a date string (e.g., 'tomorrow at 5pm', 'April 23, 2025 at 11am')")
      ]),
    }),
    func: async ({ name, type, startTime, endTime }) => {
      logger('DEBUG', 'Creating activity', { name, type, startTime, endTime });
      try {
        const result = await client.mutation(api.activities.create, {
          name,
          type,
          startTime, // Backend will handle string or number
          endTime,   // Backend will handle string or number
        });
        logger('INFO', 'Activity created successfully', { id: result, name });
        return `Successfully created activity "${name}" with ID: ${result}`;
      } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        logger('ERROR', 'Failed to create activity', { 
          error: errorMessage, 
          errorObject: error,
          activityData: { name, type, startTime, endTime }
        });
        return `Failed to create activity: ${errorMessage}`;
      }
    },
  });
};

// Tool for updating a calendar activity
const updateActivityTool = (client: ConvexHttpClient) => {
  return new DynamicStructuredTool({
    name: "update_activity",
    description: "Update an existing activity in the calendar",
    schema: z.object({
      id: z.string().describe("The ID of the activity to update"),
      name: z.string().optional().describe("The new name of the activity"),
      type: z.string().optional().describe("The new type of the activity"),
      startTime: z.union([
        z.number().optional().describe("New start time as timestamp in milliseconds"),
        z.string().optional().describe("New start time as a date string (e.g., 'tomorrow at 3pm')")
      ]),
      endTime: z.union([
        z.number().optional().describe("New end time as timestamp in milliseconds"),
        z.string().optional().describe("New end time as a date string (e.g., 'tomorrow at 5pm')")
      ]),
    }),
    func: async ({ id, name, type, startTime, endTime }) => {
      logger('DEBUG', 'Updating activity', { id, name, type, startTime, endTime });
      try {
        // Convert string to Convex ID
        const activityId = id as unknown as Id<"activities">;
        
        await client.mutation(api.activities.update, {
          id: activityId,
          name,
          type,
          startTime, // Backend will handle string or number
          endTime,   // Backend will handle string or number
        });
        logger('INFO', 'Activity updated successfully', { id });
        return `Successfully updated activity "${id}"`;
      } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        logger('ERROR', 'Failed to update activity', { 
          error: errorMessage, 
          errorObject: error,
          activityData: { id, name, type, startTime, endTime } 
        });
        return `Failed to update activity: ${errorMessage}`;
      }
    },
  });
};

// Tool for deleting a calendar activity
const deleteActivityTool = (client: ConvexHttpClient) => {
  return new DynamicStructuredTool({
    name: "delete_activity",
    description: "Delete an activity from the calendar",
    schema: z.object({
      id: z.string().describe("The ID of the activity to delete"),
    }),
    func: async ({ id }) => {
      logger('DEBUG', 'Deleting activity', { id });
      try {
        // We need to properly handle the conversion of the string ID to a Convex ID
        // The direct casting approach was causing validation errors
        await client.mutation(api.activities.remove, { 
          id: id as any // This allows Convex to parse the ID correctly
        });
        logger('INFO', 'Activity deleted successfully', { id });
        return `Successfully deleted activity "${id}"`;
      } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        logger('ERROR', 'Failed to delete activity', { 
          error: errorMessage, 
          errorObject: error,
          activityId: id
        });
        return `Failed to delete activity: ${errorMessage}`;
      }
    },
  });
};

// Tool for listing all activities
const listActivitiesTool = (client: ConvexHttpClient) => {
  return new DynamicStructuredTool({
    name: "list_activities",
    description: "List all activities in the calendar",
    schema: z.object({}),
    func: async () => {
      logger('DEBUG', 'Listing all activities');
      try {
        const activities = await client.query(api.activities.getAll);
        logger('INFO', 'Activities retrieved successfully', { count: activities.length });
        return JSON.stringify(activities, null, 2);
      } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        logger('ERROR', 'Failed to list activities', { 
          error: errorMessage, 
          errorObject: error 
        });
        return `Failed to list activities: ${errorMessage}`;
      }
    },
  });
};

// Tool for finding activities by time range
const findActivitiesByTimeTool = (client: ConvexHttpClient) => {
  return new DynamicStructuredTool({
    name: "find_activities_by_time",
    description: "Find activities within a time range",
    schema: z.object({
      startTime: z.union([
        z.number().describe("Start time as timestamp in milliseconds"),
        z.string().describe("Start time as a date string (e.g., 'tomorrow at 3pm', 'April 23, 2025')")
      ]),
      endTime: z.union([
        z.number().describe("End time as timestamp in milliseconds"),
        z.string().describe("End time as a date string (e.g., 'tomorrow at 5pm', 'April 24, 2025')")
      ]),
    }),
    func: async ({ startTime, endTime }) => {
      logger('DEBUG', 'Finding activities by time range', { startTime, endTime });
      try {
        const activities = await client.query(api.activities.getByTimeRange, { 
          startTime, // Backend will handle string or number
          endTime    // Backend will handle string or number
        });
        logger('INFO', 'Activities by time range retrieved successfully', { 
          range: { startTime, endTime },
          count: activities.length
        });
        return JSON.stringify(activities, null, 2);
      } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        logger('ERROR', 'Failed to find activities by time range', { 
          error: errorMessage, 
          errorObject: error,
          timeRange: { startTime, endTime }
        });
        return `Failed to find activities: ${errorMessage}`;
      }
    },
  });
};

// Tool for saving confirmed daily schedules
const saveDailyScheduleTool = (client: ConvexHttpClient) => {
  return new DynamicStructuredTool({
    name: "save_daily_schedule",
    description: "Save a confirmed daily schedule with all activities for the day",
    schema: z.object({
      date: z.union([
        z.number().describe("Date as timestamp in milliseconds (midnight of the day)"),
        z.string().describe("Date as a string (e.g., 'today', 'tomorrow', 'April 23, 2025')")
      ]),
      scheduledActivities: z.array(
        z.object({
          activityId: z.string().optional().describe("Optional ID of an existing activity"),
          name: z.string().describe("Name of the activity"),
          type: z.string().describe("Type of the activity"),
          startTime: z.union([
            z.number().describe("Start time as timestamp in milliseconds"),
            z.string().describe("Start time as a date string")
          ]),
          endTime: z.union([
            z.number().describe("End time as timestamp in milliseconds"),
            z.string().describe("End time as a date string")
          ])
        })
      ).describe("Array of activities scheduled for this day")
    }),
    func: async ({ date, scheduledActivities }) => {
      logger('DEBUG', 'Saving daily schedule', { date, activitiesCount: scheduledActivities.length });
      try {
        // Process activities - keeping the activityId as optional and handling it appropriately
        const processedActivities = scheduledActivities.map(activity => {
          // Create a new object with all properties except activityId
          const { activityId, ...rest } = activity;
          
          // If activityId exists, add it back with proper type handling
          if (activityId) {
            return {
              ...rest,
              activityId: activityId as unknown as Id<"activities">
            };
          }
          
          // If no activityId, return without it
          return rest;
        });
        
        const result = await client.mutation(api.activities.saveDailySchedule, {
          date,
          scheduledActivities: processedActivities
        });
        
        logger('INFO', 'Daily schedule saved successfully', { scheduleId: result });
        return `Successfully saved the daily schedule with ID: ${result}`;
      } catch (error: any) {
        const errorMessage = error?.message || "Unknown error";
        logger('ERROR', 'Failed to save daily schedule', { 
          error: errorMessage, 
          errorObject: error,
          date,
          activitiesCount: scheduledActivities.length
        });
        return `Failed to save daily schedule: ${errorMessage}`;
      }
    }
  });
};


// Create and configure the agent
export async function createCalendarAgent() {
  logger('INFO', 'Creating calendar agent');
  try {
    // Initialize the LLM
    const llm = new ChatOpenAI({
      // Always load API key from environment variables, never hardcode
      // If the API key is not available, the library will throw a proper error
      modelName: "gpt-4-turbo",
      temperature: 0.7,
    });
    logger('DEBUG', 'LLM initialized');

    // Create Convex client
    const client = createConvexClient();

    // Create tools for the agent
    const tools = [
      createActivityTool(client),
      updateActivityTool(client),
      deleteActivityTool(client),
      listActivitiesTool(client),
      findActivitiesByTimeTool(client),
      saveDailyScheduleTool(client),
    ];
    logger('DEBUG', 'Agent tools initialized', { toolCount: tools.length });

    const toolExecutor = new ToolExecutor({
      tools,
    });

    // Create system message
    const systemMessage = `You are a personal coach and assistant that can create, update, and delete activities. 
    
    You have access to the following tools:
    - create_activity: Create a new activity with name, type, start time, and end time
    - update_activity: Update an existing activity's details
    - delete_activity: Remove an activity from the calendar
    - list_activities: Show all calendar activities
    - find_activities_by_time: Find activities within a time range
    - save_daily_schedule: Save a confirmed daily schedule with all activities for a specific day

    HANDLING DATES: 
    You can use natural language or formatted dates directly in your tools. The backend will handle parsing dates like "tomorrow at 3pm", "next Monday at 10am", or "April 23, 2025".

    SAVING DAILY SCHEDULES:
    When a user indicates they are satisfied with the planned activities for an entire day, you should save the complete schedule using the save_daily_schedule tool. Look for phrases like "looks good", "that works for me", "I'm happy with this schedule", "finalize my schedule", etc.
    
    After saving the schedule, let the user know their daily schedule has been confirmed and saved.

    EXAMPLE INTERACTIONS:
    User: "I want to schedule a workout for tomorrow"  
    You: "Great. I have assigned a workout at 2pm to 4pm, as this was an available slot on your schedule!"
    
    User: "I want to study, but I also want to work out"
    You: "No problem. I have scheduled a workout at 2pm to 4pm, and study time from 4:30pm to 6:30pm. You can do this!"
    
    User: "That looks good to me"
    You: "I've saved your schedule for tomorrow. Your confirmed activities are: workout from 2pm to 4pm and study from 4:30pm to 6:30pm. Have a productive day!"`;

    // Define our prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemMessage],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create an agent from our tools
    logger('DEBUG', 'Creating OpenAI tools agent');
    const agent = await createOpenAIToolsAgent({
      llm,
      tools,
      prompt,
    });

    // Create an executor from the agent
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 6, // Reduced max iterations to prevent long loops
      returnIntermediateSteps: true, // Helpful for debugging
      verbose: true, // Enable verbose logging for debugging
    });
    logger('INFO', 'Agent executor created successfully');

    // Set up message history
    const messageHistory = new ChatMessageHistory();

    // Return the agent interface
    return {
      invoke: async (message: string) => {
        const messageId = generateUniqueId();
        try {
          logger('INFO', 'Agent invocation', { messageId, message });
          // Add the user message to history
          await messageHistory.addUserMessage(message);
          
          // Get chat history
          const chatHistory = await messageHistory.getMessages();
          
          // Execute agent with history
          logger('DEBUG', 'Executing agent', { messageId });
          const response = await agentExecutor.invoke({
            input: message,
            chat_history: chatHistory,
          });
          logger('INFO', 'Agent execution completed', { messageId });

          // Add the agent response to history
          await messageHistory.addAIMessage(response.output);
          
          return chatHistory;
        } catch (error: any) {
          const errorMessage = error?.message || "Unknown error";
          logger('ERROR', 'Error in agent invocation', {
            messageId,
            error: errorMessage,
            stack: error?.stack,
            userMessage: message
          });
          // Re-throw or handle as needed
          throw error;
        }
      },
    };
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error";
    logger('ERROR', 'Failed to create calendar agent', { 
      error: errorMessage,
      stack: error?.stack
    });
    throw error;
  }
}

// Helper function to generate a unique ID for tracing requests
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Helper function to convert date string to millisecond timestamp
export function dateToTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

// Helper function to format millisecond timestamp as a readable date
export function timestampToDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}