import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
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
export function SectionCard({ children, style, title, right }) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          {right || null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────
export function InfoRow({ label, value, mono, color }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoMono, color && { color }]}>{value}</Text>
    </View>
  );
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
            <Pressable onPress={onClose} style={styles.modalCloseBtn} hitSlop={10}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.branchOption, selectedBranchId === null && styles.branchOptionActive]}
            onPress={() => {
              onSelect(null);
              onClose();
            }}
          >
            <Text
              style={[styles.branchOptionText, selectedBranchId === null && styles.branchOptionTextActive]}
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
// Kontrat: CREATED | DONE | CANCELLED — Rezervasyon: PENDING | CONFIRMED |
// CANCELLED | CONVERTED (backend/prisma/schema.prisma).
const STATUS_MAP = {
  CREATED:   { label: "Aktif",      color: COLORS.green,  bg: COLORS.greenSoft },
  DONE:      { label: "Tamamlandı", color: COLORS.muted,  bg: "#f0f1f0" },
  CANCELLED: { label: "İptal",      color: COLORS.red,    bg: COLORS.redSoft },
  PENDING:   { label: "Bekliyor",   color: COLORS.amber,  bg: COLORS.amberSoft },
  CONFIRMED: { label: "Onaylandı",  color: COLORS.green,  bg: COLORS.greenSoft },
  CONVERTED: { label: "Kontrat",    color: "#2563eb",     bg: "#e8effd" },
};

export function StatusBadge({ status, label, color, bg }) {
  const cfg = STATUS_MAP[status] || { label: status, color: COLORS.muted, bg: "#f0f1f0" };
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg || cfg.bg }]}>
      <Text style={[styles.statusText, { color: color || cfg.color }]}>{label || cfg.label}</Text>
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

// ─── SearchBar ────────────────────────────────────────────────────────────
export function SearchBar({ value, onChangeText, onSubmit, placeholder }) {
  return (
    <View style={styles.searchRow}>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.subtle}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

// ─── Chips ────────────────────────────────────────────────────────────────
// Yatay kaydırılabilir tek seçimli filtre / seçenek çipleri.
export function Chips({ options, value, onChange, scroll = true, style }) {
  const items = options.map((o) => {
    const active = value === o.key;
    return (
      <Pressable
        key={String(o.key)}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => onChange(o.key)}
      >
        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{o.label}</Text>
      </Pressable>
    );
  });
  if (!scroll) return <View style={[styles.chipWrap, style]}>{items}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.chipRow, style]}
      style={styles.chipScroll}
    >
      {items}
    </ScrollView>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────
export function Field({ label, hint, error, style, inputStyle, multiline, ...inputProps }) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldMultiline,
          error && styles.fieldInputError,
          inputStyle,
        ]}
        placeholderTextColor={COLORS.subtle}
        multiline={multiline}
        {...inputProps}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────
const BUTTON_VARIANTS = {
  primary: { bg: COLORS.green,     border: COLORS.green,       text: "#fff" },
  blue:    { bg: "#2563eb",        border: "#2563eb",          text: "#fff" },
  danger:  { bg: COLORS.redSoft,   border: COLORS.red + "55",  text: COLORS.red },
  amber:   { bg: COLORS.amberSoft, border: COLORS.amber + "55", text: COLORS.amber },
  ghost:   { bg: COLORS.card,      border: COLORS.line,        text: COLORS.ink },
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style, small }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const off = disabled || loading;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        off && styles.buttonDisabled,
        pressed && !off && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={off}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────
// Alttan açılan form paneli; klavye açılınca içerik yukarı kayar.
export function Sheet({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ListFooter ───────────────────────────────────────────────────────────
export function ListFooter({ loading }) {
  if (!loading) return null;
  return (
    <View style={styles.listFooter}>
      <ActivityIndicator color={COLORS.green} />
    </View>
  );
}

// ─── MenuItem ─────────────────────────────────────────────────────────────
export function MenuItem({ emoji, label, sub, onPress, danger, last }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, last && styles.menuItemLast, pressed && styles.menuPressed]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Text style={styles.menuEmoji}>{emoji}</Text>
      </View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.canvas },

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
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  cardTitle:  { fontSize: 13, fontWeight: "800", color: COLORS.ink, textTransform: "uppercase", letterSpacing: 0.5 },

  infoRow:   {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  infoLabel: { fontSize: 13, color: COLORS.muted, flexShrink: 0, maxWidth: "45%" },
  infoValue: { fontSize: 13, color: COLORS.ink, fontWeight: "600", flex: 1, textAlign: "right" },
  infoMono:  { fontVariant: ["tabular-nums"] },

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
    paddingVertical: 9,
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
  modalTitle:     { fontSize: 17, fontWeight: "800", color: COLORS.ink, flex: 1 },
  modalCloseBtn:  { padding: 4 },
  modalCloseText: { fontSize: 18, color: COLORS.muted, fontWeight: "700", paddingLeft: 12 },
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
  branchOptionActive:     { backgroundColor: COLORS.greenSoft },
  branchOptionText:       { fontSize: 14, color: COLORS.ink, fontWeight: "600" },
  branchOptionTextActive: { color: COLORS.green, fontWeight: "800" },
  checkMark:              { fontSize: 16, fontWeight: "800", color: COLORS.green },

  statusBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: "700" },

  empty:       { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon:   { fontSize: 36, marginBottom: 10 },
  emptyTitle:  { fontSize: 16, fontWeight: "700", color: COLORS.ink, textAlign: "center" },
  emptySub:    { fontSize: 12, color: COLORS.muted, marginTop: 6, textAlign: "center" },

  searchRow:   { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  searchInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
  },

  chipScroll:      { flexGrow: 0 },
  chipRow:         { paddingHorizontal: 12, gap: 8, paddingBottom: 6 },
  chipWrap:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:            {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chipActive:      { backgroundColor: COLORS.green, borderColor: COLORS.green },
  chipLabel:       { fontSize: 12, color: COLORS.muted, fontWeight: "600" },
  chipLabelActive: { color: "#fff" },

  field:          { marginBottom: 12 },
  fieldLabel:     { fontSize: 12, fontWeight: "700", color: COLORS.muted, marginBottom: 5 },
  fieldInput: {
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.ink,
  },
  fieldMultiline:  { minHeight: 72, textAlignVertical: "top" },
  fieldInputError: { borderColor: COLORS.red },
  fieldError:      { fontSize: 11, color: COLORS.red, marginTop: 4 },
  fieldHint:       { fontSize: 11, color: COLORS.subtle, marginTop: 4 },

  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    minHeight: 50,
  },
  buttonSmall:     { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36, borderRadius: 10 },
  buttonDisabled:  { opacity: 0.55 },
  buttonPressed:   { opacity: 0.8 },
  buttonText:      { fontSize: 15, fontWeight: "700" },
  buttonTextSmall: { fontSize: 13 },

  sheetOverlay:  { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingBottom: 12,
  },

  listFooter: { paddingVertical: 16 },

  menuItem:       {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  menuItemLast:   { borderBottomWidth: 0 },
  menuPressed:    { opacity: 0.7 },
  menuIcon:       {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDanger: { backgroundColor: COLORS.redSoft },
  menuEmoji:      { fontSize: 18 },
  menuCopy:       { flex: 1 },
  menuLabel:      { fontSize: 14, color: COLORS.ink, fontWeight: "600" },
  menuSub:        { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  menuLabelDanger:{ color: COLORS.red },
  menuArrow:      { color: COLORS.subtle, fontSize: 20 },
});
