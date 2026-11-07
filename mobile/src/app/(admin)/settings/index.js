import { useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { getSettings, updateSettings } from "../../../api/admin";
import { LoadingScreen, ErrorBanner, SectionCard, Field, Button } from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { parseAmount, apiError } from "../../../utils/admin";

// Web admin/settings sayfasıyla aynı alanlar. PUT tüm alanları yazar —
// boş bırakılan alan null olur, bu yüzden form her zaman tamamını gönderir.
const CONTRACT_DEFAULTS = [
  { key: "defaultDailyKmLimit",     label: "Günlük km limiti",    suffix: "km", integer: true },
  { key: "defaultMonthlyKmLimit",   label: "Aylık km limiti",     suffix: "km", integer: true },
  { key: "defaultKmOverageFee",     label: "Km aşım bedeli",      suffix: "₺/km" },
  { key: "defaultFuelFeePerEighth", label: "Eksik yakıt bedeli",  suffix: "₺ / (1/8)" },
  { key: "defaultDeposit",          label: "Depozito",            suffix: "₺" },
];

const ALERT_WINDOWS = [
  { key: "alertWindowInspectionDays",         label: "Muayene / Egzoz",        suffix: "gün", integer: true, positive: true },
  { key: "inspectionAppointmentReminderDays", label: "Muayene randevu hatırlatması", suffix: "gün", integer: true, positive: true },
  { key: "alertWindowInsuranceDays",          label: "Trafik sigortası",       suffix: "gün", integer: true, positive: true },
  { key: "alertWindowKaskoDays",              label: "Kasko",                  suffix: "gün", integer: true, positive: true },
  { key: "alertWindowTaxDays",                label: "MTV",                    suffix: "gün", integer: true, positive: true },
  { key: "alertWindowMaintenanceKm",          label: "Bakım",                  suffix: "km",  integer: true, positive: true },
];

const ALL_FIELDS = [...CONTRACT_DEFAULTS, ...ALERT_WINDOWS];

const toForm = (s) =>
  Object.fromEntries(ALL_FIELDS.map((f) => [f.key, s?.[f.key] == null ? "" : String(s[f.key])]));

const fieldError = (field, text) => {
  const n = parseAmount(text);
  if (n == null) return null;
  if (Number.isNaN(n) || n < 0) return "Geçerli bir sayı girin.";
  if (field.integer && !Number.isInteger(n)) return "Tam sayı girin.";
  if (field.positive && n < 1) return "En az 1 olmalı.";
  return null;
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(toForm(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      setForm(toForm(s));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const errors = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, fieldError(f, form[f.key])]));
  const invalid = Object.values(errors).some(Boolean);
  const dirty = settings && ALL_FIELDS.some((f) => (parseAmount(form[f.key]) ?? null) !== (settings[f.key] ?? null));

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      const payload = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, parseAmount(form[f.key])]));
      const saved = await updateSettings(payload);
      setSettings(saved);
      setForm(toForm(saved));
      Alert.alert("Kaydedildi", "Ayarlar güncellendi.");
    } catch (err) {
      Alert.alert("Hata", apiError(err, "Ayarlar kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (error && !settings) return <ErrorBanner message="Ayarlar yüklenemedi." onRetry={load} />;

  const renderField = (f) => (
    <View key={f.key} style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{f.label}</Text>
      <Field
        style={styles.fieldBox}
        value={form[f.key]}
        onChangeText={(t) => setForm((prev) => ({ ...prev, [f.key]: t }))}
        keyboardType={f.integer ? "number-pad" : "decimal-pad"}
        placeholder="—"
        error={errors[f.key]}
      />
      <Text style={styles.suffix}>{f.suffix}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionCard title="Sözleşme Varsayılanları">
          <Text style={styles.hint}>
            Yeni kontrat açılırken bu değerler otomatik gelir; her kontratta ayrıca değiştirilebilir. Boş alan yeni kontrata boş yansır.
          </Text>
          {CONTRACT_DEFAULTS.map(renderField)}
        </SectionCard>

        <SectionCard title="Uyarı Süreleri">
          <Text style={styles.hint}>
            Dashboard uyarıları bu sürelere göre çıkar. Boş bırakılırsa randevu hatırlatması 7 gün, diğer gün alanları 15 gün, bakım 1000 km kullanılır.
          </Text>
          {ALERT_WINDOWS.map(renderField)}
        </SectionCard>

        <Button title="Ayarları Kaydet" onPress={save} loading={saving} disabled={!dirty || invalid} />
        <Text style={styles.footHint}>KABİS sistemleri ve görünüm ayarları web panelinden yönetilir.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.canvas },
  content:    { padding: 16, paddingBottom: 48 },
  hint:       { fontSize: 12, color: COLORS.muted, lineHeight: 17, marginBottom: 12 },
  fieldRow:   { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  fieldLabel: { flex: 1, fontSize: 13, color: COLORS.ink, fontWeight: "600", paddingTop: 11 },
  fieldBox:   { width: 110 },
  suffix:     { width: 64, fontSize: 12, color: COLORS.muted, paddingTop: 12 },
  footHint:   { fontSize: 11, color: COLORS.subtle, textAlign: "center", marginTop: 12 },
});
