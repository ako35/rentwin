import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { getReservationsByPage } from "../../../api/admin";
import { useBranch } from "../../../context/BranchContext";
import { usePagedList } from "../../../hooks/usePagedList";
import {
  LoadingScreen,
  ErrorBanner,
  StatusBadge,
  EmptyState,
  SearchBar,
  Chips,
  ListFooter,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { PAGE_SIZE, plateOrCustomer, wallDate } from "../../../utils/admin";

const STATUS_FILTERS = [
  { key: null,        label: "Tümü" },
  { key: "PENDING",   label: "Bekliyor" },
  { key: "CONFIRMED", label: "Onaylandı" },
  { key: "CONVERTED", label: "Kontrata Dönüştü" },
  { key: "CANCELLED", label: "İptal" },
];

function ReservationRow({ item, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Text style={styles.customer} numberOfLines={1}>{item.customerName || "—"}</Text>
        <Text style={styles.vehicle} numberOfLines={1}>
          {[item.plate, item.vehicle].filter(Boolean).join(" · ") || "Araç seçilmedi"}
        </Text>
        <Text style={styles.dates}>
          {wallDate(item.pickUpTime)} → {wallDate(item.dropOffTime)} · {item.dayCount} gün
        </Text>
      </View>
      <View style={styles.rowRight}>
        <StatusBadge status={item.status} />
        {item.branchCode ? <Text style={styles.resNo}>Şube {item.branchCode}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function ReservationsScreen() {
  const { selectedBranchId } = useBranch();
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatus] = useState(null);

  const fetchPage = useCallback(
    (page) =>
      getReservationsByPage({
        page,
        size: PAGE_SIZE,
        // Varsayılan sıralama "id" — en yeni kayıtlar üstte görünsün.
        sort: "pickUpTime",
        direction: "DESC",
        ...plateOrCustomer(query),
        ...(statusFilter && { status: statusFilter }),
        ...(selectedBranchId && { branchId: selectedBranchId }),
      }),
    [query, statusFilter, selectedBranchId]
  );

  const list = usePagedList(fetchPage);

  if (list.loading && !list.rows.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <SearchBar
        placeholder="Plaka veya müşteri adı…"
        value={searchText}
        onChangeText={(t) => {
          setSearchText(t);
          if (!t.trim()) setQuery("");
        }}
        onSubmit={() => setQuery(searchText.trim())}
      />
      <Chips options={STATUS_FILTERS} value={statusFilter} onChange={setStatus} />

      {list.error && <ErrorBanner message="Rezervasyonlar yüklenemedi." onRetry={list.reload} />}

      <FlatList
        data={list.rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReservationRow item={item} onPress={() => router.push(`/(admin)/reservations/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={list.error ? null : <EmptyState icon="📅" title="Rezervasyon bulunamadı" />}
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
