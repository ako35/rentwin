import { useEffect } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import * as Updates from "expo-updates";
import { COLORS } from "../constants/theme";

// expo-updates only checks at cold start and applies on the *next* cold
// start, so a published fix needed two restarts to show up. Re-check whenever
// the app comes to the foreground, download in the background, and offer a
// one-tap restart once it's ready. Queued uploads survive the restart (the
// queue is persisted and reconciled on launch).
const checkAndFetch = async () => {
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // offline or update server unreachable — the next foreground retries
  }
};

export default function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (!Updates.isEnabled) return undefined; // dev server / Expo Go
    checkAndFetch();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAndFetch();
    });
    return () => sub.remove();
  }, []);

  if (!Updates.isEnabled || !isUpdatePending) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.copy}>
        <Text style={styles.title}>Yeni sürüm hazır</Text>
        <Text style={styles.text}>Uygulamayı yenileyerek son değişiklikleri al.</Text>
      </View>
      <Pressable
        onPress={() => Updates.reloadAsync().catch(() => {})}
        style={styles.button}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Yenile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.greenSoft,
    borderRadius: 16,
    padding: 13,
    marginBottom: 16,
  },
  copy: { flex: 1, marginRight: 10 },
  title: { color: COLORS.green, fontSize: 13, fontWeight: "800" },
  text: { color: COLORS.green, fontSize: 11, marginTop: 2 },
  button: { backgroundColor: COLORS.green, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 9 },
  buttonText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
