import { useState, useCallback, useLayoutEffect } from "react";
import { ScrollView, View, Text, StyleSheet, Switch, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect, useNavigation, router } from "expo-router";
import { getVehicleById, addVehicle, updateVehicle } from "../../api/admin";
import { useBranch } from "../../context/BranchContext";
import { LoadingScreen, ErrorBanner, SectionCard, Field, Chips, Button } from "./index";
import FuelGauge from "../FuelGauge";
import { COLORS } from "../../constants/theme";
import { TRANSMISSION_LABEL, FUEL_TYPE_LABEL } from "../../constants/labels";
import { BODY_TYPE_LABEL, dayDate, parseDateInput, toIsoDay, apiError } from "../../utils/admin";

const toOptions = (labels) => Object.entries(labels).map(([key, label]) => ({ key, label }));
const TRANSMISSIONS = toOptions(TRANSMISSION_LABEL);
const FUELS = toOptions(FUEL_TYPE_LABEL);
const BODY_TYPES = toOptions(BODY_TYPE_LABEL);

// Web adminNewVehicleFormInitialValues ile aynı varsayılanlar.
const EMPTY = {
  brand: "",
  model: "",
  licensePlate: "",
  transmission: "Manual",
  fuelType: "Diesel",
  bodyType: "BINEK",
  outOfService: false,
  branchId: "",
  modelYear: "",
  color: "",
  currentKm: "",
  currentFuelEighths: null,
  maintenanceIntervalKm: "",
  chassisNo: "",
  engineNo: "",
  registrationSerialNo: "",
  registrationDate: "",
  notes: "",
};

const str = (v) => (v === null || v === undefined ? "" : String(v));

const fromVehicle = (v) => ({
  brand: str(v.brand),
  model: str(v.model),
  licensePlate: str(v.licensePlate),
  transmission: v.transmission || EMPTY.transmission,
  fuelType: v.fuelType || EMPTY.fuelType,
  bodyType: v.bodyType || EMPTY.bodyType,
  outOfService: !!v.outOfService,
  branchId: str(v.branchId),
  modelYear: str(v.modelYear),
  color: str(v.color),
  currentKm: str(v.currentKm),
  currentFuelEighths: v.currentFuelEighths ?? null,
  maintenanceIntervalKm: str(v.maintenanceIntervalKm),
  chassisNo: str(v.chassisNo),
  engineNo: str(v.engineNo),
  registrationSerialNo: str(v.registrationSerialNo),
  registrationDate: v.registrationDate ? dayDate(v.registrationDate) : "",
  notes: str(v.notes),
});

const digits = (t) => t.replace(/\D/g, "");

