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
import { wallTime, wallDate, wallDayName } from "../../utils/format";
import { customerName } from "../../utils/admin";

function GreetingHeader({ user, selectedBranch, onOpenBranchPicker }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const name = user?.firstName?.split(" ")[0] || "Admin";
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

const pendingHref = (type) => ({ pathname: "/(admin)/pending/[type]", params: { type } });

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
  const cat = expiry?.categories || {};
  const expiryCount = (key) => (Array.isArray(cat[key]) ? cat[key].length : 0);
  const insuranceDue = expiryCount("insurance") + expiryCount("kasko");
  const taxDue = expiryCount("tax");
  const inspectionDue = expiryCount("inspection");
  const maintenanceDue = expiryCount("maintenance");

  const total =
    hgsCount + invoiceCount + kbsCount + kbsReleaseCount + signCount +
    insuranceDue + taxDue + inspectionDue + maintenanceDue;

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
          onPress={() => router.push(pendingHref("invoice"))}
        />
        <AlertPill
          count={hgsCount}
          label="HGS kontrolü bekleyen kontrat"
          color={COLORS.amber}
          onPress={() => router.push(pendingHref("hgs"))}
        />
        <AlertPill
          count={kbsCount}
          label="KABİS bildirilecek kontrat"
          color={COLORS.amber}
          onPress={() => router.push(pendingHref("kbs"))}
        />
        <AlertPill
          count={kbsReleaseCount}
          label="KABİS çıkışı yapılacak kontrat"
          color={COLORS.muted}
          onPress={() => router.push(pendingHref("kbsRelease"))}
        />
        <AlertPill
          count={signCount}
          label="imza bekleyen kontrat"
          color="#7c3aed"
          bg="#ede9fe"
          onPress={() => router.push(pendingHref("sign"))}
        />
        <AlertPill
          count={inspectionDue}
          label="muayenesi yaklaşan araç"
          color={COLORS.amber}
          onPress={() => router.push(pendingHref("inspection"))}
        />
        <AlertPill
          count={maintenanceDue}
          label="bakımı yaklaşan araç"
          color={COLORS.amber}
          onPress={() => router.push(pendingHref("maintenance"))}
        />
        <AlertPill
          count={insuranceDue}
          label="sigorta / kaskosu biten araç"
          color={COLORS.red}
          onPress={() => router.push(pendingHref("insurance"))}
        />
        <AlertPill
          count={taxDue}
          label="MTV ödemesi yaklaşan araç"
          color={COLORS.amber}
          onPress={() => router.push(pendingHref("tax"))}
        />
      </View>
    </SectionCard>
  );
}

// Kontrat saatleri UTC alanlarına yazılmış Türkiye duvar saati; "bugün" ve
// gecikme hesabı da aynı eksende (nowWall) yapılır.
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;
const wallDayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

const lateLabel = (iso, nowWall) => {
  const late = nowWall - Date.parse(iso);
  if (!nowWall || !(late > 0)) return null;
  if (late >= DAY_MS) return `${Math.floor(late / DAY_MS)} gün gecikti`;
  if (late >= HOUR_MS) return `${Math.floor(late / HOUR_MS)} saat gecikti`;
  return "Gecikti";
};

const dayLabel = (iso, nowWall) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  if (nowWall && wallDayKey(t) === wallDayKey(nowWall)) return "Bugün";
  return `${wallDate(iso)} ${wallDayName(iso)}`;
};

const stamp = (iso) => `${wallDate(iso)} ${wallTime(iso)}`;

