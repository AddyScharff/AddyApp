import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Activities" }} />
        <Stack.Screen name="hello" options={{ title: "Create Activity" }} />
        <Stack.Screen name="edit" options={{ title: "Edit Activity" }} />
        <Stack.Screen name="assistant" options={{ title: "Calendar Assistant" }} />
      </Stack>
    </ConvexProvider>
  );
}