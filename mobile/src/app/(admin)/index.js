import { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  StatusBar,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useAuth } from "../../auth/AuthContext";
import { useBranch } from "../../context/BranchContext";
import {
  getFleetStats,
  getExpiryAlerts,
  getHgsPendingContracts,
  getInvoicePendingContracts,
  getKbsPendingContracts,
  getKbsReleasePendingContracts,
  getSignPendingContracts,
  getAdminSchedule,
} from "../../api/admin";
import {
  LoadingScreen,
  ErrorBanner,
  SectionCard,
  StatTile,
  AlertPill,
  BranchPickerModal,
} from "../../components/admin";
import { COLORS } from "../../constants/theme";
import UpdateBanner from "../../components/UpdateBanner";

function GreetingHeader({ user, selectedBranch, onOpenBranchPicker }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const name = user?.name?.split(" ")[0] || "Admin";
  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.header}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {greeting}, {name} 👋
          </Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>

      {/* Şube Seçici Butonu */}
      <Pressable style={styles.branchPill} onPress={onOpenBranchPicker}>
        <Text style={styles.branchPillEmoji}>🏢</Text>
        <Text style={styles.branchPillText} numberOfLines={1}>
          {selectedBranch ? selectedBranch.name : "Tüm Şubeler"}
        </Text>
        <Text style={styles.branchPillChevron}>▾</Text>
      </Pressable>
    </View>
  );
}

