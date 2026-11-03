import { View, Text, StyleSheet, ActivityIndicator, Pressable, Modal, FlatList } from "react-native";
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
export function AlertPill({ count, label, color = COLORS.red, bg, onPress }) {
  if (!count) return null;
  const bgColor = bg || color + "22";

  const content = (
    <View style={[styles.alertPill, { borderColor: color + "55", backgroundColor: bgColor }]}>
      <View style={[styles.alertDot, { backgroundColor: color }]} />
      <Text style={[styles.alertText, { color }]}>
        {count} {label}
      </Text>
      {onPress && <Text style={[styles.alertChevron, { color }]}>›</Text>}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.75 }}>
        {content}
      </Pressable>
    );
  }

  return content;
}

// ─── BranchPickerModal ────────────────────────────────────────────────────
export function BranchPickerModal({ visible, onClose, branches, selectedBranchId, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Şube Seçimi</Text>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.branchOption,
              selectedBranchId === null && styles.branchOptionActive,
            ]}
            onPress={() => {
              onSelect(null);
              onClose();
            }}
          >
            <Text
              style={[
                styles.branchOptionText,
                selectedBranchId === null && styles.branchOptionTextActive,
              ]}
            >
              🏢 Tüm Şubeler
            </Text>
            {selectedBranchId === null && <Text style={styles.checkMark}>✓</Text>}
          </Pressable>

          <FlatList
            data={branches}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => {
              const active = selectedBranchId === item.id;
              return (
                <Pressable
                  style={[styles.branchOption, active && styles.branchOptionActive]}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                >
                  <Text style={[styles.branchOptionText, active && styles.branchOptionTextActive]}>
                    📍 {item.name}
                  </Text>
                  {active && <Text style={styles.checkMark}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
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
  alertDot:     { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  alertText:    { fontSize: 13, fontWeight: "600", flex: 1 },
  alertChevron: { fontSize: 16, fontWeight: "700", marginLeft: 6 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingBottom: 10,
  },
  modalTitle:     { fontSize: 17, fontWeight: "800", color: COLORS.ink },
  modalCloseBtn:  { padding: 4 },
  modalCloseText: { fontSize: 18, color: COLORS.muted, fontWeight: "700" },
  branchOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: COLORS.canvas,
  },
  branchOptionActive: {
    backgroundColor: COLORS.greenSoft,
  },
  branchOptionText: {
    fontSize: 14,
    color: COLORS.ink,
    fontWeight: "600",
  },
  branchOptionTextActive: {
    color: COLORS.green,
    fontWeight: "800",
  },
  checkMark: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.green,
  },

  statusBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: "700" },

  empty:       { alignItems: "center", paddingVertical: 40 },
  emptyIcon:   { fontSize: 36, marginBottom: 10 },
  emptyTitle:  { fontSize: 16, fontWeight: "700", color: COLORS.ink },
  emptySub:    { fontSize: 12, color: COLORS.muted, marginTop: 6, textAlign: "center" },
});

