import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/theme";
import { fuelLabel } from "../utils/format";

// Eighths, like the car's own gauge: tap a segment to set 1-8, "Boş" for 0.
export default function FuelGauge({ value, onChange, disabled = false }) {
  const selected = value == null || value === "" ? null : Number(value);
  return (
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(0)}
          disabled={disabled}
          style={[styles.empty, selected === 0 && styles.emptyActive]}
          accessibilityRole="button"
          accessibilityLabel="Depo boş"
        >
          <Text style={[styles.emptyText, selected === 0 && styles.emptyTextActive]}>Boş</Text>
        </Pressable>
        <View style={styles.bar}>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              disabled={disabled}
              style={[
                styles.segment,
                n === 1 && styles.segmentFirst,
                n === 8 && styles.segmentLast,
                selected != null && n <= selected && styles.segmentFilled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${n}/8`}
            />
          ))}
        </View>
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleText}>E</Text>
        <Text style={styles.scaleText}>1/2</Text>
        <Text style={styles.scaleText}>F</Text>
      </View>
      <Text style={styles.value}>{selected == null ? "Seviye seçin" : fuelLabel(selected)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  empty: {
    height: 38,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActive: { backgroundColor: COLORS.amberSoft, borderColor: COLORS.amberLine },
  emptyText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  emptyTextActive: { color: COLORS.amber },
  bar: { flex: 1, flexDirection: "row", gap: 3, height: 38 },
  segment: { flex: 1, backgroundColor: "#e9eeea", borderRadius: 4 },
  segmentFirst: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 },
  segmentLast: { borderTopRightRadius: 11, borderBottomRightRadius: 11 },
  segmentFilled: { backgroundColor: COLORS.green },
  scale: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginLeft: 60 },
  scaleText: { color: COLORS.subtle, fontSize: 10, fontWeight: "700" },
  value: { color: COLORS.ink, fontSize: 13, fontWeight: "800", marginTop: 8 },
});
