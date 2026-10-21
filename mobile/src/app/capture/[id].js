import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../auth/AuthContext";
import { getFieldContract, listPhotos } from "../../api/client";
import { DAMAGE_ANGLE, REQUIRED_ANGLES, STAGE_LABEL } from "../../constants/checklist";
import { CARD, COLORS } from "../../constants/theme";
import { discardFailed, enqueueCapture, flushQueue, getQueue, subscribeQueue } from "../../queue/upload-queue";
import FuelGauge from "../../components/FuelGauge";
import PhotoCompare from "../../components/PhotoCompare";
import { formatKm, fuelLabel, groupThousands, localStamp } from "../../utils/format";

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

const ANGLE_LABELS = {
  ...Object.fromEntries(REQUIRED_ANGLES.map((a) => [a.angle, a.label])),
  [DAMAGE_ANGLE]: "Hasar",
};

const photoCaption = (photo) => {
  const by = [photo.takenBy?.firstName, photo.takenBy?.lastName?.charAt(0)].filter(Boolean).join(" ");
  return [localStamp(photo.createdAt), by && `${by}.`].filter(Boolean).join(" · ");
};

// The hand-over (PICKUP) photos a return is compared against: the latest shot
// per required angle, plus every damage shot.
const toReferences = (photos) => {
  const byAngle = {};
  const damage = [];
  photos.forEach((p) => {
    if (!p.blobUrl) return;
    const ref = { uri: p.blobUrl, caption: photoCaption(p) };
    if (p.angle === DAMAGE_ANGLE) damage.push(ref);
    else byAngle[p.angle] = ref; // ordered by createdAt asc -> last one wins
  });
  return { byAngle, damage };
};

