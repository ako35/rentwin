import { Redirect } from "expo-router";
import { useAuth } from "../auth/AuthContext";

// Root "/" — sadece rol bazlı yönlendirme yapar.
// Gerçek içerik (saha)/ veya (admin)/ altında.
export default function RootIndex() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (user.roles?.includes("Administrator")) return <Redirect href="/(admin)" />;
  return <Redirect href="/(saha)" />;
}
