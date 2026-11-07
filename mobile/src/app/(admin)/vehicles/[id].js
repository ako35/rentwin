import { useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, Image, RefreshControl, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import {
  getVehicleById,
  getContractsByVehicle,
  markVehiclePassive,
  unmarkVehiclePassive,
} from "../../../api/admin";
import {
  LoadingScreen,
  ErrorBanner,
  SectionCard,
  EmptyState,
  InfoRow,
  StatusBadge,
  Button,
  Sheet,
  Field,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { TRANSMISSION_LABEL, FUEL_TYPE_LABEL } from "../../../constants/labels";
import { formatKm, fuelLabel } from "../../../utils/format";
import {
  vehicleImageUrl,
  vehicleStatus,
  BODY_TYPE_LABEL,
  dayDate,
  localDate,
  wallDate,
  money,
  apiError,
} from "../../../utils/admin";

const HISTORY_LIMIT = 10;

function PassiveSheet({ onClose, onConfirm, saving }) {
  const [note, setNote] = useState("");
  return (
    <Sheet visible title="Aracı Pasife Al" onClose={onClose}>
      <Text style={styles.sheetText}>
        Araç geçici olarak filodan çekilir: kiralanamaz, filo sayılarına ve bakım/muayene uyarılarına girmez.
      </Text>
      <Field label="Sebep (opsiyonel)" value={note} onChangeText={setNote} multiline placeholder="Örn. kaporta onarımı" />
      <Button title="Pasife Al" variant="danger" onPress={() => onConfirm(note)} loading={saving} />
    </Sheet>
  );
}

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams();
  const [vehicle, setVehicle] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passiveOpen, setPassiveOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, history] = await Promise.all([
        getVehicleById(id),
        getContractsByVehicle(id).catch(() => []),
      ]);
      setVehicle(v);
      setContracts(Array.isArray(history) ? history : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const markPassive = async (note) => {
    setBusy(true);
    try {
      await markVehiclePassive(id, note.trim() ? { passiveNote: note.trim() } : {});
      setPassiveOpen(false);
      await load();
    } catch (err) {
      Alert.alert("Hata", apiError(err, "Araç pasife alınamadı."));
    } finally {
      setBusy(false);
    }
  };

  const unmarkPassive = () => {
    Alert.alert("Aracı Aktifleştir", "Araç tekrar kiralanabilir filoya alınacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Aktifleştir",
        onPress: async () => {
          setBusy(true);
          try {
            await unmarkVehiclePassive(id);
            await load();
          } catch (err) {
            Alert.alert("Hata", apiError(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const stale = vehicle && vehicle.id !== id;
  if (error && (!vehicle || stale)) return <ErrorBanner message="Araç bilgileri yüklenemedi." onRetry={load} />;
  if (loading || stale) return <LoadingScreen />;
  if (!vehicle) return <EmptyState icon="🚗" title="Araç bulunamadı" />;

  const v = vehicle;
  const status = vehicleStatus(v);
  const uri = vehicleImageUrl(v);
  const isPassive = v.status === "PASSIVE";
  const isSold = v.status === "SOLD";

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        showsVerticalScrollIndicator={false}
      >
        {error && <ErrorBanner message="Güncel veri alınamadı." onRetry={load} />}

        <View style={styles.hero}>
          <View style={styles.heroThumb}>
            {uri ? (
              <Image source={{ uri }} style={styles.heroImg} resizeMode="contain" />
            ) : (
              <Text style={styles.heroEmoji}>🚗</Text>
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroPlate}>{v.licensePlate || "—"}</Text>
            <Text style={styles.heroName}>{[v.brand, v.model, v.modelYear].filter(Boolean).join(" ")}</Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: status.color + "44" }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {v.activeContractId ? (
          <Pressable
            style={styles.activeContractCard}
            onPress={() => router.push(`/(admin)/contracts/${v.activeContractId}`)}
          >
            <View style={styles.activeContractDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeContractTitle}>Araç şu anda kirada</Text>
              <Text style={styles.activeContractSub}>Aktif kontratı açmak için dokunun</Text>
            </View>
            <Text style={styles.activeContractArrow}>›</Text>
          </Pressable>
        ) : null}

        {isPassive && (v.passiveNote || v.passiveAt) ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              {localDate(v.passiveAt)} tarihinden beri pasif{v.passiveNote ? ` — ${v.passiveNote}` : ""}
            </Text>
          </View>
        ) : null}
        {isSold ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              {localDate(v.soldAt)} tarihinde satıldı{v.saleNote ? ` — ${v.saleNote}` : ""}
            </Text>
          </View>
        ) : null}

        <SectionCard title="Araç Bilgileri">
          <InfoRow label="Marka / Model" value={`${v.brand || ""} ${v.model || ""}`.trim()} />
          <InfoRow label="Model yılı" value={v.modelYear} />
          <InfoRow label="Renk" value={v.color} />
          <InfoRow label="Vites" value={TRANSMISSION_LABEL[v.transmission] || v.transmission} />
          <InfoRow label="Yakıt" value={FUEL_TYPE_LABEL[v.fuelType] || v.fuelType} />
          <InfoRow label="Kasa tipi" value={BODY_TYPE_LABEL[v.bodyType] || v.bodyType} />
          <InfoRow label="Şube" value={v.branch?.name} />
          <InfoRow label="Şasi no" value={v.chassisNo} mono />
          <InfoRow label="Motor no" value={v.engineNo} mono />
          <InfoRow label="Ruhsat seri no" value={v.registrationSerialNo} mono />
          <InfoRow label="Tescil tarihi" value={v.registrationDate ? dayDate(v.registrationDate) : null} />
        </SectionCard>

        <SectionCard title="Km, Bakım & Muayene">
          <InfoRow label="Güncel km" value={v.currentKm != null ? formatKm(v.currentKm) : null} />
          <InfoRow label="Yakıt" value={v.currentFuelEighths != null ? fuelLabel(v.currentFuelEighths) : null} />
          <InfoRow label="Bakım aralığı" value={v.maintenanceIntervalKm ? formatKm(v.maintenanceIntervalKm) : null} />
          <InfoRow label="Sonraki bakım km" value={v.nextMaintenanceKm ? formatKm(v.nextMaintenanceKm) : null} />
          <InfoRow label="Sonraki bakım" value={v.nextMaintenanceDate ? dayDate(v.nextMaintenanceDate) : null} />
          <InfoRow label="Sonraki muayene" value={v.nextInspectionDate ? dayDate(v.nextInspectionDate) : null} />
          <Text style={styles.hint}>Sigorta, kasko, vergi ve bakım kayıtları web panelinden yönetilir.</Text>
        </SectionCard>

        <SectionCard title="Fiyat Listesi">
          <InfoRow label="Günlük" value={v.dailyPrice != null ? money(v.dailyPrice) : "—"} />
          <InfoRow label="Aylık" value={v.monthlyPrice != null ? money(v.monthlyPrice) : "—"} />
          {v.dailyPrice == null && v.monthlyPrice == null ? <Text style={styles.hint}>Fiyat girilmemiş.</Text> : null}
        </SectionCard>

        {v.notes ? (
          <SectionCard title="Notlar">
            <Text style={styles.noteText}>{v.notes}</Text>
          </SectionCard>
        ) : null}

        <SectionCard title={`Kontrat Geçmişi${contracts.length ? ` (${contracts.length})` : ""}`}>
          {contracts.length === 0 ? (
            <Text style={styles.hint}>Bu araçla kontrat yapılmamış.</Text>
          ) : (
            contracts.slice(0, HISTORY_LIMIT).map((c) => (
              <Pressable
                key={c.id}
                style={({ pressed }) => [styles.historyRow, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/(admin)/contracts/${c.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName} numberOfLines={1}>{c.customerName || "—"}</Text>
                  <Text style={styles.historyDates}>
                    {wallDate(c.pickUpTime)} → {wallDate(c.returnedAt || c.dropOffTime)}
                  </Text>
                </View>
                <StatusBadge status={c.status} />
              </Pressable>
            ))
          )}
          {contracts.length > HISTORY_LIMIT ? (
            <Text style={styles.hint}>Son {HISTORY_LIMIT} kontrat gösteriliyor.</Text>
          ) : null}
        </SectionCard>

        {!isSold && (
          <View style={styles.actions}>
            <Button
              title="✎  Aracı Düzenle"
              variant="ghost"
              onPress={() => router.push(`/(admin)/vehicles/edit/${v.id}`)}
            />
            {isPassive ? (
              <Button title="✓  Aracı Tekrar Aktifleştir" onPress={unmarkPassive} loading={busy} />
            ) : v.status !== "RENTED" ? (
              <Button title="⏸  Aracı Pasife Al" variant="danger" onPress={() => setPassiveOpen(true)} disabled={busy} />
            ) : null}
          </View>
        )}
      </ScrollView>

      {passiveOpen && <PassiveSheet onClose={() => setPassiveOpen(false)} onConfirm={markPassive} saving={busy} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 16, paddingBottom: 40 },

  hero: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    marginBottom: 12,
    gap: 14,
    alignItems: "center",
  },
  heroThumb: {
    width: 96,
    height: 72,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImg:    { width: 96, height: 72 },
  heroEmoji:  { fontSize: 34 },
  heroInfo:   { flex: 1 },
  heroPlate:  { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  heroName:   { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  statusPill: { alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: "700" },

  activeContractCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: COLORS.amberLine,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  activeContractDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.amber },
  activeContractTitle: { fontSize: 14, fontWeight: "800", color: COLORS.amber },
  activeContractSub:   { fontSize: 12, color: COLORS.amber, marginTop: 2 },
  activeContractArrow: { fontSize: 22, color: COLORS.amber, fontWeight: "700" },

  noticeCard: { backgroundColor: "#f0f1f0", borderRadius: 12, padding: 12, marginBottom: 12 },
  noticeText: { fontSize: 13, color: COLORS.muted },

  hint:     { fontSize: 11, color: COLORS.subtle, marginTop: 8 },
  noteText: { fontSize: 13, color: COLORS.ink, lineHeight: 19 },

  historyRow:   {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  historyName:  { fontSize: 13, fontWeight: "700", color: COLORS.ink },
  historyDates: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  actions:   { gap: 10, marginTop: 4 },
  sheetText: { fontSize: 13, color: COLORS.muted, lineHeight: 19, marginBottom: 12 },
});