function FleetStatsRow({ stats }) {
  if (!stats) return null;
  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Araç Filosu</Text>
      <View style={styles.statRow}>
        <StatTile label="Toplam" value={stats.total} />
        <View style={styles.statDivider} />
        <StatTile label="Kirada" value={stats.rented} color={COLORS.green} />
        <View style={styles.statDivider} />
        <StatTile label="Müsait" value={stats.available} color="#2196F3" />
        <View style={styles.statDivider} />
        <StatTile label="Servis Dışı" value={stats.outOfService} color={COLORS.red} />
      </View>
      <View style={styles.occupancyBar}>
        <View
          style={[
            styles.occupancyFill,
            { width: `${Math.min(stats.occupancyRate || 0, 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.occupancyLabel}>
        Doluluk oranı %{stats.occupancyRate ?? 0}
      </Text>
    </SectionCard>
  );
}

function AlertsSection({
  hgs,
  invoice,
  kbs,
  kbsRelease,
  sign,
  expiry,
}) {
  const hgsCount = hgs?.length || 0;
  const invoiceCount = invoice?.length || 0;
  const kbsCount = kbs?.length || 0;
  const kbsReleaseCount = kbsRelease?.length || 0;
  const signCount = sign?.length || 0;
  const maintenanceDue = expiry?.maintenanceDue || 0;
  const inspectionDue = expiry?.inspectionDue || 0;

  const total =
    hgsCount + invoiceCount + kbsCount + kbsReleaseCount + signCount + maintenanceDue + inspectionDue;

  if (total === 0) {
    return (
      <SectionCard>
        <View style={styles.allClearRow}>
          <Text style={styles.allClearIcon}>✅</Text>
          <View>
            <Text style={styles.allClearTitle}>Her şey yolunda</Text>
            <Text style={styles.allClearSub}>Bekleyen işlem yok</Text>
          </View>
        </View>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Bekleyen İşlemler</Text>
      <View style={styles.alertList}>
        <AlertPill
          count={invoiceCount}
          label="fatura kesilecek kontrat"
          color={COLORS.red}
          onPress={() => router.push("/(admin)/finance")}
        />
        <AlertPill
          count={hgsCount}
          label="HGS girilecek kontrat"
          color={COLORS.amber}
          onPress={() => router.push("/(admin)/finance")}
        />
        <AlertPill
          count={kbsCount}
          label="KABİS bildirilecek kontrat"
          color={COLORS.amber}
          onPress={() => router.push("/(admin)/contracts")}
        />
        <AlertPill
          count={kbsReleaseCount}
          label="KABİS çıkışı yapılacak kontrat"
          color={COLORS.muted}
          onPress={() => router.push("/(admin)/contracts")}
        />
        <AlertPill
          count={signCount}
          label="imza bekleyen kontrat"
          color="#7c3aed"
          bg="#ede9fe"
          onPress={() => router.push("/(admin)/contracts")}
        />
        <AlertPill
          count={maintenanceDue}
          label="bakım zamanı gelen araç"
          color={COLORS.amber}
          onPress={() => router.push("/(admin)/vehicles")}
        />
        <AlertPill
          count={inspectionDue}
          label="muayene zamanı gelen araç"
          color={COLORS.amber}
          onPress={() => router.push("/(admin)/vehicles")}
        />
      </View>
    </SectionCard>
  );
}

function TodayScheduleSection({ schedule }) {
  const departures = schedule?.departures?.filter((r) => r.bucket !== "tomorrow") || [];
  const returns = schedule?.returns?.filter((r) => r.bucket !== "tomorrow") || [];

  if (!departures.length && !returns.length) return null;

  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Bugünkü Program</Text>
      {departures.length > 0 && (
        <Pressable
          style={styles.scheduleRow}
          onPress={() => router.push("/(admin)/contracts")}
        >
          <View style={[styles.scheduleDot, { backgroundColor: COLORS.greenSoft }]}>
            <Text style={{ fontSize: 14 }}>🚗</Text>
          </View>
          <View style={styles.scheduleCopy}>
            <Text style={styles.scheduleLabel}>Teslim</Text>
            <Text style={styles.scheduleCount}>{departures.length} araç</Text>
          </View>
          <Text style={styles.scheduleArrow}>›</Text>
        </Pressable>
      )}
      {returns.length > 0 && (
        <Pressable
          style={[styles.scheduleRow, { marginTop: 8 }]}
          onPress={() => router.push("/(admin)/contracts")}
        >
          <View style={[styles.scheduleDot, { backgroundColor: COLORS.redSoft }]}>
            <Text style={{ fontSize: 14 }}>🔑</Text>
          </View>
          <View style={styles.scheduleCopy}>
            <Text style={styles.scheduleLabel}>İade</Text>
            <Text style={styles.scheduleCount}>{returns.length} araç</Text>
          </View>
          <Text style={styles.scheduleArrow}>›</Text>
        </Pressable>
      )}
    </SectionCard>
  );
}

function QuickActions() {
  const actions = [
    { label: "Kontratlar",    emoji: "📋", href: "/(admin)/contracts" },
    { label: "Araçlar",       emoji: "🚗", href: "/(admin)/vehicles" },
    { label: "Rezervasyonlar",emoji: "📅", href: "/(admin)/reservations" },
    { label: "Finans",        emoji: "💰", href: "/(admin)/finance" },
  ];

  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
      <View style={styles.qaGrid}>
        {actions.map((a) => (
          <Pressable
            key={a.href}
            style={({ pressed }) => [styles.qaButton, pressed && styles.qaPressed]}
            onPress={() => router.push(a.href)}
          >
            <Text style={styles.qaEmoji}>{a.emoji}</Text>
            <Text style={styles.qaLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { branches, selectedBranchId, selectedBranch, setSelectedBranchId } = useBranch();
  const [branchModalOpen, setBranchModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [fleetStats, setFleetStats] = useState(null);
  const [expiryAlerts, setExpiryAlerts] = useState(null);
  const [hgs, setHgs] = useState([]);
  const [invoice, setInvoice] = useState([]);
  const [kbs, setKbs] = useState([]);
  const [kbsRelease, setKbsRelease] = useState([]);
  const [sign, setSign] = useState([]);
  const [schedule, setSchedule] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [stats, alerts, hgsR, invR, kbsR, kbsRelR, signR, schR] = await Promise.all([
        getFleetStats(selectedBranchId).catch(() => null),
        getExpiryAlerts(selectedBranchId).catch(() => null),
        getHgsPendingContracts(selectedBranchId).catch(() => []),
        getInvoicePendingContracts(selectedBranchId).catch(() => []),
        getKbsPendingContracts(selectedBranchId).catch(() => []),
        getKbsReleasePendingContracts(selectedBranchId).catch(() => []),
        getSignPendingContracts(selectedBranchId).catch(() => []),
        getAdminSchedule().catch(() => null),
      ]);
      setFleetStats(stats);
      setExpiryAlerts(alerts);
      setHgs(Array.isArray(hgsR) ? hgsR : []);
      setInvoice(Array.isArray(invR) ? invR : []);
      setKbs(Array.isArray(kbsR) ? kbsR : []);
      setKbsRelease(Array.isArray(kbsRelR) ? kbsRelR : []);
      setSign(Array.isArray(signR) ? signR : []);
      setSchedule(schR);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.green}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <UpdateBanner />
      <GreetingHeader
        user={user}
        selectedBranch={selectedBranch}
        onOpenBranchPicker={() => setBranchModalOpen(true)}
      />

      {error && (
        <ErrorBanner
          message="Veriler yüklenirken hata oluştu."
          onRetry={load}
        />
      )}

      <FleetStatsRow stats={fleetStats} />

      <AlertsSection
        hgs={hgs}
        invoice={invoice}
        kbs={kbs}
        kbsRelease={kbsRelease}
        sign={sign}
        expiry={expiryAlerts}
      />

      <TodayScheduleSection schedule={schedule} />

      <QuickActions />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Rentwin Admin</Text>
      </View>

      <BranchPickerModal
        visible={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelect={setSelectedBranchId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 16, paddingTop: 0, paddingBottom: 32 },

  header: {
    backgroundColor: COLORS.green,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    marginBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting:       { color: "#fff", fontSize: 22, fontWeight: "800" },
  date:           { color: "#c7e3d2", fontSize: 13, marginTop: 3 },
  adminBadge:     { backgroundColor: "#ffffff22", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 5 },
  adminBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  branchPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff26",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#ffffff3d",
  },
  branchPillEmoji:   { fontSize: 13 },
  branchPillText:    { color: "#fff", fontSize: 13, fontWeight: "700" },
  branchPillChevron: { color: "#c7e3d2", fontSize: 14, fontWeight: "700" },

  sectionTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "800", marginBottom: 12 },

  statRow:      { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statDivider:  { width: 1, height: 36, backgroundColor: COLORS.line, marginHorizontal: 4 },
  occupancyBar: {
    height: 6,
    backgroundColor: COLORS.line,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  occupancyFill: {
    height: 6,
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  occupancyLabel: { fontSize: 11, color: COLORS.muted, marginTop: 5, textAlign: "right" },

  alertList:     { gap: 0 },
  allClearRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  allClearIcon:  { fontSize: 28 },
  allClearTitle: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  allClearSub:   { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  scheduleRow:    { flexDirection: "row", alignItems: "center", gap: 12 },
  scheduleDot:    { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  scheduleCopy:   { flex: 1 },
  scheduleLabel:  { fontSize: 13, color: COLORS.muted, fontWeight: "600" },
  scheduleCount:  { fontSize: 16, color: COLORS.ink, fontWeight: "800", marginTop: 2 },
  scheduleArrow:  { color: COLORS.muted, fontSize: 22 },

  qaGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  qaButton:  {
    width: "47%",
    backgroundColor: COLORS.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  qaPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  qaEmoji:   { fontSize: 26 },
  qaLabel:   { fontSize: 13, color: COLORS.ink, fontWeight: "700" },

  footer:     { alignItems: "center", marginTop: 12 },
  footerText: { color: COLORS.subtle, fontSize: 11 },
});