// Rotalar: (admin)/vehicles/new ve (admin)/vehicles/edit/[id].
export default function VehicleForm({ id }) {
  const isEdit = !!id;
  const navigation = useNavigation();
  const { branches } = useBranch();
  const [form, setForm] = useState(EMPTY);
  const [loadedFor, setLoadedFor] = useState(isEdit ? null : "new");
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? "Aracı Düzenle" : "Yeni Araç" });
  }, [navigation, isEdit]);

  // Sekme ekranları bağlı kalır; her odaklanmada form açılan araca (ya da
  // boş forma) göre yeniden kurulur, önceki girişten veri taşınmaz.
  const load = useCallback(async () => {
    setAttempted(false);
    if (!isEdit) {
      setForm(EMPTY);
      setLoadedFor("new");
      return;
    }
    setLoadedFor(null);
    try {
      const v = await getVehicleById(id);
      setForm(fromVehicle(v));
      setLoadedFor(id);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [id, isEdit]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const regDate = form.registrationDate.trim() ? parseDateInput(form.registrationDate) : null;
  const year = form.modelYear ? Number(form.modelYear) : null;
  const errors = {
    brand: form.brand.trim() ? null : "Marka zorunlu.",
    model: form.model.trim() ? null : "Model zorunlu.",
    licensePlate: form.licensePlate.trim() ? null : "Plaka zorunlu.",
    modelYear: year != null && (year < 1950 || year > new Date().getFullYear() + 1) ? "Geçerli bir yıl girin." : null,
    registrationDate: form.registrationDate.trim() && !regDate ? "Tarih GG.AA.YYYY biçiminde olmalı." : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const err = (key) => (attempted ? errors[key] : null);

  const save = async () => {
    setAttempted(true);
    if (invalid) {
      Alert.alert("Eksik bilgi", "Lütfen işaretli alanları kontrol edin.");
      return;
    }
    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      licensePlate: form.licensePlate.trim().replace(/\s+/g, " ").toUpperCase(),
      transmission: form.transmission,
      fuelType: form.fuelType,
      bodyType: form.bodyType,
      outOfService: form.outOfService,
      branchId: form.branchId,
      modelYear: form.modelYear,
      color: form.color.trim(),
      currentKm: form.currentKm,
      currentFuelEighths: form.currentFuelEighths ?? "",
      maintenanceIntervalKm: form.maintenanceIntervalKm,
      chassisNo: form.chassisNo.trim().toUpperCase(),
      engineNo: form.engineNo.trim().toUpperCase(),
      registrationSerialNo: form.registrationSerialNo.trim().toUpperCase(),
      registrationDate: regDate ? toIsoDay(regDate) : "",
      notes: form.notes.trim(),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await updateVehicle(id, payload);
        router.back();
      } else {
        const created = await addVehicle(payload);
        router.replace(`/(admin)/vehicles/${created.id}`);
      }
    } catch (e) {
      const code = e?.response?.status;
      Alert.alert(
        "Kaydedilemedi",
        code === 403 ? "Bu araç sistem aracı, düzenlenemez." : apiError(e, "Araç kaydedilemedi.")
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorBanner message="Araç bilgileri yüklenemedi." onRetry={load} />;
  if (loadedFor !== (isEdit ? id : "new")) return <LoadingScreen />;

  const branchOptions = [{ key: "", label: "Şubesiz" }, ...branches.map((b) => ({ key: b.id, label: b.name }))];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionCard title="Kimlik">
          <Field label="Marka *" value={form.brand} onChangeText={set("brand")} placeholder="Örn. Fiat" error={err("brand")} />
          <Field label="Model *" value={form.model} onChangeText={set("model")} placeholder="Örn. Egea" error={err("model")} />
          <Field
            label="Plaka *"
            value={form.licensePlate}
            onChangeText={set("licensePlate")}
            placeholder="Örn. 35 ABC 123"
            autoCapitalize="characters"
            autoCorrect={false}
            error={err("licensePlate")}
          />
          <View style={styles.row2}>
            <Field
              style={styles.half}
              label="Model yılı"
              value={form.modelYear}
              onChangeText={(t) => set("modelYear")(digits(t).slice(0, 4))}
              keyboardType="number-pad"
              placeholder="2024"
              error={err("modelYear")}
            />
            <Field style={styles.half} label="Renk" value={form.color} onChangeText={set("color")} placeholder="Beyaz" />
          </View>

          <Text style={styles.label}>Vites *</Text>
          <Chips scroll={false} options={TRANSMISSIONS} value={form.transmission} onChange={set("transmission")} style={styles.chips} />
          <Text style={styles.label}>Yakıt *</Text>
          <Chips scroll={false} options={FUELS} value={form.fuelType} onChange={set("fuelType")} style={styles.chips} />
          <Text style={styles.label}>Kasa tipi *</Text>
          <Chips scroll={false} options={BODY_TYPES} value={form.bodyType} onChange={set("bodyType")} style={styles.chips} />
        </SectionCard>

        <SectionCard title="Km & Yakıt">
          <View style={styles.row2}>
            <Field
              style={styles.half}
              label="Güncel km"
              value={form.currentKm}
              onChangeText={(t) => set("currentKm")(digits(t))}
              keyboardType="number-pad"
            />
            <Field
              style={styles.half}
              label="Bakım aralığı (km)"
              value={form.maintenanceIntervalKm}
              onChangeText={(t) => set("maintenanceIntervalKm")(digits(t))}
              keyboardType="number-pad"
              placeholder="10000"
            />
          </View>
          <Text style={styles.label}>Yakıt seviyesi</Text>
          <FuelGauge value={form.currentFuelEighths} onChange={set("currentFuelEighths")} />
        </SectionCard>

        <SectionCard title="Ruhsat">
          <Field label="Şasi no" value={form.chassisNo} onChangeText={set("chassisNo")} autoCapitalize="characters" autoCorrect={false} />
          <Field label="Motor no" value={form.engineNo} onChangeText={set("engineNo")} autoCapitalize="characters" autoCorrect={false} />
          <View style={styles.row2}>
            <Field
              style={styles.half}
              label="Ruhsat seri no"
              value={form.registrationSerialNo}
              onChangeText={set("registrationSerialNo")}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Field
              style={styles.half}
              label="Tescil tarihi"
              value={form.registrationDate}
              onChangeText={set("registrationDate")}
              placeholder="GG.AA.YYYY"
              keyboardType="numbers-and-punctuation"
              error={err("registrationDate")}
            />
          </View>
        </SectionCard>

        <SectionCard title="Şube & Durum">
          <Chips scroll={false} options={branchOptions} value={form.branchId} onChange={set("branchId")} style={styles.chips} />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Servis dışı</Text>
              <Text style={styles.switchSub}>Araç arızalı / serviste; kiralanamaz.</Text>
            </View>
            <Switch value={form.outOfService} onValueChange={set("outOfService")} trackColor={{ true: COLORS.red }} />
          </View>
        </SectionCard>

        <SectionCard title="Notlar">
          <Field value={form.notes} onChangeText={set("notes")} multiline placeholder="Araçla ilgili notlar…" style={{ marginBottom: 0 }} />
        </SectionCard>

        <Text style={styles.hint}>
          Fiyatlar “Fiyat Listesi” ekranından; sigorta, muayene ve bakım kayıtları web panelinden yönetilir.
        </Text>
        <Button title={isEdit ? "Değişiklikleri Kaydet" : "Aracı Ekle"} onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.canvas },
  content:     { padding: 16, paddingBottom: 48 },
  row2:        { flexDirection: "row", gap: 10 },
  half:        { flex: 1 },
  label:       { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 6 },
  chips:       { marginBottom: 12 },
  switchRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  switchTitle: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  switchSub:   { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  hint:        { fontSize: 11, color: COLORS.subtle, textAlign: "center", marginBottom: 12 },
});
