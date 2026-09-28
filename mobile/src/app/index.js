import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { getSchedule } from "../api/client";
import { subscribeQueue, getQueue } from "../queue/upload-queue";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("tr-TR");

const Section = ({ title, rows, loading, stage, onOpen }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {loading ? (
      <ActivityIndicator style={{ marginVertical: 16 }} />
    ) : rows.length === 0 ? (
      <Text style={styles.empty}>Liste boş.</Text>
    ) : (
      rows.map((row) => (
        <Pressable key={row.id} style={styles.row} onPress={() => onOpen(row, stage)}>
          <View>
            <Text style={styles.plate}>{row.car?.licensePlate || "—"}</Text>
            <Text style={styles.rowSub}>
              {row.car?.brand} {row.car?.model} · {row.contractNo || "kontrat no yok"}
            </Text>
            <Text style={styles.rowSub}>
              {row.user?.companyTitle || `${row.user?.firstName || ""} ${row.user?.lastName || ""}`.trim()}
            </Text>
          </View>
          <Text style={styles.rowDate}>
            {fmtDate(stage === "PICKUP" ? row.pickUpTime : row.dropOffTime)}
          </Text>
        </Pressable>
      ))
    )}
  </View>
);

export default function ScheduleScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const [departures, setDepartures] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    const [d, r] = await Promise.all([getSchedule("departures"), getSchedule("returns")]);
    setDepartures(d);
    setReturns(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  useEffect(() => {
    getQueue().then((q) => setPendingCount(q.length));
    return subscribeQueue((q) => setPendingCount(q.length));
  }, []);

  if (!authLoading && !user) return <Redirect href="/login" />;

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openContract = (row, stage) => {
    router.push({ pathname: "/contract/[id]", params: { id: row.id, stage, plate: row.car?.licensePlate || "" } });
  };

  return (
    <FlatList
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={[{ key: "content" }]}
      renderItem={() => (
        <>
          {pendingCount > 0 && (
            <View style={styles.queueBanner}>
              <Text style={styles.queueBannerText}>
                {pendingCount} fotoğraf yüklenmeyi bekliyor
              </Text>
            </View>
          )}
          <Section title="Bugün Teslim Alınacaklar" rows={departures} loading={loading} stage="PICKUP" onOpen={openContract} />
          <Section title="Bugün İade Edilecekler" rows={returns} loading={loading} stage="RETURN" onOpen={openContract} />
          <Pressable style={styles.logout} onPress={logout}>
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </Pressable>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8, color: "#0f172a" },
  empty: { color: "#94a3b8", fontStyle: "italic" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  plate: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  rowSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  rowDate: { fontSize: 12, color: "#64748b" },
  queueBanner: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  queueBannerText: { color: "#92400e", fontWeight: "600", textAlign: "center" },
  logout: { alignItems: "center", marginTop: 16, padding: 12 },
  logoutText: { color: "#ef4444", fontWeight: "600" },
});