export default function CaptureScreen() {
  const { id: contractId, stage, plate } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [captureAngle, setCaptureAngle] = useState(null); // non-null while the camera view is open
  const [busy, setBusy] = useState(false);
  // { [angle]: [{ uri, mimeType }] } — DAMAGE can hold several, every other
  // angle holds at most one (a new capture replaces it).
  const [shots, setShots] = useState({});
  const [saving, setSaving] = useState(false);
  const [queueForContract, setQueueForContract] = useState([]);

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [references, setReferences] = useState({ byAngle: {}, damage: [] });
  const [referencesFailed, setReferencesFailed] = useState(false);
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState(null);
  const [compare, setCompare] = useState(null); // { title, before, after, showAfter }

  const isReturn = stage === "RETURN";
  const stageLabel = STAGE_LABEL[stage] || stage;

  useEffect(() => {
    let alive = true;
    (async () => {
      const [detail, pickupPhotos] = await Promise.allSettled([
        getFieldContract(contractId),
        isReturn ? listPhotos(contractId, "PICKUP") : Promise.resolve([]),
      ]);
      if (!alive) return;
      if (detail.status === "fulfilled") {
        const c = detail.value;
        setContract(c);
        const r = c.readings || {};
        const prefillKm = isReturn ? r.returnKm : r.pickUpKm ?? c.car?.currentKm;
        const prefillFuel = isReturn ? r.returnFuelEighths : r.pickUpFuelEighths ?? c.car?.currentFuelEighths;
        if (prefillKm != null) setKm(String(prefillKm));
        if (prefillFuel != null) setFuel(prefillFuel);
      }
      if (pickupPhotos.status === "fulfilled") setReferences(toReferences(pickupPhotos.value || []));
      else setReferencesFailed(true);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [contractId, isReturn]);

  useEffect(() => {
    const pick = (q) => q.filter((i) => i.contractId === contractId);
    getQueue().then((q) => setQueueForContract(pick(q)));
    return subscribeQueue((q) => setQueueForContract(pick(q)));
  }, [contractId]);

  const recorded = contract?.readings || {};
  const recordedKm = isReturn ? recorded.returnKm : recorded.pickUpKm;
  const recordedFuel = isReturn ? recorded.returnFuelEighths : recorded.pickUpFuelEighths;
  const pickupKmRef = recorded.pickUpKm;

  // Photos for this stage already on the server -> this visit only adds
  // extras / corrects readings, so the 5 angles aren't demanded again. If the
  // contract couldn't be loaded (offline), stay strict.
  const firstVisit = !contract || (contract.photoCounts?.[stage] || 0) === 0;

  const capturedCount = REQUIRED_ANGLES.filter(({ angle }) => (shots[angle]?.length || 0) > 0).length;
  const allRequiredCaptured = capturedCount === REQUIRED_ANGLES.length;
  const anyShots = Object.values(shots).some((list) => list.length > 0);

  const kmNum = km === "" ? null : Number(km);
  const readingsComplete = kmNum != null && fuel != null;
  const readingsChanged = readingsComplete && (kmNum !== recordedKm || fuel !== recordedFuel);
  const kmError =
    isReturn && kmNum != null && pickupKmRef != null && kmNum < pickupKmRef
      ? `Teslimdeki ${formatKm(pickupKmRef)} değerinden küçük olamaz.`
      : null;
  const usedKm = isReturn && kmNum != null && pickupKmRef != null && !kmError ? kmNum - pickupKmRef : null;

  const missing = useMemo(() => {
    if (!firstVisit) return [];
    const list = [];
    const photosLeft = REQUIRED_ANGLES.length - capturedCount;
    if (photosLeft > 0) list.push(`${photosLeft} fotoğraf`);
    if (kmNum == null) list.push("km");
    if (fuel == null) list.push("yakıt seviyesi");
    return list;
  }, [firstVisit, capturedCount, kmNum, fuel]);

  const canSave =
    !saving &&
    !kmError &&
    (firstVisit ? allRequiredCaptured && readingsComplete : anyShots || readingsChanged);

  const failedForContract = queueForContract.filter((i) => i.status === "failed");

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

  const openCompare = (angle) => {
    const shot = shots[angle]?.[0];
    setCompare({
      title: ANGLE_LABELS[angle],
      before: references.byAngle[angle] || null,
      after: shot ? { uri: shot.uri, caption: "Yeni çekim" } : null,
      showAfter: true,
    });
  };

  const save = async () => {
    const photos = [];
    Object.entries(shots).forEach(([angle, entries]) => {
      entries.forEach((entry) =>
        photos.push({ contractId, stage, angle, localUri: entry.uri, mimeType: entry.mimeType })
      );
    });
    const readings =
      readingsComplete && (firstVisit || readingsChanged)
        ? { contractId, stage, km: kmNum, fuelEighths: fuel }
        : null;
    if (photos.length === 0 && !readings) return;

    setSaving(true);
    try {
      await enqueueCapture({ photos, readings });
      setShots({});
      Alert.alert(
        "Kaydedildi",
        "Bilgiler yükleniyor. Bağlantı yoksa bağlantı gelince otomatik gönderilecek.",
        [{ text: "Tamam", onPress: () => router.back() }]
      );
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !user) return <Redirect href="/login" />;

  if (captureAngle) {
    return (
      <CameraScreen
        angle={captureAngle}
        busy={busy}
        onShoot={takeShot}
        onClose={() => setCaptureAngle(null)}
        reference={isReturn ? references.byAngle[captureAngle] : null}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* headerShown: the camera view hides the header; restore it on the way back */}
      <Stack.Screen options={{ headerShown: true, title: `${plate || ""} · ${stageLabel}` }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {failedForContract.length > 0 && (
          <View style={styles.failBanner}>
            <Text style={styles.failTitle}>{failedForContract.length} kayıt gönderilemedi</Text>
            <Text style={styles.failText}>{failedForContract[0].lastError}</Text>
            <View style={styles.failActions}>
              <Pressable onPress={flushQueue} style={styles.failButton}>
                <Text style={styles.failButtonText}>Tekrar dene</Text>
              </Pressable>
              <Pressable onPress={() => discardFailed(contractId)} style={styles.failButtonGhost}>
                <Text style={styles.failGhostText}>Vazgeç</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!loading && !firstVisit && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Bu {stageLabel.toLocaleLowerCase("tr-TR")} için fotoğraflar daha önce yüklendi. Ek fotoğraf ekleyebilir
              veya km ve yakıtı düzeltebilirsiniz.
            </Text>
          </View>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Fotoğraflar</Text>
          <Text style={styles.sectionMeta}>
            {capturedCount}/{REQUIRED_ANGLES.length}
          </Text>
        </View>
        {isReturn && referencesFailed && (
          <Text style={styles.note}>Teslim fotoğrafları yüklenemedi, karşılaştırma şu an kullanılamıyor.</Text>
        )}

        <View style={styles.card}>
          {REQUIRED_ANGLES.map(({ angle, label }, index) => {
            const shot = shots[angle]?.[0];
            const ref = isReturn ? references.byAngle[angle] : null;
            return (
              <View key={angle} style={[styles.angleRow, index > 0 && styles.angleRowDivider]}>
                <Pressable
                  onPress={() => openCamera(angle)}
                  style={styles.slot}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} fotoğrafı çek`}
                >
                  {shot ? (
                    <Image source={{ uri: shot.uri }} style={styles.slotImage} />
                  ) : (
                    <Text style={styles.slotPlus}>+</Text>
                  )}
                </Pressable>
                <View style={styles.angleCopy}>
                  <Text style={styles.angleLabel}>{label}</Text>
                  {ref ? (
                    <Pressable onPress={() => openCompare(angle)} hitSlop={8}>
                      <Text style={styles.compareLink}>{shot ? "Teslimdekiyle karşılaştır ›" : "Teslimdeki halini gör ›"}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.angleHint}>{shot ? "Çekildi · değiştirmek için dokun" : "Çekmek için dokun"}</Text>
                  )}
                </View>
                {ref ? (
                  <Pressable onPress={() => openCompare(angle)} style={styles.refWrap}>
                    <Image source={{ uri: ref.uri }} style={styles.refImage} />
                    <Text style={styles.refLabel}>Teslim</Text>
                  </Pressable>
                ) : (
                  shot && <Text style={styles.check}>✓</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Hasar fotoğrafları</Text>
          <Text style={styles.sectionMeta}>isteğe bağlı</Text>
        </View>
        <View style={styles.card}>
          {isReturn && references.damage.length > 0 && (
            <View style={styles.damageRefs}>
              <Text style={styles.damageRefsTitle}>Teslimde kayıtlı hasarlar</Text>
              <View style={styles.thumbRow}>
                {references.damage.map((ref, i) => (
                  <Pressable
                    key={`${ref.uri}-${i}`}
                    onPress={() =>
                      setCompare({ title: "Teslimdeki hasar", before: ref, after: null, showAfter: false })
                    }
                  >
                    <Image source={{ uri: ref.uri }} style={styles.thumb} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <View style={styles.thumbRow}>
            {(shots[DAMAGE_ANGLE] || []).map((shot, i) => (
              <Pressable key={shot.uri} onLongPress={() => removeDamageShot(i)}>
                <Image source={{ uri: shot.uri }} style={styles.thumb} />
              </Pressable>
            ))}
            <Pressable
              style={[styles.thumb, styles.addThumb]}
              onPress={() => openCamera(DAMAGE_ANGLE)}
              accessibilityRole="button"
              accessibilityLabel="Hasar fotoğrafı ekle"
            >
              <Text style={styles.slotPlus}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Yeni hasar fotoğrafını kaldırmak için üzerine uzun basın.</Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Km & yakıt</Text>
          {loading && <ActivityIndicator size="small" color={COLORS.green} />}
        </View>
        <View style={styles.card}>
          {isReturn && pickupKmRef != null && (
            <View style={styles.refLine}>
              <Text style={styles.refLineLabel}>Teslimde</Text>
              <Text style={styles.refLineValue}>
                {formatKm(pickupKmRef)} · {fuelLabel(recorded.pickUpFuelEighths)}
              </Text>
            </View>
          )}
          <Text style={styles.fieldLabel}>Kilometre</Text>
          <View style={[styles.kmField, kmError && styles.kmFieldError]}>
            <TextInput
              value={km}
              onChangeText={(text) => setKm(text.replace(/\D/g, "").slice(0, 7))}
              keyboardType="number-pad"
              placeholder="Göstergedeki km"
              placeholderTextColor={COLORS.subtle}
              style={styles.kmInput}
              accessibilityLabel="Kilometre"
            />
            <Text style={styles.kmUnit}>km</Text>
          </View>
          {kmError ? (
            <Text style={styles.errorText}>{kmError}</Text>
          ) : usedKm != null ? (
            <Text style={styles.helper}>Bu kiralamada {groupThousands(usedKm)} km yapılmış.</Text>
          ) : kmNum != null ? (
            <Text style={styles.helper}>{formatKm(kmNum)}</Text>
          ) : null}

          <Text style={[styles.fieldLabel, styles.fuelLabel]}>Yakıt / şarj seviyesi</Text>
          <FuelGauge value={fuel} onChange={setFuel} />
        </View>

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={save}
          disabled={!canSave}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>{firstVisit ? "Kaydet ve yükle" : "Değişiklikleri kaydet"}</Text>
          )}
        </Pressable>
        {missing.length > 0 && <Text style={styles.missing}>Eksik: {missing.join(", ")}</Text>}
      </ScrollView>

      <PhotoCompare
        visible={!!compare}
        title={compare?.title || ""}
        before={compare?.before}
        after={compare?.after}
        showAfter={compare?.showAfter ?? true}
        onClose={() => setCompare(null)}
      />
    </KeyboardAvoidingView>
  );
}

// Full-screen capture UI, isolated so the main screen's ref-management stays
// simple — a fresh CameraView + ref per open/close cycle. On a return, the
// hand-over shot of the same angle sits in the corner as a framing guide.
const CameraScreen = ({ angle, busy, onShoot, onClose, reference }) => {
  const cameraRef = useRef(null);
  return (
    <View style={styles.camera}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.cameraLabel}>
        <Text style={styles.cameraLabelText}>{ANGLE_LABELS[angle]}</Text>
      </View>
      {reference && (
        <View style={styles.cameraRef}>
          <Image source={{ uri: reference.uri }} style={styles.cameraRefImage} />
          <Text style={styles.cameraRefText}>Teslimdeki</Text>
        </View>
      )}
      <View style={styles.cameraBar}>
        <Pressable style={styles.cameraClose} onPress={onClose}>
          <Text style={styles.cameraCloseText}>Kapat</Text>
        </Pressable>
        <Pressable
          style={styles.shutter}
          disabled={busy}
          onPress={() => onShoot(cameraRef)}
          accessibilityRole="button"
          accessibilityLabel="Fotoğraf çek"
        >
          {busy && <ActivityIndicator color="#000" />}
        </Pressable>
        <View style={styles.cameraClose} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 20, paddingBottom: 48 },

  failBanner: { backgroundColor: COLORS.redSoft, borderRadius: 14, padding: 14, marginBottom: 16 },
  failTitle: { color: COLORS.red, fontSize: 13, fontWeight: "800" },
  failText: { color: COLORS.red, fontSize: 12, marginTop: 3 },
  failActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  failButton: { backgroundColor: COLORS.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  failButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  failButtonGhost: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  failGhostText: { color: COLORS.red, fontSize: 12, fontWeight: "700" },

  infoBanner: { backgroundColor: COLORS.greenSoft, borderRadius: 14, padding: 14, marginBottom: 16 },
  infoText: { color: COLORS.green, fontSize: 12, lineHeight: 17, fontWeight: "600" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionMeta: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  note: { color: COLORS.muted, fontSize: 12, marginBottom: 10 },
  card: { ...CARD, marginBottom: 18 },

  angleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  angleRowDivider: { borderTopWidth: 1, borderTopColor: "#eff1ef" },
  slot: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  slotImage: { width: 64, height: 64 },
  slotPlus: { color: COLORS.green, fontSize: 26, fontWeight: "600" },
  angleCopy: { flex: 1, marginLeft: 13 },
  angleLabel: { color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  angleHint: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  compareLink: { color: COLORS.green, fontSize: 12, fontWeight: "700", marginTop: 4 },
  check: { color: COLORS.green, fontSize: 18, fontWeight: "800", marginLeft: 8 },
  refWrap: { alignItems: "center", marginLeft: 8 },
  refImage: { width: 48, height: 48, borderRadius: 10, backgroundColor: COLORS.line },
  refLabel: { color: COLORS.muted, fontSize: 9, fontWeight: "700", marginTop: 3 },

  damageRefs: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#eff1ef" },
  damageRefsTitle: { color: COLORS.muted, fontSize: 11, fontWeight: "700", marginBottom: 8 },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLORS.line },
  addThumb: { backgroundColor: COLORS.greenSoft, alignItems: "center", justifyContent: "center" },
  hint: { color: COLORS.subtle, fontSize: 11, marginTop: 10 },

  refLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.canvas,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  refLineLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  refLineValue: { color: COLORS.ink, fontSize: 12, fontWeight: "800" },
  fieldLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.4, marginBottom: 7 },
  fuelLabel: { marginTop: 16 },
  kmField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: COLORS.canvas,
  },
  kmFieldError: { borderColor: COLORS.red, backgroundColor: COLORS.redSoft },
  kmInput: { flex: 1, fontSize: 20, fontWeight: "800", color: COLORS.ink, paddingVertical: 11 },
  kmUnit: { color: COLORS.muted, fontSize: 14, fontWeight: "700" },
  helper: { color: COLORS.muted, fontSize: 12, marginTop: 6 },
  errorText: { color: COLORS.red, fontSize: 12, marginTop: 6, fontWeight: "600" },

  saveButton: {
    backgroundColor: COLORS.green,
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  saveButtonDisabled: { backgroundColor: "#b9c6bf" },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  missing: { color: COLORS.muted, fontSize: 12, textAlign: "center", marginTop: 10 },

  camera: { flex: 1, backgroundColor: "#000" },
  cameraLabel: { position: "absolute", top: 48, left: 0, right: 0, alignItems: "center" },
  cameraLabelText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraRef: { position: "absolute", top: 96, right: 16, alignItems: "center" },
  cameraRefImage: { width: 96, height: 72, borderRadius: 10, borderWidth: 2, borderColor: "#ffffffb3" },
  cameraRefText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