// Her bilgi kendi satırında ve sarabilir (sabit genişlikli sütun yok), böylece
// küçük ekranda ya da büyük yazı boyutunda tarih/plaka kesilmez.
function ScheduleRow({ row, timeField, locationField, nowWall }) {
  const iso = row[timeField];
  const late = lateLabel(iso, nowWall);
  const carName = [row.car?.brand, row.car?.model].filter(Boolean).join(" ");
  const location = row[locationField];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.scheduleRow,
        late && styles.scheduleRowLate,
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => router.push(`/(admin)/contracts/${row.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${row.car?.licensePlate || "Araç"}, ${dayLabel(iso, nowWall)} ${wallTime(iso)}, kontrat detayını aç`}
    >
      <View style={styles.scheduleTop}>
        <View style={styles.plateBadge}>
          <Text style={styles.plateText}>{row.car?.licensePlate || "Plaka yok"}</Text>
        </View>
        {carName ? <Text style={styles.scheduleCar}>{carName}</Text> : null}
        {late ? (
          <View style={styles.lateBadge}>
            <Text style={styles.lateText}>{late}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.scheduleWhen}>
        <Text style={[styles.scheduleDay, late && styles.textLate]}>🕐 {dayLabel(iso, nowWall)}</Text>
        <Text style={[styles.scheduleTime, late && styles.textLate]}>{wallTime(iso)}</Text>
        {location ? <Text style={styles.schedulePlace}>📍 {location}</Text> : null}
      </View>

      <Text style={styles.scheduleCustomer}>👤 {customerName(row)}</Text>

      <View style={styles.scheduleFoot}>
        <Text style={styles.scheduleSpan}>
          {stamp(row.pickUpTime)} → {stamp(row.dropOffTime)}
        </Text>
        <Text style={styles.scheduleOpen}>
          {row.contractNo ? `${row.contractNo} ` : ""}›
        </Text>
      </View>
    </Pressable>
  );
}

// Liste geciken kayıtları da içerir (backend alt sınır koymuyor) — tarihi
// geçmiş olanlar kırmızı işaretlenir.
function ScheduleGroup({ title, emoji, tint, rows, timeField, locationField, nowWall }) {
  if (!rows.length) return null;
  return (
    <View style={styles.scheduleGroup}>
      <View style={styles.scheduleHead}>
        <View style={[styles.scheduleDot, { backgroundColor: tint }]}>
          <Text style={{ fontSize: 14 }}>{emoji}</Text>
        </View>
        <Text style={styles.scheduleLabel}>{title}</Text>
        <Text style={styles.scheduleCount}>{rows.length}</Text>
      </View>
      {rows.map((r) => (
        <ScheduleRow
          key={r.id}
          row={r}
          timeField={timeField}
          locationField={locationField}
          nowWall={nowWall}
        />
      ))}
    </View>
  );
}

function TodayScheduleSection({ departures, returns, nowWall }) {
  if (!departures.length && !returns.length) return null;
  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Bugünkü Program</Text>
      <ScheduleGroup
        title="Teslim edilecek"
        emoji="🚗"
        tint={COLORS.greenSoft}
        rows={departures}
        timeField="pickUpTime"
        locationField="pickUpLocation"
        nowWall={nowWall}
      />
      <ScheduleGroup
        title="İade alınacak"
        emoji="🔑"
        tint={COLORS.redSoft}
        rows={returns}
        timeField="dropOffTime"
        locationField="dropOffLocation"
        nowWall={nowWall}
      />
    </SectionCard>
  );
}

