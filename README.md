# AddyApp

AddyApp is a personal calendar and scheduling mobile app built with Expo (React Native).  
It uses Convex as the backend for storing activities, daily schedules, and long‑term user feedback ("memories"), and includes an AI-powered Calendar Assistant (LangChain + OpenAI) to help create, update, and confirm schedules.

Quick links
- App entry / calendar UI: [app/index.tsx](app/index.tsx)
- Create activity screen: [app/hello.tsx](app/hello.tsx)
- Edit activity screen: [app/edit.tsx](app/edit.tsx)
- Calendar assistant UI: [app/assistant.tsx](app/assistant.tsx)
- To-do placeholder: [app/todo.tsx](app/todo.tsx)
- Shared layout / Convex provider: [app/_layout.tsx](app/_layout.tsx)

Backend (Convex)
- Data model / schema: [convex/schema.ts](convex/schema.ts)
- Server-side functions: [convex/activities.ts](convex/activities.ts) — key exported functions:
  - [`activities.create`](convex/activities.ts)
  - [`activities.getAll`](convex/activities.ts)
  - [`activities.getById`](convex/activities.ts)
  - [`activities.getByTimeRange`](convex/activities.ts)
  - [`activities.getByDate`](convex/activities.ts)
  - [`activities.update`](convex/activities.ts)
  - [`activities.remove`](convex/activities.ts)
  - [`activities.saveDailySchedule`](convex/activities.ts)
  - [`activities.getDailySchedule`](convex/activities.ts)
  - [`activities.getAllDailySchedules`](convex/activities.ts)
  - [`activities.deleteDailySchedule`](convex/activities.ts)
  - [`activities.storeMemory`](convex/activities.ts)
  - [`activities.getAllMemories`](convex/activities.ts)

- Date parsing helper: [`convertToTimestamp`](convex/activities.ts)
- AI assistant agent (creates/edits/deletes activities, saves schedules, stores memories): [convex/activitySetterAgent.ts](convex/activitySetterAgent.ts) — main export: [`createCalendarAgent`](convex/activitySetterAgent.ts)

Generated Convex client types / API
- Generated API helpers: [convex/_generated/api.js](convex/_generated/api.js) / [convex/_generated/api.d.ts](convex/_generated/api.d.ts)
- Generated server wrappers: [convex/_generated/server.js](convex/_generated/server.js) / [convex/_generated/server.d.ts](convex/_generated/server.d.ts)
- Generated data model types: [convex/_generated/dataModel.d.ts](convex/_generated/dataModel.d.ts)

Features
- Native calendar view with hour grid and draggable-like activity cards (visual layout): [app/index.tsx](app/index.tsx)
- Create and edit activities with time pickers: [app/hello.tsx](app/hello.tsx), [app/edit.tsx](app/edit.tsx)
- AI assistant that uses LangChain + OpenAI to manage activities and save confirmed daily schedules: [convex/activitySetterAgent.ts](convex/activitySetterAgent.ts) and UI [app/assistant.tsx](app/assistant.tsx)
- Convex functions handle natural language date parsing (chrono) and timezone adjustments: [convex/activities.ts](convex/activities.ts)
- Persistent daily schedules and long-term user memories stored in Convex (see schema): [convex/schema.ts](convex/schema.ts)

Getting started (local)
1. Install deps
   ```bash
   npm install
   ```
2. Set environment variables (required)
   - EXPO_PUBLIC_CONVEX_URL — your Convex deployment URL
   - EXPO_PUBLIC_OPENAI_API_KEY — OpenAI API key (used by the local agent)
   Example (macOS / Linux):
   ```bash
   export EXPO_PUBLIC_CONVEX_URL="https://your.convex.app"
   export EXPO_PUBLIC_OPENAI_API_KEY="sk-..."
   ```
3. Start Convex dev (if you run local Convex functions)
   ```bash
   npx convex dev
   ```
   This also regenerates files under [convex/_generated](convex/_generated).

4. Start the app (Expo)
   ```bash
   npx expo start
   ```

Notes for developers
- The assistant is created by [`createCalendarAgent`](convex/activitySetterAgent.ts) and uses tools that call Convex functions; if the assistant errors on init, check env vars (OpenAI key, Convex URL).
- Date parsing is handled in [`convertToTimestamp`](convex/activities.ts) (chrono-node + timezone adjustment).
- The app uses Convex React client in [app/_layout.tsx](app/_layout.tsx); ensure `EXPO_PUBLIC_CONVEX_URL` is correct.
- To add new backend capabilities, update [convex/schema.ts](convex/schema.ts) and implement functions in [convex/activities.ts](convex/activities.ts) (or add new modules), then run `npx convex dev`.

Project structure (high level)
- app/ — Expo app screens and UI components ([app/index.tsx](app/index.tsx), [app/assistant.tsx](app/assistant.tsx), [app/hello.tsx](app/hello.tsx), [app/edit.tsx](app/edit.tsx), [app/todo.tsx](app/todo.tsx), [app/_layout.tsx](app/_layout.tsx))
- convex/ — Convex functions, schema, and generated types ([convex/activities.ts](convex/activities.ts), [convex/activitySetterAgent.ts](convex/activitySetterAgent.ts), [convex/schema.ts](convex/schema.ts))
- convex/_generated/ — codegen from Convex (do not edit)

If you want a shorter README or one tailored for publishing to GitHub with badges and screenshots, say which sections to include.
