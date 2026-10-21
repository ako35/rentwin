import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import { AuthProvider } from "../auth/AuthContext";
import { reconcileQueueOnStart, flushQueue } from "../queue/upload-queue";
import { COLORS, SCREEN_HEADER } from "../constants/theme";

export default function RootLayout() {
  useEffect(() => {
    reconcileQueueOnStart().then(flushQueue);

    const netSub = NetInfo.addEventListener((state) => {
      if (state.isConnected) flushQueue();
    });
    const appSub = AppState.addEventListener("change", (next) => {
      if (next === "active") flushQueue();
    });

    return () => {
      netSub();
      appSub.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          ...SCREEN_HEADER,
          headerTitleAlign: "center",
          contentStyle: { backgroundColor: COLORS.canvas },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="contract/[id]" options={{ title: "Kontrat" }} />
        <Stack.Screen name="capture/[id]" options={{ title: "Fotoğraflar" }} />
      </Stack>
    </AuthProvider>
  );
}
