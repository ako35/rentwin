import { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Image } from "react-native";
import { router, useNavigation } from "expo-router";
import { getVehiclesByPage } from "../../../api/admin";
import { useBranch } from "../../../context/BranchContext";
import { usePagedList } from "../../../hooks/usePagedList";
import {
  LoadingScreen,
  ErrorBanner,
  EmptyState,
  SearchBar,
  Chips,
  ListFooter,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { PAGE_SIZE, vehicleImageUrl, vehicleStatus } from "../../../utils/admin";

// Durum bir kolon değil — backend arama kelimesinden türetiyor
// (vehicles.controller.js resolveToken: müsait / kirada / pasif / servis dışı).
const STATUS_FILTERS = [
  { key: null,      label: "Tümü" },
  { key: "müsait",  label: "Müsait" },
  { key: "kirada",  label: "Kirada" },
  { key: "servis",  label: "Servis Dışı" },
  { key: "pasif",   label: "Pasif" },
  { key: "sold",    label: "Satılanlar" },
];

function VehicleRow({ item, onPress }) {
  const name = [item.brand, item.model, item.modelYear].filter(Boolean).join(" ");
  const status = vehicleStatus(item);
  const uri = vehicleImageUrl(item);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.thumb}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumbImg} resizeMode="contain" />
        ) : (
          <Text style={styles.thumbText}>🚗</Text>
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.plate}>{item.licensePlate || "—"}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {item.branch?.name ? <Text style={styles.branch}>{item.branch.name}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function VehiclesScreen() {
  const navigation = useNavigation();
  const { selectedBranchId } = useBranch();
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatus] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push("/(admin)/vehicles/new")}
          style={styles.addBtn}
          hitSlop={8}
        >
          <Text style={styles.addBtnText}>＋ Ekle</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const fetchPage = useCallback(
    (page) => {
      const sold = statusFilter === "sold";
      const words = [query, !sold && statusFilter].filter(Boolean).join(" ");
      return getVehiclesByPage({
        page,
        size: PAGE_SIZE,
        ...(words && { q: words }),
        ...(sold && { sold: "1" }),
        ...(selectedBranchId && { branchId: selectedBranchId }),
      });
    },
    [query, statusFilter, selectedBranchId]
  );

  const list = usePagedList(fetchPage);

  if (list.loading && !list.rows.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <SearchBar
        placeholder="Plaka, marka, model, şube…"
        value={searchText}
        onChangeText={(t) => {
          setSearchText(t);
          if (!t.trim()) setQuery("");
        }}
        onSubmit={() => setQuery(searchText.trim())}
      />
      <Chips options={STATUS_FILTERS} value={statusFilter} onChange={setStatus} />

      {list.error && <ErrorBanner message="Araçlar yüklenemedi." onRetry={list.reload} />}

      <FlatList
        data={list.rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VehicleRow item={item} onPress={() => router.push(`/(admin)/vehicles/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={list.error ? null : <EmptyState icon="🚗" title="Araç bulunamadı" />}
        ListFooterComponent={<ListFooter loading={list.loadingMore} />}
        refreshControl={
          <RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={COLORS.green} />
        }
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  list: { padding: 12, paddingTop: 4, gap: 8 },

  addBtn:     { marginRight: 14, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.greenSoft },
  addBtnText: { color: COLORS.green, fontWeight: "800", fontSize: 13 },

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

  thumb:     {
    width: 56,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg:  { width: 56, height: 44 },
  thumbText: { fontSize: 22 },

  rowBody:     { flex: 1 },
  rowTop:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  plate:       { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  statusRow:   { flexDirection: "row", alignItems: "center", gap: 5 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: "600" },
  name:        { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  branch:      { fontSize: 11, color: COLORS.subtle, marginTop: 2 },
});
