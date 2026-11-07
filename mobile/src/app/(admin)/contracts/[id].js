import { useState, useCallback, useMemo } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Alert, RefreshControl, Linking, Switch } from "react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import {
  getContractById,
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
  InfoRow,
  Field,
  Button,
  Sheet,
} from "../../../components/admin";
import FuelGauge from "../../../components/FuelGauge";
import { COLORS } from "../../../constants/theme";
import { fuelLabel, formatKm } from "../../../utils/format";
import {
  customerName,
  wallDate,
  wallDateTime,
  wallTimeInput,
  nowDateInput,
  nowTimeInput,
  parseDateInput,
  parseTimeInput,
  toBackendDateTime,
  wallMs,
  isoDay,
  money,
  parseAmount,
  returnOverage,
  apiError,
} from "../../../utils/admin";

const LESSOR_LABEL = { SAIR: "Şair Turizm", MOVILO: "Movilo Ulaşım" };

function extensionDuration(ext) {
  if (ext.months && ext.extraDays) return `${ext.months} ay ${ext.extraDays} gün`;
  if (ext.months) return `${ext.months} ay`;
  return `${ext.extraDays || 0} gün`;
}

function CheckRow({ label, done, doneText, pendingText }) {
  return (
    <View style={styles.checkRow}>
      <Text style={styles.checkLabel}>{label}</Text>
      <View style={[styles.checkPill, { backgroundColor: done ? COLORS.greenSoft : COLORS.amberSoft }]}>
        <Text style={[styles.checkText, { color: done ? COLORS.green : COLORS.amber }]}>
          {done ? `✓ ${doneText}` : pendingText}
        </Text>
      </View>
    </View>
  );
}

