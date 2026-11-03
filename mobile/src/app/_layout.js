import { useEffect } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Redirect, Slot } from "expo-router";
import { AuthProvider } from "../auth/AuthContext";
import { useAuth } from "../auth/AuthContext";
import { reconcileQueueOnStart, flushQueue } from "../queue/upload-queue";

// Inner component so it can consume AuthContext
function RootRedirect() {
  const { user, loading } = useAuth();

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

  if (loading) return null; // splash/loading handled by Expo

  if (!user) return <Redirect href="/login" />;

  // Admin rolüne sahip kullanıcı → admin dashboard
  if (user.roles?.includes("Administrator")) return <Redirect href="/(admin)" />;

  // Diğer yetkili kullanıcılar → saha ekranı
  return <Redirect href="/(saha)" />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
