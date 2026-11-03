import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { getContractsByPage } from "../../../api/admin";
import { useBranch } from "../../../context/BranchContext";
import {
  LoadingScreen,
  ErrorBanner,
  StatusBadge,
  EmptyState,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";

const STATUS_FILTERS = [
  { key: null,        label: "Tümü" },
  { key: "ACTIVE",    label: "Aktif" },
  { key: "DONE",      label: "Tamamlandı" },
  { key: "CANCELLED", label: "İptal" },
];

function ContractRow({ item, onPress }) {
  const plate    = item.car?.licensePlate || "—";
  const brand    = [item.car?.brand, item.car?.model].filter(Boolean).join(" ");
  const customer = item.user?.name || "—";
  const no       = item.contractNo || item.id?.slice(0, 8);
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
        <Text style={styles.plate}>{plate}</Text>
        <Text style={styles.brand} numberOfLines={1}>{brand}</Text>
        <Text style={styles.customer} numberOfLines={1}>{customer}</Text>
      </View>
      <View style={styles.rowRight}>
        <StatusBadge status={item.status} />
        <Text style={styles.contractNo}>{no}</Text>
        <Text style={styles.dates}>{pickup} → {dropoff}</Text>
      </View>
    </Pressable>
  );
}

export default function ContractsScreen() {
  const { selectedBranchId } = useBranch();
  const [contracts, setContracts]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(false);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState(null);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);

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
      const data = await getContractsByPage(params);
      // Backend genellikle { contracts, total, page } şeklinde döner
      const rows = Array.isArray(data) ? data : (data.contracts || data.rows || []);
      const total = data.total || rows.length;
      setContracts((prev) => (append ? [...prev, ...rows] : rows));
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

  const loadMore = () => {
    if (hasMore && !loading) load(page + 1, true);
  };

  if (loading && !contracts.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      {/* Arama */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Plaka, müşteri, kontrat no..."
          placeholderTextColor={COLORS.subtle}
          value={search}
          onChangeText={(v) => { setSearch(v); }}
          onSubmitEditing={() => { setLoading(true); load(1, false); }}
          returnKeyType="search"
        />
      </View>

      {/* Filtre */}
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

      {error && <ErrorBanner message="Kontratlar yüklenemedi." onRetry={() => load(1)} />}

      <FlatList
        data={contracts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContractRow
            item={item}
            onPress={() => router.push(`/(admin)/contracts/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="📋" title="Kontrat bulunamadı" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.canvas },

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

  filterRow:       { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginBottom: 6 },
  filterChip:      {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterLabel:      { fontSize: 12, color: COLORS.muted, fontWeight: "600" },
  filterLabelActive:{ color: "#fff" },

  list: { padding: 12, paddingTop: 4, gap: 8 },

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
  rowPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },

  rowLeft:    { flex: 1, marginRight: 12 },
  plate:      { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  brand:      { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  customer:   { fontSize: 13, color: COLORS.ink, marginTop: 6, fontWeight: "600" },

  rowRight:    { alignItems: "flex-end", gap: 5 },
  contractNo: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  dates:      { fontSize: 11, color: COLORS.subtle, marginTop: 2 },
});

