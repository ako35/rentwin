import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { getContractsByPage } from "../../../api/admin";
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
import { PAGE_SIZE, plateOrCustomer, wallDate, money } from "../../../utils/admin";

const STATUS_FILTERS = [
  { key: null,        label: "Tümü" },
  { key: "CREATED",   label: "Aktif" },
  { key: "DONE",      label: "Tamamlandı" },
  { key: "CANCELLED", label: "İptal" },
];

function ContractRow({ item, onPress }) {
  const balance = (item.totalPrice || 0) - (item.collected || 0);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Text style={styles.plate}>{item.plate || "—"}</Text>
        <Text style={styles.brand} numberOfLines={1}>{item.vehicle}</Text>
        <Text style={styles.customer} numberOfLines={1}>{item.customerName || "—"}</Text>
      </View>
      <View style={styles.rowRight}>
        <StatusBadge status={item.status} />
        <Text style={styles.contractNo}>
          {item.contractNo || item.id?.slice(0, 8)}
          {item.branchCode ? ` · Şb ${item.branchCode}` : ""}
        </Text>
        <Text style={styles.dates}>
          {wallDate(item.pickUpTime)} → {wallDate(item.dropOffTime)}
        </Text>
        {item.status !== "CANCELLED" && balance > 0.009 ? (
          <Text style={styles.balance}>Bakiye {money(balance)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ContractsScreen() {
  const { selectedBranchId } = useBranch();
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatus] = useState(null);

  const fetchPage = useCallback(
    (page) =>
      getContractsByPage({
        page,
        size: PAGE_SIZE,
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

      {list.error && <ErrorBanner message="Kontratlar yüklenemedi." onRetry={list.reload} />}

      <FlatList
        data={list.rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContractRow item={item} onPress={() => router.push(`/(admin)/contracts/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          list.error ? null : <EmptyState icon="📋" title="Kontrat bulunamadı" />
        }
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
  rowPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },

  rowLeft:  { flex: 1, marginRight: 12 },
  plate:    { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  brand:    { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  customer: { fontSize: 13, color: COLORS.ink, marginTop: 6, fontWeight: "600" },

  rowRight:   { alignItems: "flex-end", gap: 4 },
  contractNo: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  dates:      { fontSize: 11, color: COLORS.subtle },
  balance:    { fontSize: 11, color: COLORS.red, fontWeight: "700" },
});
