import { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TextInput } from "react-native";
import { useFocusEffect } from "expo-router";
import { getPriceList, updateVehicle } from "../../../api/admin";
import { LoadingScreen, ErrorBanner, EmptyState, SearchBar, Button } from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { parseAmount, apiError } from "../../../utils/admin";

const toDraft = (v) => ({
  dailyPrice: v.dailyPrice == null ? "" : String(v.dailyPrice),
  monthlyPrice: v.monthlyPrice == null ? "" : String(v.monthlyPrice),
});

const sameNumber = (text, value) => {
  const n = parseAmount(text);
  return (n ?? null) === (value ?? null);
};

function PriceInput({ label, value, onChangeText, invalid }) {
  return (
    <View style={styles.priceField}>
      <Text style={styles.priceLabel}>{label}</Text>
      <View style={[styles.priceBox, invalid && styles.priceBoxError]}>
        <Text style={styles.currency}>₺</Text>
        <TextInput
          style={styles.priceInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={COLORS.subtle}
        />
      </View>
    </View>
  );
}

function PriceRow({ vehicle, draft, onChange, onSave, saving }) {
  const dirty = !sameNumber(draft.dailyPrice, vehicle.dailyPrice) || !sameNumber(draft.monthlyPrice, vehicle.monthlyPrice);
  const dailyBad = Number.isNaN(parseAmount(draft.dailyPrice)) || parseAmount(draft.dailyPrice) < 0;
  const monthlyBad = Number.isNaN(parseAmount(draft.monthlyPrice)) || parseAmount(draft.monthlyPrice) < 0;
  return (
    <View style={[styles.row, dirty && styles.rowDirty]}>
      <View style={styles.rowHead}>
        <Text style={styles.plate}>{vehicle.licensePlate}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {[vehicle.brand, vehicle.model, vehicle.modelYear].filter(Boolean).join(" ")}
        </Text>
      </View>
      <View style={styles.inputs}>
        <PriceInput label="Günlük" value={draft.dailyPrice} onChangeText={(t) => onChange("dailyPrice", t)} invalid={dailyBad} />
        <PriceInput label="Aylık" value={draft.monthlyPrice} onChangeText={(t) => onChange("monthlyPrice", t)} invalid={monthlyBad} />
        <Button
          small
          title="Kaydet"
          onPress={onSave}
          loading={saving}
          disabled={!dirty || dailyBad || monthlyBad}
          style={styles.saveBtn}
        />
      </View>
    </View>
  );
}

export default function PriceListScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await getPriceList();
      const rows = Array.isArray(list) ? list : [];
      setVehicles(rows);
      // Kaydedilmemiş girişler yenilemede korunur.
      setDrafts((prev) => {
        const next = {};
        rows.forEach((v) => {
          next[v.id] = prev[v.id] || toDraft(v);
        });
        return next;
      });
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

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      [v.licensePlate, v.brand, v.model].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [vehicles, search]);

  const missing = vehicles.filter((v) => v.dailyPrice == null && v.monthlyPrice == null).length;

  const save = async (vehicle) => {
    const draft = drafts[vehicle.id];
    setSavingId(vehicle.id);
    try {
      const updated = await updateVehicle(vehicle.id, {
        dailyPrice: parseAmount(draft.dailyPrice),
        monthlyPrice: parseAmount(draft.monthlyPrice),
      });
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicle.id ? { ...v, dailyPrice: updated.dailyPrice, monthlyPrice: updated.monthlyPrice } : v
        )
      );
      setDrafts((prev) => ({ ...prev, [vehicle.id]: toDraft(updated) }));
    } catch (err) {
      Alert.alert("Hata", apiError(err, "Fiyat kaydedilemedi."));
    } finally {
      setSavingId(null);
    }
  };

  if (loading && !vehicles.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      <SearchBar placeholder="Plaka, marka, model…" value={search} onChangeText={setSearch} />
      <Text style={styles.summary}>
        {vehicles.length} araç{missing ? ` · ${missing} araçta fiyat yok` : ""}
      </Text>
      {error && <ErrorBanner message="Fiyat listesi yüklenemedi." onRetry={load} />}
      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <PriceRow
            vehicle={item}
            draft={drafts[item.id] || toDraft(item)}
            onChange={(field, value) =>
              setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || toDraft(item)), [field]: value } }))
            }
            onSave={() => save(item)}
            saving={savingId === item.id}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={error ? null : <EmptyState icon="💰" title="Araç bulunamadı" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.canvas },
  summary: { fontSize: 12, color: COLORS.muted, paddingHorizontal: 16, paddingBottom: 4 },
  list:    { padding: 12, paddingTop: 4, gap: 8, paddingBottom: 40 },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
  },
  rowDirty:  { borderColor: COLORS.green },
  rowHead:   { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 8 },
  plate:     { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  name:      { flex: 1, fontSize: 12, color: COLORS.muted },
  inputs:    { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  priceField:{ flex: 1 },
  priceLabel:{ fontSize: 11, fontWeight: "700", color: COLORS.muted, marginBottom: 4 },
  priceBox:  {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 10,
  },
  priceBoxError: { borderColor: COLORS.red },
  currency:  { fontSize: 13, color: COLORS.muted, marginRight: 4 },
  priceInput:{ flex: 1, paddingVertical: 8, fontSize: 14, color: COLORS.ink },
  saveBtn:   { minWidth: 76 },
});
