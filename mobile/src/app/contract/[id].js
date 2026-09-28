import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { REQUIRED_ANGLES, DAMAGE_ANGLE, STAGE_LABEL } from "../../constants/checklist";
import { enqueuePhotos, subscribeQueue, getQueue } from "../../queue/upload-queue";

// Shrinks + re-compresses a raw camera capture before it ever touches the
// queue/upload path — full-resolution phone photos are 3-8 MB, this keeps
// each one small and fast over mobile data. Width-only resize keeps aspect
// ratio (see expo-image-manipulator docs); compressing to JPEG q0.7 does
// most of the size reduction regardless of which edge ends up longest.
const compress = async (uri) => {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  return result.uri;
};

export default function ChecklistScreen() {
  const { id: contractId, stage, plate } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [captureAngle, setCaptureAngle] = useState(null); // non-null while the camera view is open
  const [busy, setBusy] = useState(false);
  // { [angle]: [{ uri, mimeType }] } — DAMAGE can hold several, every other
  // angle holds at most one (a new capture replaces it).
  const [shots, setShots] = useState({});
  const [uploading, setUploading] = useState(false);
  const [queueForContract, setQueueForContract] = useState([]);

  const stageLabel = STAGE_LABEL[stage] || stage;

  useEffect(() => {
    getQueue().then((q) => setQueueForContract(q.filter((i) => i.contractId === contractId)));
    return subscribeQueue((q) => setQueueForContract(q.filter((i) => i.contractId === contractId)));
  }, [contractId]);

  const allRequiredCaptured = useMemo(
    () => REQUIRED_ANGLES.every(({ angle }) => (shots[angle]?.length || 0) > 0),
    [shots]
  );
  const capturedCount = REQUIRED_ANGLES.filter(({ angle }) => (shots[angle]?.length || 0) > 0).length;

  const openCamera = async (angle) => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("İzin gerekli", "Fotoğraf çekmek için kamera izni vermelisiniz.");
        return;
      }
    }
    setCaptureAngle(angle);
  };

  const takeShot = async (cameraRef) => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      const uri = await compress(photo.uri);
      const entry = { uri, mimeType: "image/jpeg" };
      setShots((prev) => {
        const isMulti = captureAngle === DAMAGE_ANGLE;
        const existing = prev[captureAngle] || [];
        return { ...prev, [captureAngle]: isMulti ? [...existing, entry] : [entry] };
      });
    } catch {
      Alert.alert("Hata", "Fotoğraf çekilemedi, tekrar deneyin.");
    } finally {
      setBusy(false);
      if (captureAngle !== DAMAGE_ANGLE) setCaptureAngle(null);
    }
  };

  const removeDamageShot = (index) => {
    setShots((prev) => ({ ...prev, [DAMAGE_ANGLE]: prev[DAMAGE_ANGLE].filter((_, i) => i !== index) }));
  };

  const upload = async () => {
    const items = [];
    Object.entries(shots).forEach(([angle, entries]) => {
      entries.forEach((entry) => items.push({ contractId, stage, angle, localUri: entry.uri, mimeType: entry.mimeType }));
    });
    if (items.length === 0) return;
    setUploading(true);
    try {
      await enqueuePhotos(items);
      setShots({});
      Alert.alert("Kuyruğa eklendi", "Fotoğraflar yükleniyor (bağlantı yoksa bağlantı gelince otomatik yüklenecek).", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } finally {
      setUploading(false);
    }
  };

  if (captureAngle) {
    return <CameraScreen angle={captureAngle} busy={busy} onShoot={takeShot} onClose={() => setCaptureAngle(null)} />;
  }

  const failedForContract = queueForContract.filter((i) => i.status === "failed");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: `${plate || ""} · ${stageLabel}` }} />

      {failedForContract.length > 0 && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnBannerText}>
            {failedForContract.length} fotoğraf yüklenemedi: {failedForContract[0].lastError}
          </Text>
        </View>
      )}

      <Text style={styles.progress}>{capturedCount}/{REQUIRED_ANGLES.length} tamamlandı</Text>

      {REQUIRED_ANGLES.map(({ angle, label }) => {
        const shot = shots[angle]?.[0];
        return (
          <Pressable key={angle} style={styles.slot} onPress={() => openCamera(angle)}>
            {shot ? (
              <Image source={{ uri: shot.uri }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Text style={styles.thumbPlaceholderText}>+</Text>
              </View>
            )}
            <Text style={styles.slotLabel}>{label}</Text>
          </Pressable>
        );
      })}

      <Text style={styles.sectionTitle}>Hasar Fotoğrafları (opsiyonel)</Text>
      <View style={styles.damageRow}>
        {(shots[DAMAGE_ANGLE] || []).map((shot, i) => (
          <Pressable key={i} onLongPress={() => removeDamageShot(i)} style={styles.damageThumbWrap}>
            <Image source={{ uri: shot.uri }} style={styles.damageThumb} />
          </Pressable>
        ))}
        <Pressable style={styles.addDamage} onPress={() => openCamera(DAMAGE_ANGLE)}>
          <Text style={styles.thumbPlaceholderText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Hasar fotoğrafını uzun basarak kaldırabilirsiniz.</Text>

      <Pressable
        style={[styles.uploadButton, (!allRequiredCaptured || uploading) && styles.uploadButtonDisabled]}
        onPress={upload}
        disabled={!allRequiredCaptured || uploading}
      >
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadButtonText}>Yükle</Text>}
      </Pressable>
    </ScrollView>
  );
}

// Full-screen capture UI, isolated so the main screen's ref-management stays
// simple — a fresh CameraView + ref per open/close cycle.
const ANGLE_LABELS = { ...Object.fromEntries(REQUIRED_ANGLES.map((a) => [a.angle, a.label])), [DAMAGE_ANGLE]: "Hasar" };

const CameraScreen = ({ angle, busy, onShoot, onClose }) => {
  const cameraRef = useRef(null);
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View style={styles.cameraLabel}>
        <Text style={styles.cameraLabelText}>{ANGLE_LABELS[angle]}</Text>
      </View>
      <View style={styles.cameraBar}>
        <Pressable style={styles.cameraClose} onPress={onClose}>
          <Text style={styles.cameraCloseText}>Kapat</Text>
        </Pressable>
        <Pressable style={styles.shutter} disabled={busy} onPress={() => onShoot(cameraRef)}>
          {busy && <ActivityIndicator color="#000" />}
        </Pressable>
        <View style={{ width: 70 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  progress: { fontSize: 14, color: "#475569", marginBottom: 12, fontWeight: "600" },
  slot: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlaceholderText: { fontSize: 24, color: "#64748b" },
  slotLabel: { fontSize: 15, color: "#0f172a", fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 16, marginBottom: 8, color: "#0f172a" },
  damageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  damageThumbWrap: { width: 64, height: 64 },
  damageThumb: { width: 64, height: 64, borderRadius: 8 },
  addDamage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
  uploadButton: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  uploadButtonDisabled: { backgroundColor: "#94a3b8" },
  uploadButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  warnBanner: { backgroundColor: "#fee2e2", borderRadius: 10, padding: 10, marginBottom: 12 },
  warnBannerText: { color: "#991b1b", fontWeight: "600" },
  cameraLabel: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  cameraLabelText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraBar: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  cameraClose: { width: 70 },
  cameraCloseText: { color: "#fff", fontWeight: "600" },
  shutter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
