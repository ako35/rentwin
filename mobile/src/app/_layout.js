import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Slot } from "expo-router";
import { AuthProvider } from "../auth/AuthContext";
import { reconcileQueueOnStart, flushQueue } from "../queue/upload-queue";

function QueueSync() {
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

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueueSync />
      <Slot />
    </AuthProvider>
  );
}
