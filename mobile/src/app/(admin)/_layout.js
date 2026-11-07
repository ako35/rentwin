import { Tabs, Redirect, router } from "expo-router";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { BranchProvider } from "../../context/BranchContext";
import { COLORS, SCREEN_HEADER } from "../../constants/theme";

function TabIcon({ emoji, label, focused }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

// Tab bar'da görünmeyen ekranlar: geri butonu göster, geri basınca geçmişe dön.
function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(admin)"))}
      style={styles.backBtn}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Geri"
    >
      <Text style={styles.backText}>‹</Text>
    </Pressable>
  );
}

const hidden = (title) => ({
  href: null,
  title,
  headerLeft: () => <BackButton />,
});

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (!user.roles?.includes("Administrator")) return <Redirect href="/(saha)" />;

  return (
    <BranchProvider>
      <Tabs
        // Detay ekranları da sekme; "history" olmadan geri tuşu her zaman ilk
        // sekmeye (Dashboard) atlıyordu.
        backBehavior="history"
        screenOptions={{
          ...SCREEN_HEADER,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
          tabBarActiveTintColor: COLORS.green,
          tabBarInactiveTintColor: COLORS.muted,
          headerTitleAlign: "center",
          sceneStyle: { backgroundColor: COLORS.canvas },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Ana Sayfa" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="contracts/index"
          options={{
            title: "Kontratlar",
            tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Kontratlar" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="vehicles/index"
          options={{
            title: "Araçlar",
            tabBarIcon: ({ focused }) => <TabIcon emoji="🚗" label="Araçlar" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="reservations/index"
          options={{
            title: "Rezervasyonlar",
            tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="Rezervasyon" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="more/index"
          options={{
            title: "Daha Fazla",
            tabBarIcon: ({ focused }) => <TabIcon emoji="☰" label="Daha Fazla" focused={focused} />,
          }}
        />

        {/* Tab bar'da gizli ekranlar — buradaki her rota tanımlı olmalı, yoksa
            expo-router onu ayrı bir sekme olarak gösterir. */}
        <Tabs.Screen name="contracts/[id]" options={hidden("Kontrat Detayı")} />
        <Tabs.Screen name="vehicles/[id]" options={hidden("Araç Detayı")} />
        <Tabs.Screen name="vehicles/new" options={hidden("Yeni Araç")} />
        <Tabs.Screen name="vehicles/edit/[id]" options={hidden("Aracı Düzenle")} />
        <Tabs.Screen name="reservations/[id]" options={hidden("Rezervasyon Detayı")} />
        <Tabs.Screen name="pending/[type]" options={hidden("Bekleyenler")} />
        <Tabs.Screen name="finance/index" options={hidden("Finans")} />
        <Tabs.Screen name="users/index" options={hidden("Kullanıcılar")} />
        <Tabs.Screen name="users/[id]" options={hidden("Kullanıcı")} />
        <Tabs.Screen name="branches/index" options={hidden("Şubeler")} />
        <Tabs.Screen name="price-list/index" options={hidden("Fiyat Listesi")} />
        <Tabs.Screen name="announcements/index" options={hidden("Duyurular")} />
        <Tabs.Screen name="settings/index" options={hidden("Ayarlar")} />
      </Tabs>
    </BranchProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabIcon:        { alignItems: "center", justifyContent: "center", minWidth: 64 },
  tabEmoji:       { fontSize: 20 },
  tabLabel:       { fontSize: 10, color: COLORS.muted, marginTop: 3, fontWeight: "600" },
  tabLabelActive: { color: COLORS.green },
  backBtn:        { paddingHorizontal: 14, paddingVertical: 4 },
  backText:       { fontSize: 30, lineHeight: 32, color: COLORS.ink, fontWeight: "500" },
});
