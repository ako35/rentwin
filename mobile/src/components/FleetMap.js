import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Linking, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { getFleetPositions } from "../api/client";
import { COLORS } from "../constants/theme";
import { FLEET_MAP_HTML } from "./fleet-map-html";

// Filo Haritası (GPS takip Faz 4): tracked vehicles on a map, sorted by
// distance from the phone, with the nearest available one on top. Uses the
// same endpoint as the web admin map, so a rented vehicle's location stays
// hidden here too (KVKK) — the phone never receives it. The phone's own
// location is only used on the device to sort the list; it is not sent.

const REFRESH_MS = 30000;

const STATUS = {
  AVAILABLE: { label: "Müsait", color: "#1b7a43" },
  RENTED: { label: "Kirada", color: "#c98a1f" },
  OUT_OF_SERVICE: { label: "Serviste", color: "#b93a3a" },
  PASSIVE: { label: "Pasif", color: "#7c3aed" },
};

const ERRORS = {
  TRACCAR_NOT_CONFIGURED: "GPS sunucusu henüz ayarlanmadı.",
  TRACCAR_UNREACHABLE: "GPS sunucusuna ulaşılamadı.",
  TRACCAR_AUTH: "GPS sunucusu Rentwin'in erişimini reddetti.",
  TRACCAR_ERROR: "GPS sunucusu hata verdi.",
};

const distanceKm = (a, b) => {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const formatDistance = (km) =>
  km == null ? "" : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;

const ago = (iso) => {
  if (!iso) return "sinyal yok";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} sa önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
};

const openDirections = (lat, lng) =>
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() =>
    Alert.alert("Yol tarifi", "Harita uygulaması açılamadı.")
  );

