import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import { AuthProvider } from "../auth/AuthContext";
import { reconcileQueueOnStart, flushQueue } from "../queue/upload-queue";

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
      <Stack screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: "Rentwin Saha" }} />
        <Stack.Screen name="contract/[id]" options={{ title: "Araç Fotoğrafları" }} />
      </Stack>
    </AuthProvider>
  );
}
