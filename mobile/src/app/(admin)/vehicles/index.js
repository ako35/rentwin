import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
  Image,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { getVehiclesByPage } from "../../../api/admin";
import { useBranch } from "../../../context/BranchContext";
import {
  LoadingScreen,
  ErrorBanner,
  EmptyState,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";

const STATUS_FILTERS = [
  { key: null,     label: "Tümü" },
  { key: "active", label: "Aktif" },
  { key: "rented", label: "Kirada" },
  { key: "passive",label: "Pasif" },
];

function VehicleStatusDot({ vehicle }) {
  if (vehicle.outOfService) return <View style={[styles.dot, { backgroundColor: COLORS.red }]} />;
  if (vehicle.passiveAt)    return <View style={[styles.dot, { backgroundColor: COLORS.muted }]} />;
  if (vehicle.isRented)     return <View style={[styles.dot, { backgroundColor: COLORS.amber }]} />;
  return <View style={[styles.dot, { backgroundColor: COLORS.green }]} />;
}

function VehicleStatusLabel({ vehicle }) {
  if (vehicle.outOfService) return <Text style={[styles.statusLabel, { color: COLORS.red }]}>Servis Dışı</Text>;
  if (vehicle.passiveAt)    return <Text style={[styles.statusLabel, { color: COLORS.muted }]}>Pasif</Text>;
  if (vehicle.isRented)     return <Text style={[styles.statusLabel, { color: COLORS.amber }]}>Kirada</Text>;
  return <Text style={[styles.statusLabel, { color: COLORS.green }]}>Müsait</Text>;
}

function VehicleRow({ item, onPress }) {
  const name = [item.brand, item.model, item.year].filter(Boolean).join(" ");
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.thumb}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.thumbImg} resizeMode="contain" />
        ) : (
          <Text style={styles.thumbText}>{item.brand?.charAt(0) || "🚗"}</Text>
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.plate}>{item.licensePlate || "—"}</Text>
          <View style={styles.statusRow}>
            <VehicleStatusDot vehicle={item} />
            <VehicleStatusLabel vehicle={item} />
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {item.branch?.name && (
          <Text style={styles.branch}>{item.branch.name}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function VehiclesScreen() {
  const { selectedBranchId } = useBranch();
  const [vehicles, setVehicles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(false);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState(null);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      setError(false);
      const params = {
        page: p,
        limit: 20,
        ...(search.trim() && { search: search.trim() }),
        ...(statusFilter && { status: statusFilter }),
        ...(selectedBranchId && { branchId: selectedBranchId }),
      };
      const data = await getVehiclesByPage(params);
      const rows = Array.isArray(data) ? data : (data.cars || data.vehicles || data.rows || []);
      const total = data.total || rows.length;
      setVehicles((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(p * 20 < total);
      setPage(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, selectedBranchId]);

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

  if (loading && !vehicles.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Plaka, marka, model..."
          placeholderTextColor={COLORS.subtle}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => { setLoading(true); load(1); }}
          returnKeyType="search"
        />
      </View>

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

      {error && <ErrorBanner message="Araçlar yüklenemedi." onRetry={() => load(1)} />}

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VehicleRow
            item={item}
            onPress={() => router.push(`/(admin)/vehicles/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="🚗" title="Araç bulunamadı" />}
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
  root:    { flex: 1, backgroundColor: COLORS.canvas },

  searchRow:   { padding: 12, paddingBottom: 6 },
  searchInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
  },

  filterRow:        { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginBottom: 6 },
  filterChip:       { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  filterChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterLabel:      { fontSize: 12, color: COLORS.muted, fontWeight: "600" },
  filterLabelActive:{ color: "#fff" },

  list: { padding: 12, paddingTop: 4, gap: 8 },

  row: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },

  thumb:     { width: 56, height: 44, borderRadius: 12, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImg:  { width: 56, height: 44 },
  thumbText: { fontSize: 22 },

  rowBody:   { flex: 1 },
  rowTop:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  plate:     { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  statusLabel:{ fontSize: 12, fontWeight: "600" },
  name:      { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  branch:    { fontSize: 11, color: COLORS.subtle, marginTop: 2 },
});