export default function FleetMap() {
  const webRef = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const refit = useRef(false);

  const load = useCallback(async () => {
    try {
      setData(await getFleetPositions());
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Filo konumları alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  const locate = useCallback(async ({ ask }) => {
    try {
      const current = ask
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (current.status !== "granted") {
        if (ask) {
          Alert.alert(
            "Konum izni",
            current.canAskAgain
              ? "En yakın aracı bulmak için konum izni gerekiyor."
              : "Konum izni kapalı. Telefonun ayarlarından Rentwin Saha için konum iznini açabilirsiniz."
          );
        }
        return;
      }
      setLocating(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      refit.current = true;
    } catch {
      if (ask) Alert.alert("Konum", "Konumunuz alınamadı. Konum servisinin açık olduğundan emin olun.");
    } finally {
      setLocating(false);
    }
  }, []);

  // Permission already given earlier: use it without asking again (once).
  const triedSilentLocate = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (triedSilentLocate.current) return;
      triedSilentLocate.current = true;
      locate({ ask: false });
    }, [locate])
  );

  const rows = useMemo(() => {
    const list = (data?.vehicles || []).map((v) => {
      const pos = v.position ? { lat: v.position.latitude, lng: v.position.longitude } : null;
      return { ...v, pos, distance: pos && me ? distanceKm(me, pos) : null };
    });
    // Located ones first (nearest first when the phone's location is known),
    // then the hidden / not reporting ones by plate.
    return list.sort((a, b) => {
      if (!!a.pos !== !!b.pos) return a.pos ? -1 : 1;
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      return a.licensePlate.localeCompare(b.licensePlate, "tr");
    });
  }, [data, me]);

  const nearest = useMemo(
    () => (me ? rows.find((r) => r.status === "AVAILABLE" && r.distance != null) : null),
    [rows, me]
  );

  // Push the current state into the map page.
  useEffect(() => {
    if (!ready || !webRef.current) return;
    const payload = {
      vehicles: rows
        .filter((r) => r.pos)
        .map((r) => ({
          id: r.id,
          lat: r.pos.lat,
          lng: r.pos.lng,
          color: STATUS[r.status]?.color || "#64748b",
          label: r.licensePlate,
        })),
      me,
      selectedId,
      refit: refit.current,
    };
    refit.current = false;
    webRef.current.injectJavaScript(`window.rwUpdate && window.rwUpdate(${JSON.stringify(payload)}); true;`);
  }, [ready, rows, me, selectedId]);

  const focus = (row) => {
    setSelectedId(row.id);
    if (row.pos && webRef.current) {
      webRef.current.injectJavaScript(`window.rwFocus && window.rwFocus(${row.pos.lat}, ${row.pos.lng}); true;`);
    }
  };

  const onMessage = (event) => {
    let msg = null;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") setReady(true);
    else if (msg.type === "select") setSelectedId(msg.id);
    else if (msg.type === "error") setMapFailed(true);
  };

  const traccarError = data?.traccarError ? ERRORS[data.traccarError] || ERRORS.TRACCAR_ERROR : "";
  const hiddenCount = rows.filter((r) => r.locationHidden).length;

  const header = (
    <View>
      {(error || traccarError) && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{error || traccarError}</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={() => locate({ ask: true })}
          style={styles.primaryBtn}
          accessibilityRole="button"
          disabled={locating}
        >
          {locating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>📍 En yakın aracı bul</Text>}
        </Pressable>
        <Pressable onPress={load} style={styles.secondaryBtn} accessibilityRole="button">
          <Text style={styles.secondaryBtnText}>Yenile</Text>
        </Pressable>
      </View>
      {nearest && (
        <Pressable onPress={() => focus(nearest)} style={styles.nearestCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nearestLabel}>EN YAKIN MÜSAİT ARAÇ</Text>
            <Text style={styles.nearestPlate}>{nearest.licensePlate}</Text>
            <Text style={styles.nearestSub}>
              {[nearest.brand, nearest.model].filter(Boolean).join(" ")} · {formatDistance(nearest.distance)}
            </Text>
          </View>
          <Pressable
            onPress={() => openDirections(nearest.pos.lat, nearest.pos.lng)}
            style={styles.dirBtn}
            accessibilityRole="button"
            accessibilityLabel={`${nearest.licensePlate} için yol tarifi`}
          >
            <Text style={styles.dirBtnText}>Yol tarifi</Text>
          </Pressable>
        </Pressable>
      )}
      {hiddenCount > 0 && (
        <Text style={styles.hint}>
          Kiradaki {hiddenCount} aracın konumu gizli. Gerekçeli açma yalnızca web panelinde yapılır.
        </Text>
      )}
      {data?.untrackedCount > 0 && <Text style={styles.hint}>{data.untrackedCount} araçta takip cihazı yok.</Text>}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.mapBox}>
        {mapFailed ? (
          <View style={styles.mapFallback}>
            <Text style={styles.hint}>Harita yüklenemedi. İnternet bağlantısını kontrol edin.</Text>
          </View>
        ) : (
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            // baseUrl gives tile requests a Referer, which OpenStreetMap requires.
            source={{ html: FLEET_MAP_HTML, baseUrl: "https://rentwin.com.tr/" }}
            onMessage={onMessage}
            onError={() => setMapFailed(true)}
            setSupportMultipleWindows={false}
            style={styles.map}
          />
        )}
        {loading && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        )}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading && !error ? <Text style={styles.hint}>Takip cihazı tanımlı araç yok.</Text> : null
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status] || { label: item.status, color: "#64748b" };
          const selected = item.id === selectedId;
          return (
            <Pressable onPress={() => focus(item)} style={[styles.row, selected && styles.rowSelected]}>
              <View style={[styles.dot, { backgroundColor: st.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.plate}>{item.licensePlate}</Text>
                <Text style={styles.sub}>
                  {[item.brand, item.model].filter(Boolean).join(" ")} · {st.label}
                </Text>
                <Text style={styles.sub}>
                  {item.locationHidden ? "Konum gizli (kirada)" : `Son sinyal: ${ago(item.lastSeenAt)}`}
                </Text>
              </View>
              {item.pos && (
                <View style={styles.rowRight}>
                  {item.distance != null && <Text style={styles.distance}>{formatDistance(item.distance)}</Text>}
                  <Pressable
                    onPress={() => openDirections(item.pos.lat, item.pos.lng)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.licensePlate} için yol tarifi`}
                  >
                    <Text style={styles.link}>Yol tarifi</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.canvas },
  mapBox: { height: "42%", borderBottomWidth: 1, borderColor: COLORS.line },
  map: { flex: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  mapLoading: { position: "absolute", top: 12, right: 12 },
  list: { padding: 14, paddingBottom: 40 },
  notice: {
    backgroundColor: COLORS.amberSoft,
    borderColor: COLORS.amberLine,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  noticeText: { color: COLORS.amber, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8, marginBottom: 10 },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  secondaryBtnText: { color: COLORS.ink, fontWeight: "700" },
  nearestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.greenSoft,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  nearestLabel: { fontSize: 11, fontWeight: "800", color: COLORS.green, letterSpacing: 0.5 },
  nearestPlate: { fontSize: 18, fontWeight: "800", color: COLORS.ink, marginTop: 2 },
  nearestSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  dirBtn: { backgroundColor: COLORS.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  dirBtnText: { color: "#fff", fontWeight: "700" },
  hint: { fontSize: 12, color: COLORS.muted, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  rowSelected: { borderColor: COLORS.green, borderWidth: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  plate: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  sub: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  distance: { fontSize: 13, fontWeight: "700", color: COLORS.ink },
  link: { fontSize: 13, fontWeight: "700", color: COLORS.green },
});