function QuickActions({ onSahaMode }) {
  const actions = [
    { label: "Saha Modu",     emoji: "📸", href: "/(saha)", onPress: onSahaMode },
    { label: "Kullanıcılar",  emoji: "👥", href: "/(admin)/users" },
    { label: "Finans",        emoji: "💰", href: "/(admin)/finance" },
    { label: "Fiyat Listesi", emoji: "🏷️", href: "/(admin)/price-list" },
  ];

  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
      <View style={styles.qaGrid}>
        {actions.map((a) => (
          <Pressable
            key={a.href}
            style={({ pressed }) => [styles.qaButton, pressed && styles.qaPressed]}
            onPress={() => (a.onPress ? a.onPress() : router.push(a.href))}
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
  const { user, setMode } = useAuth();
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
  const [departures, setDepartures] = useState([]);
  const [returns, setReturns] = useState([]);
  // Program saatleri duvar saati olarak UTC'de; gecikme kontrolü için "şimdi"
  // de aynı eksene taşınır (yükleme anında sabitlenir).
  const [nowWall, setNowWall] = useState(0);

  const load = useCallback(async () => {
    // Tek tek hatalar paneli boş bırakır; hepsi düşerse (ör. bağlantı yok) uyarı gösterilir.
    let failures = 0;
    const safe = (promise, fallback) =>
      promise.catch(() => {
        failures += 1;
        return fallback;
      });
    const branch = selectedBranchId || undefined;
    const today = { window: "today", excludeCompleted: "true", ...(branch && { branchId: branch }) };
    const [stats, alerts, hgsR, invR, kbsR, kbsRelR, signR, depR, retR] = await Promise.all([
      safe(getFleetStats(selectedBranchId), null),
      safe(getExpiryAlerts(selectedBranchId), null),
      safe(getHgsPendingContracts(selectedBranchId), []),
      safe(getInvoicePendingContracts(selectedBranchId), []),
      safe(getKbsPendingContracts(selectedBranchId), []),
      safe(getKbsReleasePendingContracts(selectedBranchId), []),
      safe(getSignPendingContracts(selectedBranchId), []),
      safe(getAdminSchedule({ ...today, type: "departures" }), []),
      safe(getAdminSchedule({ ...today, type: "returns" }), []),
    ]);
    const list = (x) => (Array.isArray(x) ? x : []);
    setFleetStats(stats);
    setExpiryAlerts(alerts);
    setHgs(list(hgsR));
    setInvoice(list(invR));
    setKbs(list(kbsR));
    setKbsRelease(list(kbsRelR));
    setSign(list(signR));
    setDepartures(list(depR));
    setReturns(list(retR));
    setNowWall(Date.now() - new Date().getTimezoneOffset() * 60000);
    setError(failures === 9);
    setLoading(false);
  }, [selectedBranchId]);

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

      <TodayScheduleSection departures={departures} returns={returns} nowWall={nowWall} />

      <QuickActions
        onSahaMode={() => {
          setMode("saha");
          router.replace("/(saha)");
        }}
      />

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

  scheduleGroup:    { marginBottom: 10 },
  scheduleHead:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  scheduleDot:      { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  scheduleLabel:    { flex: 1, fontSize: 13, color: COLORS.muted, fontWeight: "700" },
  scheduleCount:    { fontSize: 16, color: COLORS.ink, fontWeight: "800" },
  scheduleRow:      {
    backgroundColor: COLORS.canvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  scheduleRowLate:  { backgroundColor: COLORS.redSoft, borderColor: "#f1cfc8" },
  scheduleTop:      { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  plateBadge:       {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  plateText:        { fontSize: 15, fontWeight: "900", color: COLORS.ink, letterSpacing: 0.5 },
  scheduleCar:      { flexShrink: 1, fontSize: 13, fontWeight: "700", color: COLORS.muted },
  lateBadge:        { backgroundColor: COLORS.red, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  lateText:         { color: "#fff", fontSize: 11, fontWeight: "800" },
  scheduleWhen:     { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8, rowGap: 2 },
  scheduleDay:      { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  scheduleTime:     { fontSize: 18, fontWeight: "900", color: COLORS.green, fontVariant: ["tabular-nums"] },
  textLate:         { color: COLORS.red },
  schedulePlace:    { fontSize: 13, color: COLORS.muted },
  scheduleCustomer: { fontSize: 14, fontWeight: "600", color: COLORS.ink },
  scheduleFoot:     {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  scheduleSpan:     { fontSize: 12, color: COLORS.muted, fontVariant: ["tabular-nums"] },
  scheduleOpen:     { fontSize: 13, fontWeight: "800", color: COLORS.green },

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

