import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Alert, Switch } from "react-native";
import { useFocusEffect } from "expo-router";
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } from "../../../api/admin";
import { LoadingScreen, ErrorBanner, EmptyState, Sheet, Field, Button } from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { localDate, apiError } from "../../../utils/admin";

// Duyurular web admin panelinin üst bandında gösterilir (yalnızca yöneticilere).
function AnnouncementSheet({ announcement, onClose, onSaved }) {
  const [title, setTitle] = useState(announcement?.title || "");
  const [body, setBody] = useState(announcement?.body || "");
  const [active, setActive] = useState(announcement ? announcement.active : true);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const errors = {
    title: title.trim() ? null : "Başlık zorunlu.",
    body: body.trim() ? null : "Metin zorunlu.",
  };

  const save = async () => {
    setAttempted(true);
    if (errors.title || errors.body) return;
    setSaving(true);
    const payload = { title: title.trim(), body: body.trim(), active };
    try {
      if (announcement) await updateAnnouncement(announcement.id, payload);
      else await addAnnouncement(payload);
      onSaved();
    } catch (err) {
      Alert.alert("Hata", apiError(err, "Duyuru kaydedilemedi."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible title={announcement ? "Duyuruyu Düzenle" : "Yeni Duyuru"} onClose={onClose}>
      <Field label="Başlık *" value={title} onChangeText={setTitle} error={attempted ? errors.title : null} />
      <Field
        label="Metin *"
        value={body}
        onChangeText={setBody}
        multiline
        inputStyle={{ minHeight: 120 }}
        error={attempted ? errors.body : null}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Yayında</Text>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: COLORS.green }} />
      </View>
      <Button title="Kaydet" onPress={save} loading={saving} />
    </Sheet>
  );
}

export default function AnnouncementsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(undefined); // undefined: kapalı, null: yeni
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await getAnnouncements();
      setItems(Array.isArray(list) ? list : []);
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

  const toggle = async (item) => {
    setTogglingId(item.id);
    try {
      const updated = await updateAnnouncement(item.id, { title: item.title, body: item.body, active: !item.active });
      setItems((prev) => prev.map((a) => (a.id === item.id ? updated : a)));
    } catch (err) {
      Alert.alert("Hata", apiError(err));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert("Duyuru silinsin mi?", `"${item.title}" kalıcı olarak silinecek.`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAnnouncement(item.id);
            setItems((prev) => prev.filter((a) => a.id !== item.id));
          } catch (err) {
            Alert.alert("Hata", apiError(err, "Duyuru silinemedi."));
          }
        },
      },
    ]);
  };

  if (loading && !items.length) return <LoadingScreen />;

  return (
    <View style={styles.root}>
      {error && <ErrorBanner message="Duyurular yüklenemedi." onRetry={load} />}
      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Button title="＋  Yeni Duyuru" onPress={() => setEditing(null)} style={{ marginBottom: 4 }} />}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={() => setEditing(item)}>
            <View style={styles.cardHead}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Switch
                value={item.active}
                onValueChange={() => toggle(item)}
                disabled={togglingId === item.id}
                trackColor={{ true: COLORS.green }}
              />
            </View>
            <Text style={styles.body} numberOfLines={4}>{item.body}</Text>
            <View style={styles.cardFoot}>
              <Text style={styles.meta}>
                {localDate(item.createdAt)} · {item.active ? "Yayında" : "Yayında değil"}
              </Text>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                <Text style={styles.delete}>Sil</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={error ? null : <EmptyState icon="📣" title="Duyuru yok" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        showsVerticalScrollIndicator={false}
      />
      {editing !== undefined && (
        <AnnouncementSheet
          announcement={editing}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await load();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  cardHead:    { flexDirection: "row", alignItems: "center", gap: 10 },
  title:       { flex: 1, fontSize: 15, fontWeight: "800", color: COLORS.ink },
  body:        { fontSize: 13, color: COLORS.ink, lineHeight: 19, marginTop: 6 },
  cardFoot:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  meta:        { fontSize: 11, color: COLORS.muted },
  delete:      { fontSize: 12, fontWeight: "700", color: COLORS.red },
  switchRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  switchLabel: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
});
