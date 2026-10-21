import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/theme";

// Full-screen side-by-side (stacked) view of the same angle at hand-over and
// now, so new damage is spotted while the customer is still there.
// `before` / `after`: { uri, caption } or null. showAfter={false} turns it into
// a plain viewer for a hand-over photo with no counterpart (damage shots).
export default function PhotoCompare({ visible, title, before, after, showAfter = true, onClose }) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Kapat">
            <Text style={styles.closeText}>Kapat</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Panel label="Teslimdeki hali" photo={before} empty="Teslimde bu açı çekilmemiş." />
          {showAfter && <Panel label="Şimdi" photo={after} empty="Bu açı henüz çekilmedi." />}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Panel({ label, photo, empty }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelLabel}>{label}</Text>
        {!!photo?.caption && <Text style={styles.panelCaption}>{photo.caption}</Text>}
      </View>
      {photo?.uri ? (
        <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>{empty}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0d1412" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800", flex: 1, marginRight: 12 },
  close: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11, backgroundColor: "#ffffff1f" },
  closeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  body: { paddingHorizontal: 14, paddingBottom: 40, gap: 16 },
  panel: { gap: 8 },
  panelHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  panelLabel: { color: "#cfe7da", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  panelCaption: { color: "#8fa198", fontSize: 11 },
  image: { width: "100%", aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: "#1b2622" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: COLORS.subtle, fontSize: 13 },
});
