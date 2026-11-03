import { useState, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import {
  getVehicleById,
  markVehiclePassive,
  unmarkVehiclePassive,
} from "../../../api/admin";
import {
  LoadingScreen,
  ErrorBanner,
  SectionCard,
  EmptyState,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatusBar({ vehicle }) {
  let label = "Müsait", color = COLORS.green, bg = COLORS.greenSoft;
  if (vehicle.outOfService) { label = "Servis Dışı"; color = COLORS.red;   bg = COLORS.redSoft; }
  else if (vehicle.passiveAt) { label = "Pasif";       color = COLORS.muted; bg = "#f0f1f0"; }
  else if (vehicle.isRented)  { label = "Kirada";      color = COLORS.amber; bg = COLORS.amberSoft; }

  return (
    <View style={[styles.statusBar, { backgroundColor: bg, borderColor: color + "44" }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("tr-TR");
}

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams();
  const [vehicle, setVehicle]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const v = await getVehicleById(id);
      setVehicle(v);
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

  const handleTogglePassive = () => {
    if (!vehicle) return;
    const isPassive = !!vehicle.passiveAt;

    Alert.alert(
      isPassive ? "Araçı Aktifleştir" : "Araçı Pasife Al",
      isPassive
        ? "Bu araç tekrar kiralanabilir duruma getirilecek."
        : "Bu araç geçici olarak filodan çekilecek ve kiralanamayacak.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: isPassive ? "Aktife Al" : "Pasife Al",
          style: isPassive ? "default" : "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              if (isPassive) {
                await unmarkVehiclePassive(id);
              } else {
                await markVehiclePassive(id, {});
              }
              await load();
            } catch (err) {
              Alert.alert("Hata", err?.response?.data?.message || "İşlem gerçekleştirilemedi.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorBanner message="Araç bilgileri yüklenemedi." onRetry={load} />;
  if (!vehicle) return <EmptyState icon="🚗" title="Araç bulunamadı" />;

  const v = vehicle;
  const name = [v.brand, v.model, v.year].filter(Boolean).join(" ");
  const isPassive = !!v.passiveAt;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroThumb}>
          {v.image ? (
            <Image source={{ uri: v.image }} style={styles.heroImg} resizeMode="contain" />
          ) : (
            <Text style={styles.heroEmoji}>🚗</Text>
          )}
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroPlate}>{v.licensePlate || "—"}</Text>
          <Text style={styles.heroName}>{name}</Text>
          <StatusBar vehicle={v} />
        </View>
      </View>

      {/* Aktif Kiralama Varsa Kart */}
      {v.activeContractId && (
        <Pressable
          style={styles.activeContractCard}
          onPress={() => router.push(`/(admin)/contracts/${v.activeContractId}`)}
        >
          <View style={styles.activeContractDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeContractTitle}>Bu araç şu anda aktif kirada!</Text>
            <Text style={styles.activeContractSub}>Kontrat detaylarını görüntülemek için tıklayın</Text>
          </View>
          <Text style={styles.activeContractArrow}>›</Text>
        </Pressable>
      )}

      {/* Araç Bilgileri */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Araç Bilgileri</Text>
        <InfoRow label="Marka / Model" value={`${v.brand || ""} ${v.model || ""}`.trim()} />
        <InfoRow label="Yıl"           value={v.year} />
        <InfoRow label="Renk"          value={v.color} />
        <InfoRow label="Vites"         value={v.transmission} />
        <InfoRow label="Yakıt"         value={v.fuelType} />
        <InfoRow label="Kasa Tipi"     value={v.bodyType} />
        <InfoRow label="Motor"         value={v.engineSize} />
        <InfoRow label="Şube"          value={v.branch?.name} />
      </SectionCard>

      {/* Bakım / Muayene */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Bakım & Muayene</Text>
        <InfoRow label="Son Bakım"         value={fmtDate(v.lastMaintenanceDate)} />
        <InfoRow label="Sonraki Bakım"     value={fmtDate(v.nextMaintenanceDate)} />
        <InfoRow label="Son Muayene"       value={fmtDate(v.lastInspectionDate)} />
        <InfoRow label="Sonraki Muayene"   value={fmtDate(v.nextInspectionDate)} />
        <InfoRow label="Sigorta Bitiş"     value={fmtDate(v.insuranceExpiry)} />
        <InfoRow label="Kasko Bitiş"       value={fmtDate(v.kaskoExpiry)} />
      </SectionCard>

      {/* Fiyatlar */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Fiyatlar</Text>
        <InfoRow label="Günlük"  value={v.dailyPrice  != null ? `₺${Number(v.dailyPrice).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="Aylık"   value={v.monthlyPrice!= null ? `₺${Number(v.monthlyPrice).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="Depozito"value={v.deposit     != null ? `₺${Number(v.deposit).toLocaleString("tr-TR")}` : null} />
      </SectionCard>

      {/* Aksiyonlar */}
      {!actionLoading && !v.isRented && (
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.actionBtn,
              isPassive ? styles.actionActiveBtn : styles.actionPassiveBtn,
            ]}
            onPress={handleTogglePassive}
          >
            <Text
              style={[
                styles.actionBtnText,
                { color: isPassive ? COLORS.green : COLORS.red },
              ]}
            >
              {isPassive ? "✓  Araçı Tekrar Aktifleştir" : "⏸  Araçı Pasife Al"}
            </Text>
          </Pressable>
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
    width: 80, height: 64,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImg:   { width: 80, height: 64 },
  heroEmoji: { fontSize: 32 },
  heroInfo:  { flex: 1, gap: 4 },
  heroPlate: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  heroName:  { fontSize: 13, color: COLORS.muted },
  statusBar: { alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  statusText:{ fontSize: 12, fontWeight: "700" },

  activeContractCard: {
    backgroundColor: COLORS.amberSoft,
    borderColor: COLORS.amberLine,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  activeContractDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.amber },
  activeContractTitle: { fontSize: 14, fontWeight: "800", color: "#78350f" },
  activeContractSub:   { fontSize: 11, color: "#92400e", marginTop: 2 },
  activeContractArrow: { fontSize: 22, color: COLORS.amber, fontWeight: "800" },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  infoRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  infoLabel: { fontSize: 13, color: COLORS.muted, flex: 1 },
  infoValue: { fontSize: 13, color: COLORS.ink, fontWeight: "600", flex: 1, textAlign: "right" },

  actions:          { gap: 10, marginTop: 8 },
  actionBtn:        { borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1.5 },
  actionPassiveBtn: { backgroundColor: COLORS.redSoft, borderColor: COLORS.red + "55" },
  actionActiveBtn:  { backgroundColor: COLORS.greenSoft, borderColor: COLORS.green + "55" },
  actionBtnText:    { fontSize: 14, fontWeight: "700" },
});

