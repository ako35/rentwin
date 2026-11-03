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
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  getContractById,
  listInvoices,
  getInvoicePdfUrl,
  returnContract,
  cancelContract,
  reopenContract,
  extendContract,
  deleteExtension,
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

function formatExtensionDuration(ext, isMonthly) {
  if (ext.months && ext.extraDays) {
    return `${ext.months} ay ${ext.extraDays} gün`;
  }
  if (ext.months) return `${ext.months} ay`;
  if (ext.extraDays) return `${ext.extraDays} gün`;

  const s = new Date(ext.previousDropOff);
  const e = new Date(ext.newDropOff);
  const diffDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  return `${diffDays} gün`;
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

  // Uzatma modal state
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extDate, setExtDate] = useState("");
  const [extTime, setExtTime] = useState("12:00");
  const [extAmount, setExtAmount] = useState("");
  const [extNote, setExtNote] = useState("");
  const [extSubmitting, setExtSubmitting] = useState(false);

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

  const openExtendModal = () => {
    if (contract?.dropOffTime) {
      const d = new Date(contract.dropOffTime);
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setExtDate(`${yyyy}-${mm}-${dd}`);
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      setExtTime(`${hh}:${min}`);
    } else {
      setExtDate("");
      setExtTime("12:00");
    }
    setExtAmount("");
    setExtNote("");
    setExtendModalVisible(true);
  };

  const submitExtension = async () => {
    if (!extDate.trim()) {
      Alert.alert("Uyarı", "Lütfen geçerli bir yeni bitiş tarihi girin (YYYY-AA-GG).");
      return;
    }
    setExtSubmitting(true);
    try {
      const formattedDateTime = `${extDate.trim()} ${extTime.trim() || "12:00"}`;
      await extendContract(id, {
        newDropOff: formattedDateTime,
        ...(extAmount.trim() ? { extraAmount: Number(extAmount.trim()) } : {}),
        note: extNote.trim() || undefined,
      });
      setExtendModalVisible(false);
      await load();
      Alert.alert("Başarılı", "Kontrat süresi başarıyla uzatıldı.");
    } catch (err) {
      Alert.alert("Hata", err?.response?.data?.message || "Uzatma işlemi yapılamadı.");
    } finally {
      setExtSubmitting(false);
    }
  };

  const handleDeleteExtension = (extId) => {
    Alert.alert(
      "Uzatmayı Sil",
      "Bu uzatma kaydını silmek istediğinize emin misiniz? Bırakış tarihi önceki tarihe geri dönecektir.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteExtension(id, extId);
              await load();
            } catch (err) {
              Alert.alert("Hata", err?.response?.data?.message || "Uzatma silinemedi.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
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
  const isMonthly = c.rentalType === "MONTHLY";
  const extensions = Array.isArray(c.extensions) ? c.extensions : [];

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
        <InfoRow label="Kiralama Tipi" value={isMonthly ? "Aylık" : "Günlük"} />
        <InfoRow label="Teslim Tarihi" value={fmt(c.pickUpTime)} />
        <InfoRow label="İade Tarihi"   value={fmt(c.dropOffTime)} />
        {c.returnedAt && <InfoRow label="Fiili İade" value={fmt(c.returnedAt)} />}
        <InfoRow label="Teslim Yeri"  value={c.pickUpLocation} />
        <InfoRow label="İade Yeri"    value={c.dropOffLocation} />
        <InfoRow label="Uçuş No"      value={c.flightNo} />
      </SectionCard>

      {/* Uzatma Geçmişi */}
      {extensions.length > 0 && (
        <SectionCard>
          <Text style={styles.sectionTitle}>Uzatma Geçmişi ({extensions.length})</Text>
          {extensions.map((ext) => (
            <View key={ext.id} style={styles.extRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.extDate}>{fmt(ext.newDropOff)}</Text>
                  <View style={styles.extDurationBadge}>
                    <Text style={styles.extDurationText}>
                      +{formatExtensionDuration(ext, isMonthly)}
                    </Text>
                  </View>
                </View>
                {ext.extraAmount != null && (
                  <Text style={styles.extAmount}>
                    Ek Tutar: ₺{Number(ext.extraAmount).toLocaleString("tr-TR")}
                  </Text>
                )}
                {ext.note ? <Text style={styles.extNote}>{ext.note}</Text> : null}
              </View>
              {isActive && (
                <Pressable
                  style={styles.extDelBtn}
                  onPress={() => handleDeleteExtension(ext.id)}
                >
                  <Text style={styles.extDelText}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}
        </SectionCard>
      )}

      {/* Fiyatlar */}
      <SectionCard>
        <Text style={styles.sectionTitle}>Finansal Bilgiler</Text>
        <InfoRow label="Günlük Fiyat"   value={c.dailyPrice    != null ? `₺${Number(c.dailyPrice).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="Aylık Fiyat"    value={c.monthlyPrice  != null ? `₺${Number(c.monthlyPrice).toLocaleString("tr-TR")}` : null} />
        <InfoRow label="Toplam Tutar"   value={c.totalPrice    != null ? `₺${Number(c.totalPrice).toLocaleString("tr-TR")}` : null} />
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
            <Pressable style={[styles.actionBtn, styles.actionExtend]} onPress={openExtendModal}>
              <Text style={styles.actionBtnText}>⏳  Süre Uzat</Text>
            </Pressable>
          )}
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

      {/* Uzatma Modalı */}
      <Modal visible={extendModalVisible} transparent animationType="slide" onRequestClose={() => setExtendModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setExtendModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kontrat Süresi Uzat</Text>
              <Pressable onPress={() => setExtendModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Yeni Bitiş Tarihi (YYYY-AA-GG) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Örn: 2026-11-20"
              placeholderTextColor={COLORS.subtle}
              value={extDate}
              onChangeText={setExtDate}
            />

            <Text style={styles.inputLabel}>Yeni Bitiş Saati (SS:DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Örn: 12:00"
              placeholderTextColor={COLORS.subtle}
              value={extTime}
              onChangeText={setExtTime}
            />

            <Text style={styles.inputLabel}>Ek Tutar (TL - Boş bırakılırsa otomatik hesaplanır)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Otomatik"
              placeholderTextColor={COLORS.subtle}
              keyboardType="numeric"
              value={extAmount}
              onChangeText={setExtAmount}
            />

            <Text style={styles.inputLabel}>Not (Opsiyonel)</Text>
            <TextInput
              style={[styles.modalInput, { height: 60, textAlignVertical: "top" }]}
              placeholder="Uzatma açıklaması..."
              placeholderTextColor={COLORS.subtle}
              multiline
              value={extNote}
              onChangeText={setExtNote}
            />

            <Pressable
              style={[styles.submitBtn, extSubmitting && { opacity: 0.7 }]}
              onPress={submitExtension}
              disabled={extSubmitting}
            >
              {extSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Uzatmayı Kaydet</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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

  extRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  extDate:          { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  extDurationBadge: { backgroundColor: COLORS.greenSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  extDurationText:  { color: COLORS.green, fontSize: 11, fontWeight: "700" },
  extAmount:        { fontSize: 12, color: COLORS.green, fontWeight: "700", marginTop: 3 },
  extNote:          { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  extDelBtn:        { padding: 8, backgroundColor: COLORS.redSoft, borderRadius: 8 },
  extDelText:       { color: COLORS.red, fontWeight: "800", fontSize: 12 },

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
  actionExtend:  { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  actionReturn:  { backgroundColor: COLORS.green, borderColor: COLORS.green },
  actionCancel:  { backgroundColor: COLORS.redSoft, borderColor: COLORS.red + "55" },
  actionReopen:  { backgroundColor: COLORS.amberSoft, borderColor: COLORS.amber + "55" },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingBottom: 12,
  },
  modalTitle:     { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  modalCloseText: { fontSize: 18, color: COLORS.muted, fontWeight: "800" },
  inputLabel:     { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 4, marginTop: 8 },
  modalInput: {
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
  },
  submitBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

