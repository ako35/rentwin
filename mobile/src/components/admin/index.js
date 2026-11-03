import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS } from "../../constants/theme";

// ─── LoadingScreen ─────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.green} />
    </View>
  );
}

// ─── ErrorBanner ──────────────────────────────────────────────────────────
export function ErrorBanner({ message = "Veri yüklenemedi.", onRetry }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <Text style={styles.retryText} onPress={onRetry}>
          Tekrar dene
        </Text>
      )}
    </View>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────
export function SectionCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── StatTile ─────────────────────────────────────────────────────────────
export function StatTile({ label, value, color, sub }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, color && { color }]}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── AlertPill ────────────────────────────────────────────────────────────
export function AlertPill({ count, label, color = COLORS.red, bg }) {
  if (!count) return null;
  const bgColor = bg || color + "22";
  return (
    <View style={[styles.alertPill, { borderColor: color + "55", backgroundColor: bgColor }]}>
      <View style={[styles.alertDot, { backgroundColor: color }]} />
      <Text style={[styles.alertText, { color }]}>
        {count} {label}
      </Text>
    </View>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────
const STATUS_MAP = {
  ACTIVE:    { label: "Aktif",      color: COLORS.green,  bg: COLORS.greenSoft },
  DONE:      { label: "Tamamlandı", color: COLORS.muted,  bg: "#f0f1f0" },
  CANCELLED: { label: "İptal",      color: COLORS.red,    bg: COLORS.redSoft },
  PENDING:   { label: "Bekliyor",   color: COLORS.amber,  bg: COLORS.amberSoft },
  CONFIRMED: { label: "Onaylandı",  color: COLORS.green,  bg: COLORS.greenSoft },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, color: COLORS.muted, bg: "#f0f1f0" };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────
export function EmptyState({ icon = "📭", title = "Kayıt yok", subtitle }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  errorBanner: {
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.redSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red + "33",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText:  { color: COLORS.red, fontSize: 13, flex: 1 },
  retryText:  { color: COLORS.green, fontSize: 13, fontWeight: "700", marginLeft: 12 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
  },

  statTile: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 28, fontWeight: "800", color: COLORS.ink, lineHeight: 34 },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 3, fontWeight: "600", textAlign: "center" },
  statSub:   { fontSize: 10, color: COLORS.subtle, marginTop: 2, textAlign: "center" },

  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  alertDot:  { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  alertText: { fontSize: 13, fontWeight: "600", flex: 1 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: "700" },

  empty:       { alignItems: "center", paddingVertical: 40 },
  emptyIcon:   { fontSize: 36, marginBottom: 10 },
  emptyTitle:  { fontSize: 16, fontWeight: "700", color: COLORS.ink },
  emptySub:    { fontSize: 12, color: COLORS.muted, marginTop: 6, textAlign: "center" },
});
