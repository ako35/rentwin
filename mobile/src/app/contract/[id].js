import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../auth/AuthContext";
import { getFieldContract } from "../../api/client";
import { STAGE_LABEL } from "../../constants/checklist";
import { FUEL_TYPE_LABEL, TRANSMISSION_LABEL } from "../../constants/labels";
import { CARD, COLORS } from "../../constants/theme";
import { discardFailed, flushQueue, getQueue, subscribeQueue } from "../../queue/upload-queue";
import { formatKm, fuelLabel, groupThousands, wallDate, wallDayName, wallTime, whatsappNumber } from "../../utils/format";

// Contract detail — everything the crew needs at the car before shooting:
// the vehicle, who to call, when/where, notes, and per-stage progress.
// Opened from the schedule with { id, stage, plate }; `stage` puts that
// hand-over first.
export default function ContractScreen() {
  const { id: contractId, stage: focusStage, plate } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [queueItems, setQueueItems] = useState([]);

  const load = useCallback(async () => {
    try {
      setContract(await getFieldContract(contractId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [contractId]);

  // Refetch on every focus so counts/readings are fresh after a capture.
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  useEffect(() => {
    const pick = (q) => q.filter((i) => i.contractId === contractId);
    getQueue().then((q) => setQueueItems(pick(q)));
    return subscribeQueue((q) => setQueueItems(pick(q)));
  }, [contractId]);

  if (!authLoading && !user) return <Redirect href="/login" />;

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCapture = (stage) =>
    router.push({
      pathname: "/capture/[id]",
      params: { id: contractId, stage, plate: contract?.car?.licensePlate || plate || "" },
    });

  const failed = queueItems.filter((i) => i.status === "failed");
  const stages = focusStage === "RETURN" ? ["RETURN", "PICKUP"] : ["PICKUP", "RETURN"];
  const car = contract?.car;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: contract?.contractNo || "Kontrat" }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      >
        {failed.length > 0 && (
          <View style={styles.failBanner}>
            <Text style={styles.failTitle}>{failed.length} kayıt gönderilemedi</Text>
            <Text style={styles.failText}>{failed[0].lastError}</Text>
            <View style={styles.failActions}>
              <Pressable onPress={flushQueue} style={styles.failButton}>
                <Text style={styles.failButtonText}>Tekrar dene</Text>
              </Pressable>
              <Pressable onPress={() => discardFailed(contractId)} style={styles.failGhost}>
                <Text style={styles.failGhostText}>Vazgeç</Text>
              </Pressable>
            </View>
          </View>
        )}

        {loadError && (
          <Pressable onPress={onRefresh} style={styles.errorBanner}>
            <Text style={styles.errorText}>Kontrat bilgileri alınamadı. Yenilemek için dokun.</Text>
          </Pressable>
        )}

        {loading && !contract ? (
          <View style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : (
          contract && (
            <>
              <View style={[styles.card, styles.vehicleCard]}>
                <View style={styles.vehicleImageWrap}>
                  {car?.image ? (
                    <Image source={{ uri: car.image }} style={styles.vehicleImage} resizeMode="contain" />
                  ) : (
                    <Text style={styles.vehicleImageFallback}>{car?.brand?.charAt(0) || "R"}</Text>
                  )}
                </View>
                <Text style={styles.plate}>{car?.licensePlate || plate || "—"}</Text>
                <Text style={styles.vehicleName}>
                  {[car?.brand, car?.model].filter(Boolean).join(" ").trim()}
                  {car?.modelYear ? ` · ${car.modelYear}` : ""}
                </Text>
                <View style={styles.specRow}>
                  {[TRANSMISSION_LABEL[car?.transmission], FUEL_TYPE_LABEL[car?.fuelType], car?.color]
                    .filter(Boolean)
                    .map((spec) => (
                      <View key={spec} style={styles.spec}>
                        <Text style={styles.specText}>{spec}</Text>
                      </View>
                    ))}
                </View>
              </View>

              <CustomerCard customer={contract.customer} drivers={contract.drivers} />

              <View style={styles.card}>
                <Text style={styles.eyebrow}>KİRALAMA</Text>
                <PlanRow label="Teslim" time={contract.pickUpTime} location={contract.pickUpLocation} />
                <View style={styles.planLine} />
                <PlanRow label="İade" time={contract.dropOffTime} location={contract.dropOffLocation} />
                {!!contract.flightNo && (
                  <View style={styles.flight}>
                    <Text style={styles.flightLabel}>Uçuş</Text>
                    <Text style={styles.flightValue}>{contract.flightNo}</Text>
                  </View>
                )}
              </View>

              {(contract.customerNote || contract.adminNote) && (
                <View style={styles.card}>
                  {!!contract.adminNote && <Note label="Ofis notu" text={contract.adminNote} />}
                  {!!contract.customerNote && <Note label="Müşteri notu" text={contract.customerNote} />}
                </View>
              )}
            </>
          )
        )}

        {/* Stage actions stay reachable even if the detail failed to load
            (no signal at the car) — capture works offline via the queue. */}
        {(contract || loadError) &&
          stages.map((stage) => (
            <StageCard
              key={stage}
              stage={stage}
              contract={contract}
              focused={stage === focusStage}
              pending={queueItems.filter((i) => i.stage === stage && i.status !== "failed").length}
              onCapture={() => openCapture(stage)}
            />
          ))}
      </ScrollView>
    </View>
  );
}

function CustomerCard({ customer, drivers }) {
  if (!customer) return null;
  const wa = whatsappNumber(customer.phone);
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>MÜŞTERİ</Text>
      <Text style={styles.customerName}>{customer.name || "—"}</Text>
      {!!customer.contactName && <Text style={styles.customerSub}>Yetkili: {customer.contactName}</Text>}
      {!!customer.phone && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => Linking.openURL(`tel:${customer.phone}`).catch(() => {})}
            style={[styles.actionButton, styles.actionPrimary]}
            accessibilityRole="button"
          >
            <Text style={styles.actionPrimaryText}>Ara · {customer.phone}</Text>
          </Pressable>
          {!!wa && (
            <Pressable
              onPress={() => Linking.openURL(`https://wa.me/${wa}`).catch(() => {})}
              style={styles.actionButton}
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>WhatsApp</Text>
            </Pressable>
          )}
        </View>
      )}
      {drivers?.length > 0 && (
        <View style={styles.drivers}>
          <Text style={styles.driversTitle}>Ek sürücüler</Text>
          {drivers.map((d, i) => (
            <View key={`${d.name}-${i}`} style={styles.driverRow}>
              <Text style={styles.driverName}>{d.name}</Text>
              {!!d.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${d.phone}`).catch(() => {})} hitSlop={8}>
                  <Text style={styles.driverCall}>Ara</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PlanRow({ label, time, location }) {
  return (
    <View style={styles.planRow}>
      <View style={styles.planDot} />
      <View style={styles.planCopy}>
        <Text style={styles.planLabel}>{label}</Text>
        <Text style={styles.planLocation}>{location || "—"}</Text>
      </View>
      <View style={styles.planWhen}>
        <Text style={styles.planTime}>{wallTime(time)}</Text>
        <Text style={styles.planDate}>
          {wallDate(time)} {wallDayName(time)}
        </Text>
      </View>
    </View>
  );
}

function Note({ label, text }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteLabel}>{label}</Text>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

function StageCard({ stage, contract, focused, pending, onCapture }) {
  const r = contract?.readings || {};
  const photos = contract?.photoCounts?.[stage] || 0;
  const km = stage === "PICKUP" ? r.pickUpKm : r.returnKm;
  const fuel = stage === "PICKUP" ? r.pickUpFuelEighths : r.returnFuelEighths;
  const used = stage === "RETURN" && r.returnKm != null && r.pickUpKm != null ? r.returnKm - r.pickUpKm : null;
  const done = photos > 0;
  const status = pending > 0 ? "uploading" : done ? "done" : "waiting";
  const label = STAGE_LABEL[stage];

  return (
    <View style={[styles.card, focused && styles.cardFocused]}>
      <View style={styles.stageHead}>
        <Text style={styles.stageTitle}>{label}</Text>
        <View style={[styles.chip, styles[`chip_${status}`]]}>
          <Text style={[styles.chipText, styles[`chipText_${status}`]]}>
            {status === "uploading" ? `${pending} kayıt yükleniyor` : status === "done" ? "Tamamlandı" : "Bekliyor"}
          </Text>
        </View>
      </View>
      {contract && (
        <View style={styles.stageFacts}>
          <Fact label="Fotoğraf" value={photos > 0 ? String(photos) : "—"} />
          <Fact label="Km" value={formatKm(km)} />
          <Fact label="Yakıt" value={fuelLabel(fuel)} />
        </View>
      )}
      {used != null && used >= 0 && (
        <Text style={styles.usedKm}>Bu kiralamada {groupThousands(used)} km yapıldı.</Text>
      )}
      <Pressable
        onPress={onCapture}
        style={[styles.stageButton, done && styles.stageButtonSecondary]}
        accessibilityRole="button"
      >
        <Text style={[styles.stageButtonText, done && styles.stageButtonTextSecondary]}>
          {done ? "Ek fotoğraf / km düzelt" : `${label} fotoğraflarını çek`}
        </Text>
      </Pressable>
    </View>
  );
}

function Fact({ label, value }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 20, paddingBottom: 40 },
  card: { ...CARD, marginBottom: 12 },
  cardFocused: { borderColor: COLORS.green, borderWidth: 1.5 },
  loadingCard: { minHeight: 120, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: COLORS.green, fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 10 },

  failBanner: { backgroundColor: COLORS.redSoft, borderRadius: 14, padding: 14, marginBottom: 12 },
  failTitle: { color: COLORS.red, fontSize: 13, fontWeight: "800" },
  failText: { color: COLORS.red, fontSize: 12, marginTop: 3 },
  failActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  failButton: { backgroundColor: COLORS.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  failButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  failGhost: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  failGhostText: { color: COLORS.red, fontSize: 12, fontWeight: "700" },
  errorBanner: { backgroundColor: COLORS.redSoft, borderRadius: 14, padding: 14, marginBottom: 12 },
  errorText: { color: COLORS.red, fontSize: 12, fontWeight: "600" },

  vehicleCard: { alignItems: "flex-start" },
  vehicleImageWrap: {
    alignSelf: "stretch",
    height: 150,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  vehicleImage: { width: "100%", height: "100%" },
  vehicleImageFallback: { color: COLORS.green, fontSize: 44, fontWeight: "800" },
  plate: { color: COLORS.ink, fontSize: 24, fontWeight: "800", letterSpacing: 0.5 },
  vehicleName: { color: COLORS.muted, fontSize: 13, marginTop: 3 },
  specRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  spec: { backgroundColor: COLORS.canvas, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
  specText: { color: "#58645e", fontSize: 11, fontWeight: "700" },

  customerName: { color: COLORS.ink, fontSize: 16, fontWeight: "800" },
  customerSub: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionButton: {
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
  },
  actionPrimary: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  actionPrimaryText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  actionText: { color: COLORS.green, fontSize: 13, fontWeight: "800" },
  drivers: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#eff1ef" },
  driversTitle: { color: COLORS.muted, fontSize: 11, fontWeight: "700", marginBottom: 6 },
  driverRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  driverName: { color: COLORS.ink, fontSize: 13, fontWeight: "600" },
  driverCall: { color: COLORS.green, fontSize: 13, fontWeight: "800" },

  planRow: { flexDirection: "row", alignItems: "center" },
  planDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.green, marginRight: 12 },
  planLine: { width: 1, height: 16, backgroundColor: COLORS.line, marginLeft: 4, marginVertical: 4 },
  planCopy: { flex: 1 },
  planLabel: { color: COLORS.ink, fontSize: 14, fontWeight: "800" },
  planLocation: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  planWhen: { alignItems: "flex-end" },
  planTime: { color: COLORS.green, fontSize: 16, fontWeight: "800" },
  planDate: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  flight: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eff1ef",
  },
  flightLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  flightValue: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },

  note: { marginBottom: 10 },
  noteLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "800", marginBottom: 4 },
  noteText: { color: COLORS.ink, fontSize: 13, lineHeight: 19 },

  stageHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stageTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  chip: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
  chip_waiting: { backgroundColor: COLORS.canvas },
  chip_done: { backgroundColor: COLORS.greenSoft },
  chip_uploading: { backgroundColor: COLORS.amberSoft },
  chipText: { fontSize: 11, fontWeight: "800" },
  chipText_waiting: { color: COLORS.muted },
  chipText_done: { color: COLORS.green },
  chipText_uploading: { color: COLORS.amber },
  stageFacts: { flexDirection: "row", marginTop: 14 },
  fact: { flex: 1 },
  factLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  factValue: { color: COLORS.ink, fontSize: 14, fontWeight: "800", marginTop: 3 },
  usedKm: { color: COLORS.green, fontSize: 12, fontWeight: "700", marginTop: 10 },
  stageButton: {
    backgroundColor: COLORS.green,
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  stageButtonSecondary: { backgroundColor: COLORS.greenSoft },
  stageButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  stageButtonTextSecondary: { color: COLORS.green },
});
