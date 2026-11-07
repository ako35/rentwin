import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { getUsersByPage } from "../../../api/admin";
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
import { PAGE_SIZE, personName, money } from "../../../utils/admin";

const ROLE_FILTERS = [
  { key: null,            label: "Tümü" },
  { key: "Customer",      label: "Müşteriler" },
  { key: "Administrator", label: "Yöneticiler" },
];

function UserRow({ item, onPress }) {
  const isAdmin = item.roles?.includes("Administrator");
  // balance = alacak − borç; negatif = müşterinin borcu var.
  const owes = (item.balance ?? 0) < -0.009;
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
        <Text style={[styles.avatarText, isAdmin && styles.avatarTextAdmin]}>
          {(item.companyTitle || item.firstName || "?").charAt(0).toLocaleUpperCase("tr-TR")}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{personName(item)}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.phoneNumber || item.email}</Text>
        <Text style={styles.meta}>
          {isAdmin ? "Yönetici" : item.customerType || "Müşteri"}
          {item.customerCode ? ` · ${item.customerCode}` : ""}
          {item.active === false ? " · Pasif" : ""}
        </Text>
      </View>
      {owes ? (
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Borç</Text>
          <Text style={styles.balanceValue}>{money(-item.balance)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function UsersScreen() {
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(null);

  const fetchPage = useCallback(
    (page) =>
      getUsersByPage({
        page,
        size: PAGE_SIZE,
        sort: "createdAt",
        direction: "DESC",
        ...(query && { q: query }),
        ...(role && { role }),
      }),
    [query, role]
  );

  const list = usePagedList(fetchPage);

  if (list.loading && !list.rows.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <SearchBar
        placeholder="Ad, unvan, e-posta, T.C./VKN…"
        value={searchText}
        onChangeText={(t) => {
          setSearchText(t);
          if (!t.trim()) setQuery("");
        }}
        onSubmit={() => setQuery(searchText.trim())}
      />
      <Chips options={ROLE_FILTERS} value={role} onChange={setRole} />

      {list.error && <ErrorBanner message="Kullanıcılar yüklenemedi." onRetry={list.reload} />}

      <FlatList
        data={list.rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserRow item={item} onPress={() => router.push(`/(admin)/users/${item.id}`)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={list.error ? null : <EmptyState icon="👤" title="Kullanıcı bulunamadı" />}
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
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowPressed:      { opacity: 0.75 },
  avatar:          { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center" },
  avatarAdmin:     { backgroundColor: COLORS.green },
  avatarText:      { fontSize: 17, fontWeight: "800", color: COLORS.green },
  avatarTextAdmin: { color: "#fff" },
  name:            { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  sub:             { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  meta:            { fontSize: 11, color: COLORS.subtle, marginTop: 3 },
  balanceBox:      { alignItems: "flex-end" },
  balanceLabel:    { fontSize: 10, color: COLORS.red, fontWeight: "700", textTransform: "uppercase" },
  balanceValue:    { fontSize: 13, color: COLORS.red, fontWeight: "800" },
});
