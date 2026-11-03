import { useState, useCallback } from "react";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import {
  ScrollView, View, Text, StyleSheet, Pressable, Alert, RefreshControl,
} from "react-native";
import {
  getReservationById, confirmReservation, cancelReservation,
} from "../../../api/admin";
import {
  LoadingScreen, ErrorBanner, SectionCard, StatusBadge, EmptyState,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const r = await getReservationById(id);
      setReservation(r);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleConfirm = () => {
    Alert.alert("Rezervasyonu Onayla", "Bu rezervasyonu onaylamak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Onayla",
        onPress: async () => {
          try {
            setActionLoading(true);
            await confirmReservation(id);
            await load();
          } catch (e) {
            Alert.alert("Hata", e?.response?.data?.message || "Onay başarısız.");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert("Rezervasyonu İptal Et", "Bu rezervasyonu iptal etmek istiyor musunuz?", [
      { text: "Geri", style: "cancel" },
      {
        text: "İptal Et",
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoading(true);
            await cancelReservation(id);
            await load();
          } catch (e) {
            Alert.alert("Hata", e?.response?.data?.message || "İptal başarısız.");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorBanner message="Rezervasyon yüklenemedi." onRetry={load} />;
  if (!reservation) return <EmptyState icon="📅" title="Rezervasyon bulunamadı" />;

  const r = reservation;
  const isPending   = r.status === "PENDING";
  const isConfirmed = r.status === "CONFIRMED";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View>
          <Text style={styles.heroName}>{r.user?.name || r.name || "—"}</Text>
          <Text style={styles.heroNo}>{r.reservationNo || r.id?.slice(0, 10)}</Text>
        </View>
        <StatusBadge status={r.status} />
      </View>

      <SectionCard>
        <Text style={styles.sectionTitle}>Rezervasyon Bilgileri</Text>
        <InfoRow label="Teslim Tarihi"  value={fmt(r.pickUpTime)} />
        <InfoRow label="İade Tarihi"    value={fmt(r.dropOffTime)} />
        <InfoRow label="Teslim Yeri"    value={r.pickUpLocation} />
        <InfoRow label="İade Yeri"      value={r.dropOffLocation} />
        <InfoRow label="Araç"           value={r.car ? `${r.car.brand || ""} ${r.car.model || ""} — ${r.car.licensePlate || ""}`.trim() : null} />
        <InfoRow label="Uçuş No"        value={r.flightNo} />
        <InfoRow label="Not"            value={r.customerNote} />
      </SectionCard>

      {!actionLoading && (isPending || isConfirmed) && (
        <View style={styles.actions}>
          {isPending && (
            <Pressable style={[styles.actionBtn, styles.actionConfirm]} onPress={handleConfirm}>
              <Text style={styles.actionBtnText}>✓  Rezervasyonu Onayla</Text>
            </Pressable>
          )}
          {(isPending || isConfirmed) && (
            <Pressable style={[styles.actionBtn, styles.actionCancel]} onPress={handleCancel}>
              <Text style={[styles.actionBtnText, { color: COLORS.red }]}>✕  Rezervasyonu İptal Et</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
  },
  heroName:     { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  heroNo:       { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  infoRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  infoLabel: { fontSize: 13, color: COLORS.muted, flex: 1 },
  infoValue: { fontSize: 13, color: COLORS.ink, fontWeight: "600", flex: 1, textAlign: "right" },
  actions:       { gap: 10, marginTop: 4 },
  actionBtn:     { borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1.5 },
  actionConfirm: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  actionCancel:  { backgroundColor: COLORS.redSoft, borderColor: COLORS.red + "55" },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