function InvoiceCard({ invoice, onOpenPdf }) {
  const hasPdf = !!(invoice.pdfPathname || invoice.pdfUrl);
  return (
    <View style={styles.invoiceCard}>
      <View style={styles.invoiceTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.invoiceNo}>{invoice.number || "Fatura"}</Text>
          <Text style={styles.invoiceDates}>
            {invoice.periodFrom ? `${wallDate(invoice.periodFrom)} – ${wallDate(invoice.periodTo)}` : wallDate(invoice.issuedAt)}
          </Text>
        </View>
        <View style={styles.invoiceRight}>
          <Text style={styles.invoiceAmount}>{money(invoice.grossAmount)}</Text>
          {hasPdf && (
            <Pressable style={styles.pdfBtn} onPress={() => onOpenPdf(invoice)} hitSlop={6}>
              <Text style={styles.pdfBtnText}>PDF</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── İade (Araç Teslim Al) ───────────────────────────────────────────────────
// Web VehicleReturnModal ile aynı kurallar: km + yakıt zorunlu, km alıştan
// küçük olamaz, km aşımı ve eksik yakıt kontrat ücretlerinden önerilir (düzenlenebilir).
// Panel yalnızca açıkken bağlanır — her açılış temiz durumla başlar.
function ReturnSheet({ contract, onClose, onDone }) {
  const [date, setDate] = useState(nowDateInput);
  const [time, setTime] = useState(nowTimeInput);
  const [km, setKm] = useState(contract.returnKm != null ? String(contract.returnKm) : "");
  const [fuel, setFuel] = useState(contract.returnFuelEighths ?? null);
  const [kmAmount, setKmAmount] = useState(null);
  const [fuelAmount, setFuelAmount] = useState(null);
  const [kmIncluded, setKmIncluded] = useState(true);
  const [fuelIncluded, setFuelIncluded] = useState(true);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const kmNum = km.trim() === "" ? "" : Number(km.replace(/\D/g, ""));
  const overage = useMemo(() => returnOverage(contract, kmNum, fuel), [contract, kmNum, fuel]);
  const kmLimited = Number.isFinite(overage.allowedKm);
  // Kullanıcı yazana kadar öneri tutarı gösterilir.
  const kmValue = kmAmount ?? (overage.kmCharge ? String(overage.kmCharge) : "");
  const fuelValue = fuelAmount ?? (overage.fuelCharge ? String(overage.fuelCharge) : "");

  const parsedDate = parseDateInput(date);
  const parsedTime = parseTimeInput(time);
  const pickUpKm = Number(contract.pickUpKm) || 0;
  const errors = {
    date: !parsedDate || !parsedTime
      ? "Geçerli tarih (GG.AA.YYYY) ve saat (SS:DD) girin."
      : wallMs(parsedDate, parsedTime) < Date.parse(contract.pickUpTime)
        ? "Teslim tarihi alış tarihinden önce olamaz."
        : null,
    km: kmNum === ""
      ? "Dönüş km zorunlu."
      : kmNum < pickUpKm
        ? `Dönüş km alış km'sinden (${formatKm(pickUpKm)}) küçük olamaz.`
        : null,
    fuel: fuel == null ? "Yakıt seviyesi seçin." : null,
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = async () => {
    setAttempted(true);
    if (invalid) return;

    const kmCharge = parseAmount(kmValue);
    const fuelCharge = parseAmount(fuelValue);
    if (Number.isNaN(kmCharge) || Number.isNaN(fuelCharge)) {
      Alert.alert("Uyarı", "Ücret tutarlarını kontrol edin.");
      return;
    }

    const send = async () => {
      setSaving(true);
      const charges = [];
      if (kmIncluded && kmCharge > 0) {
        charges.push({
          category: "KM_EXCESS",
          description: `${overage.excessKm} km aşım × ${Number(contract.kmOverageFee) || 0} ₺`,
          amount: kmCharge,
          quantity: 1,
        });
      }
      if (fuelIncluded && fuelCharge > 0) {
        charges.push({
          category: "FUEL",
          description: `${overage.missingEighths}/8 eksik yakıt`,
          amount: fuelCharge,
          quantity: 1,
        });
      }
      try {
        await returnContract(contract.id, {
          returnKm: kmNum,
          returnFuelEighths: fuel,
          returnedAt: toBackendDateTime(parsedDate, parsedTime),
          charges,
        });
        onDone();
      } catch (err) {
        Alert.alert("Hata", apiError(err, "Teslim alma işlemi başarısız."));
      } finally {
        setSaving(false);
      }
    };

    // Erken iade: bırakış tarihi teslim anına çekilir ve kiralama yeniden fiyatlanır.
    const returnDay = `${parsedDate.y}-${String(parsedDate.m).padStart(2, "0")}-${String(parsedDate.d).padStart(2, "0")}`;
    if (returnDay < isoDay(contract.dropOffTime)) {
      Alert.alert(
        "Erken İade",
        `Araç planlanan bırakış tarihinden (${wallDate(contract.dropOffTime)}) önce teslim alınıyor. Bırakış tarihi ${date} ${time} olarak güncellenecek ve kiralama kullanılan günlere göre yeniden hesaplanacak. Devam edilsin mi?`,
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Devam", onPress: send },
        ]
      );
      return;
    }
    send();
  };

  return (
    <Sheet visible title="Araç Teslim Al" onClose={onClose}>
      <View style={styles.row2}>
        <Field
          style={{ flex: 1.4 }}
          label="Teslim tarihi"
          value={date}
          onChangeText={setDate}
          placeholder="GG.AA.YYYY"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          style={{ flex: 1 }}
          label="Saat"
          value={time}
          onChangeText={setTime}
          placeholder="SS:DD"
          keyboardType="numbers-and-punctuation"
        />
      </View>
      {attempted && errors.date ? <Text style={styles.formError}>{errors.date}</Text> : null}

      <Field
        label="Dönüş km *"
        value={km}
        onChangeText={(t) => setKm(t.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        placeholder="Örn. 45210"
        hint={`Alış: ${formatKm(contract.pickUpKm)}`}
        error={attempted ? errors.km : null}
      />

      <Text style={styles.fieldLabel}>Dönüş yakıt seviyesi *</Text>
      <FuelGauge value={fuel} onChange={setFuel} />
      <Text style={styles.fieldHint}>Alış: {fuelLabel(contract.pickUpFuelEighths)}</Text>
      {attempted && errors.fuel ? <Text style={styles.formError}>{errors.fuel}</Text> : null}

      <View style={styles.overageBox}>
        <Text style={styles.overageTitle}>Km aşımı</Text>
        {kmLimited ? (
          <Text style={styles.overageText}>
            Kullanılan {formatKm(overage.usedKm)} · İzin {formatKm(Math.round(overage.allowedKm))} ·{" "}
            <Text style={overage.excessKm > 0 && styles.overageOver}>Aşım {formatKm(overage.excessKm)}</Text>
          </Text>
        ) : (
          <Text style={styles.overageText}>Sınırsız km — aşım ücreti yok.</Text>
        )}
        {kmLimited && overage.excessKm > 0 && (
          <View style={styles.chargeRow}>
            <Field
              style={{ flex: 1, marginBottom: 0 }}
              label="Km aşım ücreti (₺)"
              value={kmValue}
              onChangeText={setKmAmount}
              keyboardType="decimal-pad"
            />
            <View style={styles.switchBox}>
              <Text style={styles.switchLabel}>Ekle</Text>
              <Switch value={kmIncluded} onValueChange={setKmIncluded} trackColor={{ true: COLORS.green }} />
            </View>
          </View>
        )}

        <Text style={[styles.overageTitle, { marginTop: 12 }]}>Yakıt</Text>
        <Text style={styles.overageText}>
          {fuel == null ? "Yakıt seviyesi seçilmedi." : (
            <Text style={overage.missingEighths > 0 && styles.overageOver}>Eksik {overage.missingEighths}/8</Text>
          )}
        </Text>
        {overage.missingEighths > 0 && (
          <View style={styles.chargeRow}>
            <Field
              style={{ flex: 1, marginBottom: 0 }}
              label="Eksik yakıt ücreti (₺)"
              value={fuelValue}
              onChangeText={setFuelAmount}
              keyboardType="decimal-pad"
            />
            <View style={styles.switchBox}>
              <Text style={styles.switchLabel}>Ekle</Text>
              <Switch value={fuelIncluded} onValueChange={setFuelIncluded} trackColor={{ true: COLORS.green }} />
            </View>
          </View>
        )}
      </View>

      <Button title="Teslim Al ve Kontratı Kapat" onPress={submit} loading={saving} style={{ marginTop: 16 }} />
    </Sheet>
  );
}

// ─── Süre Uzatma ─────────────────────────────────────────────────────────────
function ExtendSheet({ contract, onClose, onDone }) {
  // Varsayılan: mevcut bırakışın ertesi günü, aynı saat.
  const [date, setDate] = useState(() =>
    wallDate(new Date(Date.parse(contract.dropOffTime) + 86400000).toISOString())
  );
  const [time, setTime] = useState(() => wallTimeInput(contract.dropOffTime) || "12:00");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const isMonthly = contract.rentalType === "MONTHLY";
  const parsedDate = parseDateInput(date);
  const parsedTime = parseTimeInput(time);
  const amountNum = parseAmount(amount);
  const dateError = !parsedDate || !parsedTime
    ? "Geçerli tarih (GG.AA.YYYY) ve saat (SS:DD) girin."
    : wallMs(parsedDate, parsedTime) <= Date.parse(contract.dropOffTime)
      ? `Yeni bırakış, mevcut bırakıştan (${wallDateTime(contract.dropOffTime)}) sonra olmalı.`
      : null;
  const amountError = Number.isNaN(amountNum) || (amountNum != null && amountNum < 0) ? "Geçerli bir tutar girin." : null;

  const submit = async () => {
    setAttempted(true);
    if (dateError || amountError) return;
    setSaving(true);
    try {
      await extendContract(contract.id, {
        newDropOff: toBackendDateTime(parsedDate, parsedTime),
        ...(amountNum != null ? { extraAmount: amountNum } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onDone();
    } catch (err) {
      Alert.alert("Hata", apiError(err, "Uzatma işlemi yapılamadı."));
    } finally {
      setSaving(false);
    }
  };

  const autoHint = isMonthly
    ? `Boş bırakılırsa aylık fiyattan (${money(contract.monthlyPrice)}) hesaplanır. Tutar KDV hariç girilir, KDV (%${contract.vatRate ?? 20}) eklenir.`
    : `Boş bırakılırsa günlük fiyattan (${money(contract.dailyPrice)}) hesaplanır.`;

  return (
    <Sheet visible title="Süre Uzat" onClose={onClose}>
      <InfoRow label="Mevcut bırakış" value={wallDateTime(contract.dropOffTime)} />
      <View style={[styles.row2, { marginTop: 12 }]}>
        <Field
          style={{ flex: 1.4 }}
          label="Yeni bırakış tarihi *"
          value={date}
          onChangeText={setDate}
          placeholder="GG.AA.YYYY"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          style={{ flex: 1 }}
          label="Saat"
          value={time}
          onChangeText={setTime}
          placeholder="SS:DD"
          keyboardType="numbers-and-punctuation"
        />
      </View>
      {attempted && dateError ? <Text style={styles.formError}>{dateError}</Text> : null}
      <Field
        label="Ek tutar (₺)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Otomatik"
        hint={autoHint}
        error={attempted ? amountError : null}
      />
      <Field label="Not" value={note} onChangeText={setNote} multiline placeholder="Uzatma açıklaması…" />
      <Button title="Uzatmayı Kaydet" onPress={submit} loading={saving} style={{ marginTop: 6 }} />
    </Sheet>
  );
}

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null); // "return" | "extend" | null

  const load = useCallback(async () => {
    try {
      const c = await getContractById(id);
      setContract(c);
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

  // İmzalı PDF bağlantıları kısa ömürlü — her açılışta tazesi istenir.
  const openPdf = async (invoice) => {
    try {
      const { url } = await getInvoicePdfUrl(invoice.id);
      if (url) await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Hata", apiError(err, "PDF açılamadı."));
    }
  };

  const runAction = (title, message, confirmText, action, destructive) => {
    Alert.alert(title, message, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: confirmText,
        style: destructive ? "destructive" : "default",
        onPress: async () => {
          setBusy(true);
          try {
            await action();
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

  const onSheetDone = async (message) => {
    setSheet(null);
    await load();
    Alert.alert("Başarılı", message);
  };

  // Sekme ekranları bağlı kalır: başka bir kontrata geçilince eskisi gösterilmesin.
  const stale = contract && contract.id !== id;
  if (error && (!contract || stale)) return <ErrorBanner message="Kontrat yüklenemedi." onRetry={load} />;
  if (loading || stale) return <LoadingScreen />;
  if (!contract) return <EmptyState icon="📋" title="Kontrat bulunamadı" />;

  const c = contract;
  const isOpen = c.status === "CREATED";
  const isMonthly = c.rentalType === "MONTHLY";
  const extensions = Array.isArray(c.extensions) ? c.extensions : [];
  const invoices = Array.isArray(c.invoices) ? c.invoices : [];
  const drivers = Array.isArray(c.drivers) ? c.drivers : [];
  const balance = (c.totalPrice || 0) - (c.collected || 0);
  const kmLimitText = c.unlimitedKm
    ? "Sınırsız"
    : isMonthly
      ? (c.monthlyKmLimit ? `${formatKm(c.monthlyKmLimit)} / ay` : "—")
      : (c.dailyKmLimit ? `${formatKm(c.dailyKmLimit)} / gün` : "—");

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        showsVerticalScrollIndicator={false}
      >
        {error && <ErrorBanner message="Güncel veri alınamadı." onRetry={load} />}

        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Pressable onPress={() => c.carId && router.push(`/(admin)/vehicles/${c.carId}`)}>
              <Text style={styles.heroPlate}>{c.car?.licensePlate || "—"} ›</Text>
            </Pressable>
            <Text style={styles.heroCar}>{[c.car?.brand, c.car?.model].filter(Boolean).join(" ")}</Text>
            <Pressable onPress={() => c.userId && router.push(`/(admin)/users/${c.userId}`)}>
              <Text style={styles.heroCustomer}>{customerName(c)} ›</Text>
            </Pressable>
            {c.customer?.phoneNumber ? (
              <Pressable onPress={() => Linking.openURL(`tel:${c.customer.phoneNumber}`)}>
                <Text style={styles.heroPhone}>📞 {c.customer.phoneNumber}</Text>
              </Pressable>
            ) : null}
          </View>
          <StatusBadge status={c.status} />
        </View>

        <SectionCard title="Kontrat Bilgileri">
          <InfoRow label="Kontrat No" value={c.contractNo} mono />
          <InfoRow label="Kiralama Tipi" value={isMonthly ? "Aylık" : "Günlük"} />
          <InfoRow label="Alış" value={wallDateTime(c.pickUpTime)} />
          <InfoRow label="Bırakış" value={wallDateTime(c.dropOffTime)} />
          {c.returnedAt ? <InfoRow label="Teslim Alındı" value={wallDateTime(c.returnedAt)} /> : null}
          <InfoRow label="Alış Yeri" value={c.pickUpLocation} />
          <InfoRow label="Bırakış Yeri" value={c.dropOffLocation} />
          <InfoRow label="Uçuş No" value={c.flightNo} />
          <InfoRow label="Referans No" value={c.referenceNo} />
          <InfoRow label="Kiralayan Firma" value={LESSOR_LABEL[c.lessorCompany] || c.lessorCompany} />
          {c.referenceUser ? <InfoRow label="Referans Müşteri" value={customerName({ customer: c.referenceUser })} /> : null}
        </SectionCard>

        {c.status !== "CANCELLED" && (
          <SectionCard title="Kontroller">
            <CheckRow label="İmza" done={!!c.signedAt} doneText={wallDate(c.signedAt)} pendingText="İmza bekliyor" />
            <CheckRow
              label="KABİS"
              done={!!c.kbsNotifiedAt}
              doneText={c.kbsReleasedAt ? "Bildirildi · çıkış yapıldı" : "Bildirildi"}
              pendingText="Bildirilmedi"
            />
            {c.kbsNotifiedAt && !c.kbsReleasedAt && c.status === "DONE" ? (
              <CheckRow label="KABİS çıkışı" done={false} pendingText="Çıkış bekliyor" />
            ) : null}
            <CheckRow label="HGS/OGS" done={c.hgsStatus === "CHECKED"} doneText="Kontrol edildi" pendingText="Kontrol bekliyor" />
            <Text style={styles.checkNote}>Bu kayıtlar web panelinden güncellenir.</Text>
          </SectionCard>
        )}

        <SectionCard title="Km & Yakıt">
          <InfoRow label="Alış km" value={formatKm(c.pickUpKm)} />
          <InfoRow label="Alış yakıt" value={fuelLabel(c.pickUpFuelEighths)} />
          <InfoRow label="Dönüş km" value={c.returnKm != null ? formatKm(c.returnKm) : null} />
          <InfoRow label="Dönüş yakıt" value={c.returnFuelEighths != null ? fuelLabel(c.returnFuelEighths) : null} />
          <InfoRow label="Km limiti" value={kmLimitText} />
          {!c.unlimitedKm ? <InfoRow label="Km aşım ücreti" value={c.kmOverageFee ? `${money(c.kmOverageFee)} / km` : null} /> : null}
          <InfoRow label="Eksik yakıt ücreti" value={c.fuelFeePerEighth ? `${money(c.fuelFeePerEighth)} / (1/8)` : null} />
        </SectionCard>

        <SectionCard title="Finans">
          <InfoRow label={isMonthly ? "Aylık fiyat" : "Günlük fiyat"} value={money(isMonthly ? c.monthlyPrice : c.dailyPrice)} />
          <InfoRow label="Ekstralar" value={c.extrasTotal ? money(c.extrasTotal) : null} />
          <InfoRow label="Tek yön ücreti" value={c.oneWayFee ? money(c.oneWayFee) : null} />
          <InfoRow label="İndirim" value={c.discount ? (c.discountIsPercent ? `%${c.discount}` : money(c.discount)) : null} />
          <InfoRow label="Dönüş ekstraları" value={c.returnExtraAmount ? money(c.returnExtraAmount) : null} />
          <InfoRow label="Toplam" value={money(c.totalPrice)} />
          <InfoRow label="Tahsil edilen" value={money(c.collected || 0)} color={COLORS.green} />
          {c.status !== "CANCELLED" ? (
            <InfoRow
              label="Kalan bakiye"
              value={money(Math.max(0, balance))}
              color={balance > 0.009 ? COLORS.red : COLORS.green}
            />
          ) : null}
          <InfoRow label="Depozito" value={c.deposit ? money(c.deposit) : null} />
          <InfoRow label="Kasko muafiyeti" value={c.damageDeductible ? money(c.damageDeductible) : null} />
          <InfoRow label="KDV" value={c.vatRate != null ? `%${c.vatRate}` : null} />
          {c.customer ? (
            <InfoRow
              label="Müşteri cari bakiyesi"
              value={money(c.customer.balance)}
              color={c.customer.balance < -0.009 ? COLORS.red : COLORS.ink}
            />
          ) : null}
        </SectionCard>

        {extensions.length > 0 && (
          <SectionCard title={`Uzatmalar (${extensions.length})`}>
            {extensions.map((ext) => (
              <View key={ext.id} style={styles.extRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.extTop}>
                    <Text style={styles.extDate}>{wallDateTime(ext.newDropOff)}</Text>
                    <View style={styles.extBadge}>
                      <Text style={styles.extBadgeText}>+{extensionDuration(ext)}</Text>
                    </View>
                  </View>
                  <Text style={styles.extAmount}>{money(ext.extraAmount)}</Text>
                  {ext.note ? <Text style={styles.extNote}>{ext.note}</Text> : null}
                </View>
                {isOpen && (
                  <Pressable
                    style={styles.extDelBtn}
                    hitSlop={6}
                    onPress={() =>
                      runAction(
                        "Uzatmayı Sil",
                        `Bırakış tarihi ${wallDateTime(ext.previousDropOff)} olarak geri alınacak ve ${money(ext.extraAmount)} toplamdan düşülecek.`,
                        "Sil",
                        () => deleteExtension(c.id, ext.id),
                        true
                      )
                    }
                  >
                    <Text style={styles.extDelText}>✕</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </SectionCard>
        )}

        <SectionCard title={`Faturalar${invoices.length ? ` (${invoices.length})` : ""}`}>
          {invoices.length === 0 ? (
            <Text style={styles.muted}>Henüz fatura kesilmemiş.</Text>
          ) : (
            invoices.map((inv) => <InvoiceCard key={inv.id} invoice={inv} onOpenPdf={openPdf} />)
          )}
        </SectionCard>

        {drivers.length > 0 && (
          <SectionCard title="Ek Sürücüler">
            {drivers.map((d) => (
              <InfoRow
                key={d.id}
                label={`${d.firstName || ""} ${d.lastName || ""}`.trim() || "Sürücü"}
                value={d.phone || (d.licenseDate ? `Ehliyet ${wallDate(d.licenseDate)}` : "Kayıtlı")}
              />
            ))}
          </SectionCard>
        )}

        {(c.customerNote || c.adminNote) && (
          <SectionCard title="Notlar">
            {c.customerNote ? <Text style={styles.noteText}>Müşteri: {c.customerNote}</Text> : null}
            {c.adminNote ? (
              <Text style={styles.noteText}>
                Yönetici{c.adminNoteBy ? ` (${c.adminNoteBy})` : ""}: {c.adminNote}
              </Text>
            ) : null}
          </SectionCard>
        )}

        <View style={styles.actions}>
          {isOpen && (
            <>
              <Button title="🔑  Araç Teslim Al" onPress={() => setSheet("return")} disabled={busy} />
              <Button title="⏳  Süre Uzat" variant="blue" onPress={() => setSheet("extend")} disabled={busy} />
              <Button
                title="✕  Kontratı İptal Et"
                variant="danger"
                disabled={busy}
                onPress={() =>
                  runAction(
                    "Kontrat İptali",
                    "Kontrat iptal edilecek, araç boşa çıkacak ve kontratın cari kayıtları silinecek.",
                    "İptal Et",
                    () => cancelContract(c.id),
                    true
                  )
                }
              />
            </>
          )}
          {!isOpen && (
            <Button
              title="↺  Kontratı Geri Aç"
              variant="amber"
              loading={busy}
              onPress={() =>
                runAction(
                  "Kontratı Geri Aç",
                  c.status === "DONE"
                    ? "Kontrat yeniden açılacak; iadede eklenen km/yakıt aşım ücretleri silinip dönüş km/yakıt bilgisi temizlenecek."
                    : "İptal edilen kontrat yeniden aktif duruma getirilecek.",
                  "Geri Aç",
                  () => reopenContract(c.id)
                )
              }
            />
          )}
        </View>
      </ScrollView>

      {sheet === "return" && (
        <ReturnSheet
          contract={c}
          onClose={() => setSheet(null)}
          onDone={() => onSheetDone("Araç teslim alındı, kontrat kapatıldı.")}
        />
      )}
      {sheet === "extend" && (
        <ExtendSheet
          contract={c}
          onClose={() => setSheet(null)}
          onDone={() => onSheetDone("Kontrat süresi uzatıldı.")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 16, paddingBottom: 40 },

  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    gap: 10,
  },
  heroLeft:     { flex: 1 },
  heroPlate:    { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  heroCar:      { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  heroCustomer: { fontSize: 15, color: COLORS.green, fontWeight: "700", marginTop: 8 },
  heroPhone:    { fontSize: 13, color: COLORS.ink, marginTop: 6 },

  checkRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  checkLabel: { fontSize: 13, color: COLORS.muted },
  checkPill:  { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  checkText:  { fontSize: 12, fontWeight: "700" },
  checkNote:  { fontSize: 11, color: COLORS.subtle, marginTop: 6 },

  muted:    { color: COLORS.muted, fontSize: 13, fontStyle: "italic" },
  noteText: { color: COLORS.ink, fontSize: 13, lineHeight: 19, marginBottom: 6 },

  extRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    gap: 10,
  },
  extTop:       { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  extDate:      { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  extBadge:     { backgroundColor: COLORS.greenSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  extBadgeText: { color: COLORS.green, fontSize: 11, fontWeight: "700" },
  extAmount:    { fontSize: 12, color: COLORS.green, fontWeight: "700", marginTop: 3 },
  extNote:      { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  extDelBtn:    { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: COLORS.redSoft, borderRadius: 8 },
  extDelText:   { color: COLORS.red, fontWeight: "800", fontSize: 12 },

  invoiceCard:   { borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, marginBottom: 8 },
  invoiceTop:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  invoiceNo:     { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  invoiceDates:  { fontSize: 11, color: COLORS.muted, marginTop: 3 },
  invoiceRight:  { alignItems: "flex-end", gap: 6 },
  invoiceAmount: { fontSize: 16, fontWeight: "800", color: COLORS.green },
  pdfBtn:        { backgroundColor: COLORS.greenSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  pdfBtnText:    { color: COLORS.green, fontSize: 12, fontWeight: "700" },

  actions: { gap: 10, marginTop: 8 },

  row2:        { flexDirection: "row", gap: 10 },
  formError:   { fontSize: 11, color: COLORS.red, marginTop: -6, marginBottom: 10 },
  fieldLabel:  { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 8 },
  fieldHint:   { fontSize: 11, color: COLORS.subtle, marginTop: 4, marginBottom: 6 },

  overageBox:   { backgroundColor: COLORS.canvas, borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: COLORS.line },
  overageTitle: { fontSize: 12, fontWeight: "800", color: COLORS.ink, textTransform: "uppercase", letterSpacing: 0.4 },
  overageText:  { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  overageOver:  { color: COLORS.red, fontWeight: "700" },
  chargeRow:    { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 10 },
  switchBox:    { alignItems: "center", paddingBottom: 4 },
  switchLabel:  { fontSize: 11, color: COLORS.muted, fontWeight: "700", marginBottom: 2 },
});
