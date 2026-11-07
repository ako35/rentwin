import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { getAllBranches, addBranch, updateBranch, deleteBranch } from "../../../api/admin";
import { useBranch } from "../../../context/BranchContext";
import { LoadingScreen, ErrorBanner, EmptyState, Sheet, Field, Button } from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { apiError } from "../../../utils/admin";

function BranchSheet({ branch, onClose, onSaved }) {
  const [name, setName] = useState(branch?.name || "");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const error = name.trim() ? null : "Şube adı zorunlu.";

  const save = async () => {
    setAttempted(true);
    if (error) return;
    setSaving(true);
    try {
      if (branch) await updateBranch(branch.id, { name: name.trim() });
      else await addBranch({ name: name.trim() });
      onSaved();
    } catch (err) {
      Alert.alert("Hata", apiError(err, "Şube kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible title={branch ? "Şubeyi Düzenle" : "Yeni Şube"} onClose={onClose}>
      <Field
        label="Şube adı *"
        value={name}
        onChangeText={setName}
        placeholder="Örn. Aliağa"
        autoFocus
        error={attempted ? error : null}
        hint={branch ? `Şube kodu: ${branch.code}` : "Şube kodu otomatik verilir."}
      />
      <Button title="Kaydet" onPress={save} loading={saving} />
    </Sheet>
  );
}

export default function BranchesScreen() {
  const { refreshBranches, selectedBranchId, setSelectedBranchId } = useBranch();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(undefined); // undefined: kapalı, null: yeni, obje: düzenle

  const load = useCallback(async () => {
    try {
      const list = await getAllBranches();
      setBranches(Array.isArray(list) ? list : []);
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

  // Şube seçici (dashboard) de aynı listeyi kullanır — değişiklikten sonra tazele.
  const afterChange = async () => {
    await load();
    refreshBranches();
  };

  const confirmDelete = (branch) => {
    const message = branch.vehicleCount
      ? `${branch.vehicleCount} araç bu şubeye bağlı; silinirse araçlar şubesiz kalır.`
      : "Şube kalıcı olarak silinecek.";
    Alert.alert(`"${branch.name}" silinsin mi?`, message, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBranch(branch.id);
            if (selectedBranchId === branch.id) setSelectedBranchId(null);
            await afterChange();
          } catch (err) {
            Alert.alert("Hata", apiError(err, "Şube silinemedi."));
          }
        },
      },
    ]);
  };

  if (loading && !branches.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      {error && <ErrorBanner message="Şubeler yüklenemedi." onRetry={load} />}
      <FlatList
        data={branches}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Button title="＋  Yeni Şube" onPress={() => setEditing(null)} style={styles.addBtn} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.code}>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.vehicleCount || 0} araç</Text>
            </View>
            <Pressable style={styles.iconBtn} onPress={() => setEditing(item)} hitSlop={6}>
              <Text style={styles.iconText}>✎</Text>
            </Pressable>
            {!item.builtIn && (
              <Pressable style={[styles.iconBtn, styles.iconDanger]} onPress={() => confirmDelete(item)} hitSlop={6}>
                <Text style={[styles.iconText, { color: COLORS.red }]}>✕</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={error ? null : <EmptyState icon="🏢" title="Şube yok" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        showsVerticalScrollIndicator={false}
      />
      {editing !== undefined && (
        <BranchSheet
          branch={editing}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await afterChange();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.canvas },
  list:   { padding: 12, gap: 8 },
  addBtn: { marginBottom: 4 },
  row: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  code:       { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center" },
  codeText:   { fontSize: 14, fontWeight: "800", color: COLORS.green },
  name:       { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  sub:        { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  iconBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.canvas, alignItems: "center", justifyContent: "center" },
  iconDanger: { backgroundColor: COLORS.redSoft },
  iconText:   { fontSize: 15, fontWeight: "800", color: COLORS.ink },
});
