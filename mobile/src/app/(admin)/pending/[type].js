import { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useLocalSearchParams, useFocusEffect, useNavigation, router } from "expo-router";
import {
  getInvoicePendingContracts,
  getHgsPendingContracts,
  getKbsPendingContracts,
  getKbsReleasePendingContracts,
  getSignPendingContracts,
  getExpiryAlerts,
} from "../../../api/admin";
import { useBranch } from "../../../context/BranchContext";
import { LoadingScreen, ErrorBanner, EmptyState, StatusBadge } from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { formatKm } from "../../../utils/format";
import { customerName, wallDate, dayDate } from "../../../utils/admin";

// Kontrat bazlı bekleyen işler (dashboard uyarı çubuğuyla aynı endpoint'ler).
const CONTRACT_TYPES = {
  invoice:    { title: "Fatura Kesilecekler", fetch: getInvoicePendingContracts, hint: "Kesilmiş faturaları kiralama süresini kapsamayan kontratlar." },
  hgs:        { title: "HGS Kontrolü Bekleyenler", fetch: getHgsPendingContracts, hint: "HGS/OGS sorgusu kiralama süresini kapsamayan kontratlar." },
  kbs:        { title: "KABİS Bildirimi Bekleyenler", fetch: getKbsPendingContracts, hint: "KABİS'e bildirilmemiş kontratlar." },
  kbsRelease: { title: "KABİS Çıkışı Bekleyenler", fetch: getKbsReleasePendingContracts, hint: "Kapanmış ama KABİS çıkışı yapılmamış kontratlar." },
  sign:       { title: "İmza Bekleyenler", fetch: getSignPendingContracts, hint: "Basılı kontratı imzalanmamış kontratlar." },
};

// Araç bazlı süre uyarıları (expiry-alerts kategorileri).
const VEHICLE_TYPES = {
  inspection:  { title: "Muayenesi Yaklaşanlar", categories: ["inspection"] },
  maintenance: { title: "Bakımı Yaklaşanlar", categories: ["maintenance"] },
  insurance:   { title: "Sigorta / Kasko", categories: ["insurance", "kasko"] },
  tax:         { title: "MTV Ödemeleri", categories: ["tax"] },
};

const CATEGORY_LABEL = { insurance: "Trafik sigortası", kasko: "Kasko", inspection: "Muayene", maintenance: "Bakım", tax: "MTV" };

function ContractRow({ item }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/(admin)/contracts/${item.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.plate}>{item.car?.licensePlate || "—"}</Text>
        <Text style={styles.sub} numberOfLines={1}>{customerName(item)}</Text>
        <Text style={styles.meta}>
          {item.contractNo ? `${item.contractNo} · ` : ""}
          {wallDate(item.pickUpTime)} → {wallDate(item.returnedAt || item.dropOffTime)}
        </Text>
      </View>
      <StatusBadge status={item.status} />
    </Pressable>
  );
}

function expiryText(item) {
  if (item.missing) return { text: "Kayıt yok", color: COLORS.red };
  if (item.kmLeft != null && item.daysLeft == null) {
    return item.kmLeft < 0
      ? { text: `${formatKm(-item.kmLeft)} geçti`, color: COLORS.red }
      : { text: `${formatKm(item.kmLeft)} kaldı`, color: COLORS.amber };
  }
  if (item.daysLeft == null) return { text: "—", color: COLORS.muted };
  if (item.daysLeft < 0) return { text: `${-item.daysLeft} gün geçti`, color: COLORS.red };
  if (item.daysLeft === 0) return { text: "Bugün", color: COLORS.red };
  return { text: `${item.daysLeft} gün kaldı`, color: COLORS.amber };
}

function VehicleRow({ item }) {
  const status = expiryText(item);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/(admin)/vehicles/${item.vehicleId}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.plate}>{item.plate || "—"}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>
          {CATEGORY_LABEL[item.category] || ""}
          {item.date ? ` · ${dayDate(item.date)}` : item.km ? ` · ${formatKm(item.km)}` : ""}
        </Text>
      </View>
      <Text style={[styles.expiry, { color: status.color }]}>{status.text}</Text>
    </Pressable>
  );
}

export default function PendingScreen() {
  const { type } = useLocalSearchParams();
  const navigation = useNavigation();
  const { selectedBranchId, selectedBranch } = useBranch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [loadedType, setLoadedType] = useState(null);

  const contractType = CONTRACT_TYPES[type];
  const vehicleType = VEHICLE_TYPES[type];
  const title = contractType?.title || vehicleType?.title || "Bekleyenler";

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const load = useCallback(async () => {
    try {
      if (contractType) {
        const data = await contractType.fetch(selectedBranchId);
        setRows(Array.isArray(data) ? data : []);
      } else if (vehicleType) {
        const data = await getExpiryAlerts(selectedBranchId);
        const cats = data?.categories || {};
        setRows(
          vehicleType.categories.flatMap((cat) =>
            (cats[cat] || []).map((item) => ({ ...item, category: cat, key: `${cat}-${item.vehicleId}` }))
          )
        );
      } else {
        setRows([]);
      }
      setLoadedType(type);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [type, contractType, vehicleType, selectedBranchId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (error && loadedType !== type) return <ErrorBanner message="Liste yüklenemedi." onRetry={load} />;
  if (loading || loadedType !== type) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.headText}>
          {rows.length} kayıt{selectedBranch ? ` · ${selectedBranch.name}` : ""}
        </Text>
        {contractType?.hint ? <Text style={styles.headHint}>{contractType.hint}</Text> : null}
        {contractType ? <Text style={styles.headHint}>İşlemler web panelinden yapılır.</Text> : null}
      </View>
      {error && <ErrorBanner message="Güncel veri alınamadı." onRetry={load} />}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key || item.id}
        renderItem={({ item }) => (contractType ? <ContractRow item={item} /> : <VehicleRow item={item} />)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="✅" title="Bekleyen kayıt yok" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: COLORS.canvas },
  head:     { paddingHorizontal: 16, paddingTop: 12 },
  headText: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  headHint: { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  list:     { padding: 12, gap: 8 },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowPressed: { opacity: 0.75 },
  plate:      { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  sub:        { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  meta:       { fontSize: 11, color: COLORS.subtle, marginTop: 4 },
  expiry:     { fontSize: 12, fontWeight: "800" },
});
