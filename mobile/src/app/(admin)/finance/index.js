import { useState, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet, RefreshControl, Pressable,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { getFleetStats, getInvoicePendingContracts, getHgsPendingContracts } from "../../../api/admin";
import { useBranch } from "../../../context/BranchContext";
import { LoadingScreen, ErrorBanner, SectionCard, StatTile } from "../../../components/admin";
import { COLORS } from "../../../constants/theme";

export default function FinanceScreen() {
  const { selectedBranchId } = useBranch();
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(false);
  const [fleetStats, setFleetStats] = useState(null);
  const [invoicePending, setInvoicePending] = useState([]);
  const [hgsPending, setHgsPending] = useState([]);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [stats, inv, hgs] = await Promise.all([
        getFleetStats(selectedBranchId).catch(() => null),
        getInvoicePendingContracts(selectedBranchId).catch(() => []),
        getHgsPendingContracts(selectedBranchId).catch(() => []),
      ]);
      setFleetStats(stats);
      setInvoicePending(Array.isArray(inv) ? inv : []);
      setHgsPending(Array.isArray(hgs) ? hgs : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading && !fleetStats) return <LoadingScreen />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      showsVerticalScrollIndicator={false}
    >
      {error && <ErrorBanner message="Veriler yüklenemedi." onRetry={load} />}

      {/* Filo Özeti */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Filo Özeti</Text>
        <View style={styles.statRow}>
          <StatTile label="Toplam Araç"  value={fleetStats?.total} />
          <View style={styles.divider} />
          <StatTile label="Kirada"       value={fleetStats?.rented} color={COLORS.green} />
          <View style={styles.divider} />
          <StatTile label="Doluluk"      value={`%${fleetStats?.occupancyRate ?? 0}`} color={COLORS.green} />
        </View>
      </SectionCard>

      {/* Fatura Bekleyenler */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Fatura Kesilecekler ({invoicePending.length})</Text>
        {invoicePending.length === 0 ? (
          <View style={styles.clearRow}>
            <Text style={styles.clearIcon}>✅</Text>
            <Text style={styles.clearText}>Bekleyen fatura yok</Text>
          </View>
        ) : (
          invoicePending.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.pendingRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/(admin)/contracts/${c.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingPlate}>{c.car?.licensePlate || "—"}</Text>
                <Text style={styles.pendingCustomer}>{c.user?.name || "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.pendingNo}>{c.contractNo || c.id?.slice(0, 8)}</Text>
                <Text style={styles.pendingArrow}>›</Text>
              </View>
            </Pressable>
          ))
        )}
      </SectionCard>

      {/* HGS Bekleyenler */}
      <SectionCard>
        <Text style={styles.sectionTitle}>HGS Bekleyenler ({hgsPending.length})</Text>
        {hgsPending.length === 0 ? (
          <View style={styles.clearRow}>
            <Text style={styles.clearIcon}>✅</Text>
            <Text style={styles.clearText}>Bekleyen HGS girişi yok</Text>
          </View>
        ) : (
          hgsPending.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.pendingRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/(admin)/contracts/${c.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingPlate}>{c.car?.licensePlate || "—"}</Text>
                <Text style={styles.pendingCustomer}>{c.user?.name || "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.pendingNo}>{c.contractNo || c.id?.slice(0, 8)}</Text>
                <Text style={styles.pendingArrow}>›</Text>
              </View>
            </Pressable>
          ))
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.canvas },
  content:      { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  statRow:      { flexDirection: "row", alignItems: "center" },
  divider:      { width: 1, height: 36, backgroundColor: COLORS.line, marginHorizontal: 8 },
  clearRow:     { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  clearIcon:    { fontSize: 18 },
  clearText:    { color: COLORS.muted, fontSize: 13 },
  pendingRow:   {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  pendingPlate:    { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  pendingCustomer: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  pendingNo:       { fontSize: 12, color: COLORS.subtle },
  pendingArrow:    { fontSize: 18, color: COLORS.muted, marginTop: 2 },
});

