import { useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Alert, RefreshControl, Linking } from "react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import {
  getReservationById,
  confirmReservation,
  cancelReservation,
  convertReservation,
} from "../../../api/admin";
import {
  LoadingScreen,
  ErrorBanner,
  SectionCard,
  StatusBadge,
  EmptyState,
  InfoRow,
  Button,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { customerName, wallDateTime, localDate, apiError, billableDays } from "../../../utils/admin";

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getReservationById(id);
      setReservation(r);
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

  const confirmThen = (title, message, confirmText, action, { destructive, after } = {}) => {
    Alert.alert(title, message, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: confirmText,
        style: destructive ? "destructive" : "default",
        onPress: async () => {
          setBusy(true);
          try {
            const result = await action();
            if (after) after(result);
            else await load();
          } catch (err) {
            Alert.alert("Hata", apiError(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const stale = reservation && reservation.id !== id;
  if (error && (!reservation || stale)) return <ErrorBanner message="Rezervasyon yüklenemedi." onRetry={load} />;
  if (loading || stale) return <LoadingScreen />;
  if (!reservation) return <EmptyState icon="📅" title="Rezervasyon bulunamadı" />;

  const r = reservation;
  const open = r.status === "PENDING" || r.status === "CONFIRMED";
  const phone = r.customer?.phoneNumber;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      showsVerticalScrollIndicator={false}
    >
      {error && <ErrorBanner message="Güncel veri alınamadı." onRetry={load} />}

      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => r.userId && router.push(`/(admin)/users/${r.userId}`)}>
            <Text style={styles.heroName}>{customerName(r)} ›</Text>
          </Pressable>
          {r.customer?.email ? <Text style={styles.heroSub}>{r.customer.email}</Text> : null}
          {phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${phone}`)}>
              <Text style={styles.heroPhone}>📞 {phone}</Text>
            </Pressable>
          ) : null}
        </View>
        <StatusBadge status={r.status} />
      </View>

      <SectionCard title="Rezervasyon Bilgileri">
        <InfoRow label="Alış" value={wallDateTime(r.pickUpTime)} />
        <InfoRow label="Bırakış" value={wallDateTime(r.dropOffTime)} />
        <InfoRow label="Süre" value={`${billableDays(r)} gün`} />
        <InfoRow label="Alış yeri" value={r.pickUpLocation} />
        <InfoRow label="Bırakış yeri" value={r.dropOffLocation} />
        <InfoRow label="Oluşturulma" value={localDate(r.createdAt)} />
      </SectionCard>

      {r.car ? (
        <Pressable onPress={() => r.carId && router.push(`/(admin)/vehicles/${r.carId}`)}>
          <SectionCard title="Araç" right={<Text style={styles.link}>Aç ›</Text>}>
            <InfoRow label="Plaka" value={r.car.licensePlate} />
            <InfoRow label="Araç" value={[r.car.brand, r.car.model, r.car.modelYear].filter(Boolean).join(" ")} />
            <InfoRow label="Şube" value={r.car.branch?.name} />
          </SectionCard>
        </Pressable>
      ) : null}

      {r.note ? (
        <SectionCard title="Not">
          <Text style={styles.noteText}>{r.note}</Text>
        </SectionCard>
      ) : null}

      <View style={styles.actions}>
        {r.contractId ? (
          <Button title="📋  Kontratı Aç" onPress={() => router.push(`/(admin)/contracts/${r.contractId}`)} />
        ) : null}
        {r.status === "PENDING" && (
          <Button
            title="✓  Rezervasyonu Onayla"
            disabled={busy}
            onPress={() => confirmThen("Rezervasyonu Onayla", "Rezervasyon onaylanacak.", "Onayla", () => confirmReservation(id))}
          />
        )}
        {open && (
          <Button
            title="⇢  Kontrata Dönüştür"
            variant="blue"
            disabled={busy}
            onPress={() =>
              confirmThen(
                "Kontrata Dönüştür",
                "Bu rezervasyondan bir kontrat taslağı oluşturulacak. Fiyatlandırma ve diğer detaylar web panelinden tamamlanmalı.",
                "Dönüştür",
                () => convertReservation(id),
                { after: (res) => (res?.contractId ? router.push(`/(admin)/contracts/${res.contractId}`) : load()) }
              )
            }
          />
        )}
        {open && (
          <Button
            title="✕  Rezervasyonu İptal Et"
            variant="danger"
            disabled={busy}
            onPress={() =>
              confirmThen("Rezervasyonu İptal Et", "Rezervasyon iptal edilecek.", "İptal Et", () => cancelReservation(id), {
                destructive: true,
              })
            }
          />
        )}
      </View>
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
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
  },
  heroName:  { fontSize: 18, fontWeight: "800", color: COLORS.green },
  heroSub:   { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  heroPhone: { fontSize: 13, color: COLORS.ink, marginTop: 6 },
  link:      { fontSize: 12, color: COLORS.green, fontWeight: "700" },
  noteText:  { fontSize: 13, color: COLORS.ink, lineHeight: 19 },
  actions:   { gap: 10, marginTop: 4 },
});
