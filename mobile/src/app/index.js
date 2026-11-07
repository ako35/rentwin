import { Redirect } from "expo-router";
import { useAuth } from "../auth/AuthContext";

// Root "/" — sadece rol bazlı yönlendirme yapar.
// Gerçek içerik (saha)/ veya (admin)/ altında. Yönetici, en son kullandığı
// moda döner (auth/mode.js); kayıtlı mod yoksa yönetim paneli açılır.
export default function RootIndex() {
  const { user, loading, mode } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (user.roles?.includes("Administrator") && mode !== "saha") return <Redirect href="/(admin)" />;
  return <Redirect href="/(saha)" />;
}
