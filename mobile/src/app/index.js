import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { getFieldSchedule } from "../api/client";
import { getQueue, subscribeQueue } from "../queue/upload-queue";
import { COLORS } from "../constants/theme";
import { wallDate, wallTime } from "../utils/format";

const TABS = {
  PICKUP: { key: "departures", label: "Teslim", empty: "Bugün ve yarın için teslim yok." },
  RETURN: { key: "returns", label: "İade", empty: "Bugün ve yarın için iade yok." },
};

const GROUPS = [
  { key: "overdue", title: "Gecikmiş", tone: "red" },
  { key: "today", title: "Bugün", tone: "green" },
  { key: "tomorrow", title: "Yarın", tone: "muted" },
  { key: "done", title: "Tamamlanan", tone: "muted" },
];

// A row is "remaining" until its photos are in; tomorrow's work isn't due yet.
const isRemaining = (row) => !row.done && row.bucket !== "tomorrow";

const groupRows = (rows) => {
  const groups = { overdue: [], today: [], tomorrow: [], done: [] };
  rows.forEach((row) => groups[row.done ? "done" : row.bucket]?.push(row));
  return groups;
};

function ScheduleCard({ row, overdue, onOpen }) {
  const carName = [row.car?.brand, row.car?.model].filter(Boolean).join(" ").trim();
  return (
    <Pressable
      style={({ pressed }) => [styles.carCard, row.done && styles.carCardDone, pressed && styles.cardPressed]}
      onPress={() => onOpen(row)}
      accessibilityRole="button"
      accessibilityLabel={`${row.car?.licensePlate || "Araç"}, kontrat detaylarını aç`}
    >
      <View style={styles.carCardTop}>
        <View style={styles.carThumb}>
          {row.car?.image ? (
            <Image source={{ uri: row.car.image }} style={styles.carThumbImage} resizeMode="contain" />
          ) : (
            <Text style={styles.carThumbText}>{row.car?.brand?.charAt(0) || "R"}</Text>
          )}
        </View>
        <View style={styles.carIdentity}>
          <Text style={styles.plate}>{row.car?.licensePlate || "Plaka yok"}</Text>
          <Text style={styles.carModel} numberOfLines={1}>{carName || "Araç bilgisi yok"}</Text>
        </View>
        {row.done ? (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>✓ Tamam</Text>
          </View>
        ) : (
          <View style={styles.timeBlock}>
            <Text style={[styles.time, overdue && styles.timeOverdue]}>{wallTime(row.time)}</Text>
            <Text style={[styles.place, overdue && styles.placeOverdue]} numberOfLines={1}>
              {overdue ? wallDate(row.time) : row.location || "—"}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardFooter}>
        <Text style={styles.customer} numberOfLines={1}>{row.customer?.name || "Müşteri bilgisi yok"}</Text>
        <Text style={styles.contract}>{row.flightNo ? `Uçuş ${row.flightNo}` : row.contractNo || "Kontrat"}  ›</Text>
      </View>
    </Pressable>
  );
}

export default function ScheduleScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const [schedule, setSchedule] = useState({ departures: [], returns: [] });
  const [tab, setTab] = useState("PICKUP");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await getFieldSchedule();
      setSchedule({ departures: next.departures || [], returns: next.returns || [] });
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  useEffect(() => {
    getQueue().then(setQueue);
    return subscribeQueue(setQueue);
  }, []);

  if (!authLoading && !user) return <Redirect href="/login" />;

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmLogout = () =>
    Alert.alert("Çıkış yapılsın mı?", "Gönderilmeyi bekleyen kayıtlar telefonda kalır, tekrar girişte gönderilir.", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: logout },
    ]);

  const openContract = (row) => {
    router.push({
      pathname: "/contract/[id]",
      params: { id: row.id, stage: row.stage, plate: row.car?.licensePlate || "" },
    });
  };

  const remaining = {
    PICKUP: schedule.departures.filter(isRemaining).length,
    RETURN: schedule.returns.filter(isRemaining).length,
  };
  const remainingTotal = remaining.PICKUP + remaining.RETURN;
  const overdueTotal = [...schedule.departures, ...schedule.returns].filter(
    (row) => row.bucket === "overdue" && !row.done
  ).length;

  const rows = schedule[TABS[tab].key];
  const groups = groupRows(rows);
  const pendingCount = queue.filter((item) => item.status !== "failed").length;
  const failedCount = queue.length - pendingCount;

  const now = new Date();
  const firstName = user?.firstName || "";
  const greeting = now.getHours() < 12 ? "Günaydın" : now.getHours() < 18 ? "İyi günler" : "İyi akşamlar";
  const welcomeSub =
    overdueTotal > 0
      ? `${overdueTotal} iş gecikmede, önce onlara bak.`
      : "Bugünkü saha planın hazır.";

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.canvas} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>R</Text></View>
            <View>
              <Text style={styles.brandName}>RENTWIN</Text>
              <Text style={styles.brandCaption}>SAHA EKİBİ</Text>
            </View>
          </View>
          <Pressable
            onPress={confirmLogout}
            style={styles.profileButton}
            accessibilityRole="button"
            accessibilityLabel="Oturumu kapat"
          >
            <Text style={styles.profileInitial}>{(firstName || "S").charAt(0).toLocaleUpperCase("tr-TR")}</Text>
          </Pressable>
        </View>

        <View style={styles.welcomeBlock}>
          <Text style={styles.eyebrow}>
            {now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }).toLocaleUpperCase("tr-TR")}
          </Text>
          <Text style={styles.greeting}>{greeting}{firstName ? `, ${firstName}` : ""}</Text>
          <Text style={[styles.welcomeSub, overdueTotal > 0 && styles.welcomeSubAlert]}>{welcomeSub}</Text>
        </View>

        {/* The two counters double as the tab switch, so the numbers aren't repeated elsewhere. */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryLabel}>BUGÜN KALAN</Text>
            <Text style={styles.summaryNumber}>{loading ? "–" : remainingTotal}</Text>
            <Text style={styles.summaryCaption}>{remainingTotal === 0 && !loading ? "her şey tamam" : "iş seni bekliyor"}</Text>
          </View>
          <View style={styles.tabs}>
            {Object.entries(TABS).map(([stage, { label }]) => {
              const active = tab === stage;
              return (
                <Pressable
                  key={stage}
                  onPress={() => setTab(stage)}
                  style={[styles.tab, active && styles.tabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabNumber, active && styles.tabNumberActive]}>
                    {loading ? "–" : remaining[stage]}
                  </Text>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {pendingCount > 0 && (
          <View style={styles.queueBanner}>
            <View style={styles.queueIcon}><Text style={styles.queueIconText}>↑</Text></View>
            <View style={styles.queueCopy}>
              <Text style={styles.queueTitle}>Gönderim sürüyor</Text>
              <Text style={styles.queueText}>{pendingCount} kayıt bağlantı bekliyor</Text>
            </View>
            <View style={styles.queueBadge}><Text style={styles.queueBadgeText}>{pendingCount}</Text></View>
          </View>
        )}

        {failedCount > 0 && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {failedCount} kayıt gönderilemedi. İlgili kontrata girip tekrar deneyin.
            </Text>
          </View>
        )}

        {loadError && (
          <Pressable onPress={onRefresh} style={styles.errorBanner}>
            <Text style={styles.errorText}>Program alınamadı. Yenilemek için dokun.</Text>
            <Text style={styles.errorArrow}>↻</Text>
          </Pressable>
        )}

        {loading ? (
          <View style={styles.loadingCard}><ActivityIndicator color={COLORS.green} /></View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>✓</Text></View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>{TABS[tab].empty}</Text>
              <Text style={styles.emptyText}>Yeni kayıt geldiğinde burada görünecek.</Text>
            </View>
          </View>
        ) : (
          GROUPS.filter((group) => groups[group.key].length > 0).map((group) => (
            <View key={group.key} style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={[styles.sectionTitle, group.tone === "red" && styles.sectionTitleRed]}>{group.title}</Text>
                <View style={[styles.countPill, group.tone === "red" && styles.countPillRed]}>
                  <Text style={[styles.countText, group.tone === "red" && styles.countTextRed]}>
                    {groups[group.key].length}
                  </Text>
                </View>
              </View>
              {groups[group.key].map((row) => (
                <ScheduleCard key={`${row.stage}-${row.id}`} row={row} overdue={group.key === "overdue"} onOpen={openContract} />
              ))}
            </View>
          ))
        )}

        <Text style={styles.footerNote}>Güncel liste için ekranı aşağı çek</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center" },
  brandMarkText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  brandName: { color: COLORS.ink, fontSize: 12, letterSpacing: 1.5, fontWeight: "800" },
  brandCaption: { color: COLORS.muted, fontSize: 9, letterSpacing: 1.6, marginTop: 2, fontWeight: "700" },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e3ebe5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#d5e1d8" },
  profileInitial: { color: COLORS.green, fontSize: 16, fontWeight: "800" },
  welcomeBlock: { marginBottom: 22 },
  eyebrow: { color: COLORS.green, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 8 },
  greeting: { color: COLORS.ink, fontSize: 27, letterSpacing: -0.7, fontWeight: "800" },
  welcomeSub: { color: COLORS.muted, fontSize: 14, marginTop: 5 },
  welcomeSubAlert: { color: COLORS.red, fontWeight: "700" },

  summaryCard: { backgroundColor: COLORS.green, borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", marginBottom: 22, shadowColor: "#174c38", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 5 },
  summaryMain: { flex: 1 },
  summaryLabel: { color: "#c7e3d2", fontWeight: "700", fontSize: 9, letterSpacing: 1.3 },
  summaryNumber: { color: "#fff", fontSize: 36, fontWeight: "800", lineHeight: 43, marginTop: 4 },
  summaryCaption: { color: "#d7ebdf", fontSize: 12 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { width: 70, paddingVertical: 10, borderRadius: 15, alignItems: "center", backgroundColor: "#ffffff1a" },
  tabActive: { backgroundColor: "#fff" },
  tabNumber: { color: "#fff", fontSize: 20, fontWeight: "800" },
  tabNumberActive: { color: COLORS.green },
  tabLabel: { color: "#d7ebdf", fontSize: 11, marginTop: 2, fontWeight: "700" },
  tabLabelActive: { color: COLORS.green },

  queueBanner: { backgroundColor: COLORS.amberSoft, borderColor: COLORS.amberLine, borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 16 },
  queueIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#ffedcc", alignItems: "center", justifyContent: "center" },
  queueIconText: { color: COLORS.amber, fontSize: 19, fontWeight: "800" },
  queueCopy: { flex: 1, marginLeft: 11 },
  queueTitle: { color: "#72440f", fontSize: 13, fontWeight: "700" },
  queueText: { color: "#9a6b2f", fontSize: 11, marginTop: 2 },
  queueBadge: { minWidth: 25, height: 25, borderRadius: 13, backgroundColor: "#f3dfbd", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  queueBadgeText: { color: COLORS.amber, fontSize: 11, fontWeight: "800" },
  errorBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.redSoft, padding: 14, borderRadius: 14, marginBottom: 16 },
  errorText: { color: COLORS.red, fontSize: 12, fontWeight: "600", flex: 1 },
  errorArrow: { color: COLORS.red, fontSize: 20, marginLeft: 8 },

  section: { marginBottom: 20 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionTitleRed: { color: COLORS.red },
  countPill: { minWidth: 30, height: 30, borderRadius: 11, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  countPillRed: { backgroundColor: COLORS.redSoft },
  countText: { color: COLORS.green, fontWeight: "800", fontSize: 12 },
  countTextRed: { color: COLORS.red },
  loadingCard: { minHeight: 88, backgroundColor: COLORS.card, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.line },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line, padding: 15, flexDirection: "row", alignItems: "center" },
  emptyMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center" },
  emptyMarkText: { color: COLORS.green, fontSize: 18, fontWeight: "800" },
  emptyCopy: { flex: 1, marginLeft: 11 },
  emptyTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "700" },
  emptyText: { color: COLORS.muted, fontSize: 11, marginTop: 3 },

  carCard: { backgroundColor: COLORS.card, borderRadius: 17, padding: 15, marginBottom: 9, borderWidth: 1, borderColor: COLORS.line },
  carCardDone: { opacity: 0.6 },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  carCardTop: { flexDirection: "row", alignItems: "center" },
  carThumb: { width: 54, height: 42, borderRadius: 12, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  carThumbImage: { width: 54, height: 42 },
  carThumbText: { color: COLORS.green, fontSize: 18, fontWeight: "800" },
  carIdentity: { flex: 1, marginLeft: 11, marginRight: 6 },
  plate: { color: COLORS.ink, fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
  carModel: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  timeBlock: { alignItems: "flex-end", maxWidth: 110 },
  time: { color: COLORS.green, fontSize: 15, fontWeight: "800" },
  timeOverdue: { color: COLORS.red },
  place: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  placeOverdue: { color: COLORS.red, fontWeight: "700" },
  doneBadge: { backgroundColor: COLORS.greenSoft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
  doneBadgeText: { color: COLORS.green, fontSize: 11, fontWeight: "800" },
  cardDivider: { height: 1, backgroundColor: "#eff1ef", marginVertical: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  customer: { color: "#58645e", fontSize: 11, flex: 1, marginRight: 8 },
  contract: { color: COLORS.green, fontSize: 11, fontWeight: "700" },
  footerNote: { color: COLORS.subtle, fontSize: 10, textAlign: "center", marginTop: 2 },
});
