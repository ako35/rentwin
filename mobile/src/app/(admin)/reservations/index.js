import { useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { getReservationsByPage } from "../../../api/admin";
import {
  LoadingScreen, ErrorBanner, StatusBadge, EmptyState,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";

const STATUS_FILTERS = [
  { key: null,        label: "Tümü" },
  { key: "PENDING",   label: "Bekliyor" },
  { key: "CONFIRMED", label: "Onaylandı" },
  { key: "CANCELLED", label: "İptal" },
];

function ReservationRow({ item, onPress }) {
  const customer = item.user?.name || item.name || "—";
  const vehicle  = item.car ? `${item.car.brand || ""} ${item.car.model || ""}`.trim() : "Araç seçilmedi";
  const pickup   = item.pickUpTime
    ? new Date(item.pickUpTime).toLocaleDateString("tr-TR")
    : "—";
  const dropoff  = item.dropOffTime
    ? new Date(item.dropOffTime).toLocaleDateString("tr-TR")
    : "—";

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.customer} numberOfLines={1}>{customer}</Text>
        <Text style={styles.vehicle} numberOfLines={1}>{vehicle}</Text>
        <Text style={styles.dates}>{pickup} → {dropoff}</Text>
      </View>
      <View style={styles.rowRight}>
        <StatusBadge status={item.status} />
        <Text style={styles.resNo}>{item.reservationNo || item.id?.slice(0, 8)}</Text>
      </View>
    </Pressable>
  );
}

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(false);
  const [statusFilter, setStatus]       = useState(null);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      setError(false);
      const params = {
        page: p,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
      };
      const data = await getReservationsByPage(params);
      const rows = Array.isArray(data) ? data : (data.reservations || data.rows || []);
      const total = data.total || rows.length;
      setReservations((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(p * 20 < total);
      setPage(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1, false);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  };

  if (loading && !reservations.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={String(f.key)}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => { setStatus(f.key); setLoading(true); }}
          >
            <Text style={[styles.filterLabel, statusFilter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <ErrorBanner message="Rezervasyonlar yüklenemedi." onRetry={() => load(1)} />}

      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReservationRow
            item={item}
            onPress={() => router.push(`/(admin)/reservations/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="📅" title="Rezervasyon bulunamadı" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />
        }
        onEndReached={() => { if (hasMore && !loading) load(page + 1, true); }}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: COLORS.canvas },
  filterRow:        { flexDirection: "row", padding: 12, paddingBottom: 6, gap: 8 },
  filterChip:       { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  filterChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterLabel:      { fontSize: 12, color: COLORS.muted, fontWeight: "600" },
  filterLabelActive:{ color: "#fff" },
  list:             { padding: 12, paddingTop: 4, gap: 8 },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  rowPressed: { opacity: 0.75 },
  rowLeft:    { flex: 1, marginRight: 10 },
  customer:   { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  vehicle:    { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  dates:      { fontSize: 12, color: COLORS.subtle, marginTop: 6 },
  rowRight:   { alignItems: "flex-end", gap: 6 },
  resNo:      { fontSize: 11, color: COLORS.muted, marginTop: 4 },
});

