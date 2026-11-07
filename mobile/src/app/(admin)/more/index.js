import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useAuth } from "../../../auth/AuthContext";
import { MenuItem } from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { personName } from "../../../utils/admin";

function MenuGroup({ label, items }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.menuGroup}>
        {items.map((item, i) => (
          <MenuItem key={item.label} {...item} last={i === items.length - 1} />
        ))}
      </View>
    </View>
  );
}

export default function MoreScreen() {
  const { user, logout } = useAuth();

  const confirmLogout = () => {
    Alert.alert("Çıkış Yap", "Hesaptan çıkmak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: logout },
    ]);
  };

  const name = personName(user);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.firstName || "A").charAt(0).toLocaleUpperCase("tr-TR")}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{name === "—" ? "Yönetici" : name}</Text>
          <Text style={styles.profileEmail}>{user?.email || ""}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Yönetici</Text>
          </View>
        </View>
      </View>

      <MenuGroup
        label="Saha"
        items={[
          {
            emoji: "📸",
            label: "Saha Modu",
            sub: "Günlük teslim / iade programı ve fotoğraf çekimi",
            onPress: () => router.replace("/(saha)"),
          },
        ]}
      />

      <MenuGroup
        label="Operasyon"
        items={[
          { emoji: "💰", label: "Finans Özeti", onPress: () => router.push("/(admin)/finance") },
          { emoji: "👥", label: "Kullanıcılar", sub: "Müşteriler ve yöneticiler", onPress: () => router.push("/(admin)/users") },
        ]}
      />

      <MenuGroup
        label="Yönetim"
        items={[
          { emoji: "🏢", label: "Şubeler", onPress: () => router.push("/(admin)/branches") },
          { emoji: "🚗", label: "Yeni Araç Ekle", onPress: () => router.push("/(admin)/vehicles/new") },
          { emoji: "🏷️", label: "Fiyat Listesi", sub: "Araç bazında günlük / aylık fiyatlar", onPress: () => router.push("/(admin)/price-list") },
          { emoji: "📣", label: "Duyurular", onPress: () => router.push("/(admin)/announcements") },
          { emoji: "⚙️", label: "Ayarlar", sub: "Sözleşme varsayılanları ve uyarı süreleri", onPress: () => router.push("/(admin)/settings") },
        ]}
      />

      <MenuGroup label="Hesap" items={[{ emoji: "🚪", label: "Çıkış Yap", onPress: confirmLogout, danger: true }]} />

      <Text style={styles.version}>Rentwin Admin · v{Constants.expoConfig?.version || "1.0"}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 16, paddingBottom: 40 },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatar:       { width: 54, height: 54, borderRadius: 16, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center" },
  avatarText:   { color: "#fff", fontSize: 22, fontWeight: "800" },
  profileName:  { fontSize: 17, fontWeight: "800", color: COLORS.ink },
  profileEmail: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  roleBadge:    { backgroundColor: COLORS.greenSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 6 },
  roleText:     { color: COLORS.green, fontSize: 11, fontWeight: "700" },

  section:      { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  menuGroup: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: "hidden",
  },

  version: { textAlign: "center", color: COLORS.subtle, fontSize: 11, marginTop: 20 },
});
