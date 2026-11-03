import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../../auth/AuthContext";
import { COLORS } from "../../../constants/theme";

function MenuItem({ emoji, label, onPress, danger }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Text style={styles.menuEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profil */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || "A"}
          </Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user?.name || "Admin"}</Text>
          <Text style={styles.profileEmail}>{user?.email || ""}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Yönetici</Text>
          </View>
        </View>
      </View>

      {/* Finans */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Finans</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            emoji="💰"
            label="Finans Özeti"
            onPress={() => router.push("/(admin)/finance")}
          />
        </View>
      </View>

      {/* Hesap */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Hesap</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            emoji="🚪"
            label="Çıkış Yap"
            onPress={confirmLogout}
            danger
          />
        </View>
      </View>

      <Text style={styles.version}>Rentwin Admin · v1.0</Text>
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
  sectionLabel: { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.8 },

  menuGroup:  {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: "hidden",
  },
  menuItem:   { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  menuPressed:{ opacity: 0.7 },
  menuIcon:       { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center" },
  menuIconDanger: { backgroundColor: COLORS.redSoft },
  menuEmoji:  { fontSize: 18 },
  menuLabel:  { flex: 1, fontSize: 14, color: COLORS.ink, fontWeight: "600" },
  menuLabelDanger: { color: COLORS.red },
  menuArrow:  { color: COLORS.subtle, fontSize: 20 },

  version: { textAlign: "center", color: COLORS.subtle, fontSize: 11, marginTop: 20 },
});
