import { Tabs, Redirect } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
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

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;
  if (!user.roles?.includes("Administrator")) return <Redirect href="/(saha)" />;

  return (
    <BranchProvider>
      <Tabs
        screenOptions={{
          ...SCREEN_HEADER,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
          tabBarActiveTintColor: COLORS.green,
          tabBarInactiveTintColor: COLORS.muted,
          headerTitleAlign: "center",
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
        {/* Detay ekranları tab bar'da gizlenir */}
        <Tabs.Screen
          name="contracts/[id]"
          options={{ href: null, title: "Kontrat Detayı" }}
        />
        <Tabs.Screen
          name="vehicles/[id]"
          options={{ href: null, title: "Araç Detayı" }}
        />
        <Tabs.Screen
          name="reservations/[id]"
          options={{ href: null, title: "Rezervasyon Detayı" }}
        />
        <Tabs.Screen
          name="finance/index"
          options={{ href: null, title: "Finans" }}
        />
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
  tabIcon:       { alignItems: "center", justifyContent: "center" },
  tabEmoji:      { fontSize: 20 },
  tabLabel:      { fontSize: 10, color: COLORS.muted, marginTop: 3, fontWeight: "600" },
  tabLabelActive: { color: COLORS.green },
});

