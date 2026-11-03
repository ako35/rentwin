import { useState, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import {
  getContractById,
  listInvoices,
  getInvoicePdfUrl,
  returnContract,
  cancelContract,
  reopenContract,
} from "../../../api/admin";
import {
  LoadingScreen,
  ErrorBanner,
  SectionCard,
  StatusBadge,
  EmptyState,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";

function InfoRow({ label, value, mono }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoMono]}>{value}</Text>
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

function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("tr-TR");
}

function InvoiceCard({ invoice, onOpenPdf }) {
  return (
    <View style={styles.invoiceCard}>
      <View style={styles.invoiceTop}>
        <View>
          <Text style={styles.invoiceNo}>{invoice.invoiceNo || "Fatura"}</Text>
          <Text style={styles.invoiceDates}>
            {fmtDate(invoice.periodFrom)} – {fmtDate(invoice.periodTo)}
          </Text>
        </View>
        <View style={styles.invoiceRight}>
          <Text style={styles.invoiceAmount}>
            {invoice.totalAmount != null
              ? `₺${Number(invoice.totalAmount).toLocaleString("tr-TR")}`
              : "—"}
          </Text>
          {invoice.pdfUrl && (
            <Pressable style={styles.pdfBtn} onPress={() => onOpenPdf(invoice)}>
              <Text style={styles.pdfBtnText}>PDF</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams();
  const [contract, setContract]   = useState(null);
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [c, inv] = await Promise.all([
        getContractById(id),
        listInvoices(id).catch(() => []),
      ]);
      setContract(c);
      setInvoices(Array.isArray(inv) ? inv : []);
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

  const openPdf = async (invoice) => {
    try {
      const { url } = await getInvoicePdfUrl(invoice.id);
      if (url) Linking.openURL(url);
    } catch {
      Alert.alert("Hata", "PDF açılamadı.");
    }
  };

  const handleReturn = () => {
    Alert.alert(
      "Araç İadesi",
      "Bu kontratta aracı iade almak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "İade Al",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await returnContract(id, {});
              await load();
            } catch (e) {
              Alert.alert("Hata", e?.response?.data?.message || "İade işlemi başarısız.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Kontrat İptali",
      "Bu kontratı iptal etmek istediğinize emin misiniz?",
      [
        { text: "Geri", style: "cancel" },
        {
          text: "İptal Et",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await cancelContract(id);
              await load();
            } catch (e) {
              Alert.alert("Hata", e?.response?.data?.message || "İptal işlemi başarısız.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReopen = () => {
    Alert.alert("Kontratı Yeniden Aç", "Bu kontratı aktif duruma getirmek istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Yeniden Aç",
        onPress: async () => {
          try {
            setActionLoading(true);
            await reopenContract(id);
            await load();
          } catch (e) {
            Alert.alert("Hata", e?.response?.data?.message || "İşlem başarısız.");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorBanner message="Kontrat yüklenemedi." onRetry={load} />;
  if (!contract) return <EmptyState icon="📋" title="Kontrat bulunamadı" />;

  const c = contract;
  const plate    = c.car?.licensePlate || "—";
  const carName  = [c.car?.brand, c.car?.model].filter(Boolean).join(" ");
  const customer = c.user?.name || "—";
  const isActive = c.status === "ACTIVE";
  const isDone   = c.status === "DONE";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Başlık */}
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroPlate}>{plate}</Text>
          <Text style={styles.herocar}>{carName}</Text>
          <Text style={styles.heroCustomer}>{customer}</Text>
        </View>
        <StatusBadge status={c.status} />
      </View>

      {/* Temel bilgiler */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Kontrat Bilgileri</Text>
        <InfoRow label="Kontrat No"   value={c.contractNo} mono />
        <InfoRow label="Kiralama Tipi" value={c.rentalType === "MONTHLY" ? "Aylık" : "Günlük"} />
        <InfoRow label="Teslim Tarihi" value={fmt(c.pickUpTime)} />
        <InfoRow label="İade Tarihi"   value={fmt(c.dropOffTime)} />
        {c.returnedAt && <InfoRow label="Fiili İade" value={fmt(c.returnedAt)} />}
        <InfoRow label="Teslim Yeri"  value={c.pickUpLocation} />
        <InfoRow label="İade Yeri"    value={c.dropOffLocation} />
        <InfoRow label="Uçuş No"      value={c.flightNo} />
      </SectionCard>

      {/* Fiyatlar */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Finansal Bilgiler</Text>
        <InfoRow label="Günlük Fiyat"   value={c.dailyPrice    != null ? `₺${Number(c.dailyPrice).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="Aylık Fiyat"    value={c.monthlyPrice  != null ? `₺${Number(c.monthlyPrice).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="Depozito"        value={c.deposit       != null ? `₺${Number(c.deposit).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="Hasar Muafiyeti" value={c.damageDeductible != null ? `₺${Number(c.damageDeductible).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="KDV Oranı"       value={c.vatRate       != null ? `%${c.vatRate}` : null} />
      </SectionCard>

      {/* Km Limiti */}
      {!c.unlimitedKm && (
        <SectionCard>
          <Text style={styles.sectionTitle}>Km Limiti</Text>
          <InfoRow label="Toplam Limit"  value={c.kmLimit       ? `${c.kmLimit} km` : null} />
          <InfoRow label="Günlük Limit"  value={c.dailyKmLimit  ? `${c.dailyKmLimit} km` : null} />
          <InfoRow label="Aylık Limit"   value={c.monthlyKmLimit? `${c.monthlyKmLimit} km` : null} />
          <InfoRow label="Km Aşım Ücreti" value={c.kmOverageFee  ? `₺${c.kmOverageFee}/km` : null} />
        </SectionCard>
      )}
      {c.unlimitedKm && (
        <SectionCard>
          <InfoRow label="Km Limiti" value="Sınırsız ✅" />
        </SectionCard>
      )}

      {/* Faturalar */}
      <SectionCard>
        <Text style={styles.sectionTitle}>
          Faturalar {invoices.length > 0 ? `(${invoices.length})` : ""}
        </Text>
        {invoices.length === 0 ? (
          <Text style={styles.noInvoice}>Henüz fatura kesilmemiş</Text>
        ) : (
          invoices.map((inv) => (
            <InvoiceCard key={inv.id} invoice={inv} onOpenPdf={openPdf} />
          ))
        )}
      </SectionCard>

      {/* Notlar */}
      {(c.customerNote || c.adminNote) && (
        <SectionCard>
          <Text style={styles.sectionTitle}>Notlar</Text>
          {c.customerNote && <InfoRow label="Müşteri Notu" value={c.customerNote} />}
          {c.adminNote    && <InfoRow label="Admin Notu"   value={c.adminNote} />}
        </SectionCard>
      )}

      {/* Aksiyonlar */}
      {!actionLoading && (
        <View style={styles.actions}>
          {isActive && (
            <Pressable style={[styles.actionBtn, styles.actionReturn]} onPress={handleReturn}>
              <Text style={styles.actionBtnText}>🔑  Araç İadesi Al</Text>
            </Pressable>
          )}
          {isActive && (
            <Pressable style={[styles.actionBtn, styles.actionCancel]} onPress={handleCancel}>
              <Text style={[styles.actionBtnText, { color: COLORS.red }]}>✕  İptal Et</Text>
            </Pressable>
          )}
          {isDone && (
            <Pressable style={[styles.actionBtn, styles.actionReopen]} onPress={handleReopen}>
              <Text style={[styles.actionBtnText, { color: COLORS.amber }]}>↺  Yeniden Aç</Text>
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
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },
  heroLeft:     { flex: 1 },
  heroPlate:    { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  herocar:      { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  heroCustomer: { fontSize: 15, color: COLORS.ink, fontWeight: "700", marginTop: 8 },

  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },

  infoRow:   { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  infoLabel: { fontSize: 13, color: COLORS.muted, flex: 1 },
  infoValue: { fontSize: 13, color: COLORS.ink, fontWeight: "600", flex: 1, textAlign: "right" },
  infoMono:  { fontVariant: ["tabular-nums"] },

  noInvoice: { color: COLORS.muted, fontSize: 13, fontStyle: "italic" },

  invoiceCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  invoiceTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  invoiceNo:     { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  invoiceDates:  { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  invoiceRight:  { alignItems: "flex-end", gap: 6 },
  invoiceAmount: { fontSize: 16, fontWeight: "800", color: COLORS.green },
  pdfBtn: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pdfBtnText: { color: COLORS.green, fontSize: 12, fontWeight: "700" },

  actions:       { gap: 10, marginTop: 8 },
  actionBtn:     {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
  },
  actionReturn:  { backgroundColor: COLORS.green, borderColor: COLORS.green },
  actionCancel:  { backgroundColor: COLORS.redSoft, borderColor: COLORS.red + "55" },
  actionReopen:  { backgroundColor: COLORS.amberSoft, borderColor: COLORS.amber + "55" },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
