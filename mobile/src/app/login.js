import { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../auth/AuthContext";

export default function LoginScreen() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Redirect href="/" />;

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("E-posta ve şifre gerekli.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err?.response?.status === 401
          ? "E-posta veya şifre hatalı."
          : err?.message || "Giriş yapılamadı."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Rentwin Saha</Text>
      <Text style={styles.subtitle}>Personel girişi</Text>

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#0f172a", fontWeight: "700", fontSize: 16 },
  error: { color: "#f87171", marginBottom: 8, textAlign: "center" },
});
