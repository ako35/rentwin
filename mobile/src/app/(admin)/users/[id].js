import { useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, RefreshControl, Linking } from "react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { getUserAdmin, getContractsByUser, getUserLedger } from "../../../api/admin";
import {
  LoadingScreen,
  ErrorBanner,
  SectionCard,
  EmptyState,
  InfoRow,
  StatusBadge,
  Button,
} from "../../../components/admin";
import { COLORS } from "../../../constants/theme";
import { personName, wallDate, localDate, money } from "../../../utils/admin";
import { whatsappNumber } from "../../../utils/format";

const HISTORY_LIMIT = 15;

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, history, cari] = await Promise.all([
        getUserAdmin(id),
        getContractsByUser(id).catch(() => []),
        getUserLedger(id).catch(() => null),
      ]);
      setUser(u);
      setContracts(Array.isArray(history) ? history : []);
      setLedger(cari);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const stale = user && user.id !== id;
  if (error && (!user || stale)) return <ErrorBanner message="Kullanıcı yüklenemedi." onRetry={load} />;
  if (loading || stale) return <LoadingScreen />;
  if (!user) return <EmptyState icon="👤" title="Kullanıcı bulunamadı" />;

  const u = user;
  const isCorporate = u.customerType === "Kurumsal";
  const isAdmin = u.roles?.includes("Administrator");
  const wa = whatsappNumber(u.phoneNumber);
  const balance = ledger?.balance ?? null;
  const address = [u.address, u.district, u.city, u.zipCode].filter(Boolean).join(", ");

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      showsVerticalScrollIndicator={false}
    >
      {error && <ErrorBanner message="Güncel veri alınamadı." onRetry={load} />}

      <View style={styles.hero}>
        <Text style={styles.heroName}>{personName(u)}</Text>
        {isCorporate && (u.firstName || u.lastName) ? (
          <Text style={styles.heroSub}>Yetkili: {`${u.firstName || ""} ${u.lastName || ""}`.trim()}</Text>
        ) : null}
        <View style={styles.badges}>
          <StatusBadge
            status="role"
            label={isAdmin ? "Yönetici" : u.customerType || "Müşteri"}
            color={COLORS.green}
            bg={COLORS.greenSoft}
          />
          {u.customerCode ? <StatusBadge status="code" label={u.customerCode} /> : null}
          {u.active === false ? <StatusBadge status="CANCELLED" label="Pasif" /> : null}
        </View>
      </View>

      {(u.phoneNumber || u.email) && (
        <View style={styles.contactRow}>
          {u.phoneNumber ? (
            <Button small title="📞 Ara" variant="ghost" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${u.phoneNumber}`)} />
          ) : null}
          {wa ? (
            <Button small title="WhatsApp" variant="ghost" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://wa.me/${wa}`)} />
          ) : null}
          {u.email ? (
            <Button small title="✉ E-posta" variant="ghost" style={{ flex: 1 }} onPress={() => Linking.openURL(`mailto:${u.email}`)} />
          ) : null}
        </View>
      )}

      {ledger ? (
        <SectionCard title="Cari">
          <InfoRow label="Borç (toplam)" value={money(ledger.debit)} />
          <InfoRow label="Alacak (tahsilat)" value={money(ledger.credit)} />
          <InfoRow
            label="Bakiye"
            value={balance < -0.009 ? `${money(-balance)} borçlu` : balance > 0.009 ? `${money(balance)} alacaklı` : "Kapalı"}
            color={balance < -0.009 ? COLORS.red : COLORS.green}
          />
        </SectionCard>
      ) : null}

      <SectionCard title="Bilgiler">
        <InfoRow label="E-posta" value={u.email} />
        <InfoRow label="Telefon" value={u.phoneNumber} />
        <InfoRow label={isCorporate ? "VKN" : "T.C. Kimlik"} value={u.nationalId} mono />
        {isCorporate ? <InfoRow label="Vergi dairesi" value={u.taxOffice} /> : null}
        {isCorporate ? <InfoRow label="Yetkili T.C." value={u.authorizedNationalId} mono /> : null}
        {!isCorporate ? <InfoRow label="Doğum tarihi" value={u.birthDate ? wallDate(u.birthDate) : null} /> : null}
        <InfoRow label="Adres" value={address} />
        <InfoRow label="Kayıt" value={localDate(u.createdAt)} />
      </SectionCard>

      {u.notes ? (
        <SectionCard title="Notlar">
          <Text style={styles.noteText}>{u.notes}</Text>
        </SectionCard>
      ) : null}

      <SectionCard title={`Kontratlar${contracts.length ? ` (${contracts.length})` : ""}`}>
        {contracts.length === 0 ? (
          <Text style={styles.hint}>Kontrat yok.</Text>
        ) : (
          contracts.slice(0, HISTORY_LIMIT).map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.historyRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/(admin)/contracts/${c.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.historyPlate}>
                  {c.plate || "—"} <Text style={styles.historyCar}>{c.vehicle}</Text>
                </Text>
                <Text style={styles.historyDates}>
                  {wallDate(c.pickUpTime)} → {wallDate(c.returnedAt || c.dropOffTime)} · {money(c.totalPrice)}
                </Text>
              </View>
              <StatusBadge status={c.status} />
            </Pressable>
          ))
        )}
        {contracts.length > HISTORY_LIMIT ? (
          <Text style={styles.hint}>Son {HISTORY_LIMIT} kontrat gösteriliyor.</Text>
        ) : null}
      </SectionCard>

      <Text style={styles.footHint}>Müşteri bilgileri ve cari hareketler web panelinden düzenlenir.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 12,
  },
  heroName:   { fontSize: 19, fontWeight: "800", color: COLORS.ink },
  heroSub:    { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  badges:     { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  contactRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  noteText:   { fontSize: 13, color: COLORS.ink, lineHeight: 19 },
  hint:       { fontSize: 12, color: COLORS.subtle },
  footHint:   { fontSize: 11, color: COLORS.subtle, textAlign: "center", marginTop: 8 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  historyPlate: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  historyCar:   { fontSize: 12, fontWeight: "500", color: COLORS.muted },
  historyDates: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
});
